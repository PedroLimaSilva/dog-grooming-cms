# Dropbox sync — specification

## Purpose

Let a groomer **sign in with Dropbox** on each device and keep salon data in a **single JSON file** inside their Dropbox. On connect, the app **imports** that file if it already exists; otherwise it **creates** it from local data. After that, the app **exports** (uploads) when local data changes so other signed-in devices can import the latest copy.

This document describes **behavior** and **user-visible rules**. Implementation details (exact SDK calls, token storage) belong in code and can reference this spec.

## Definitions

| Term | Meaning |
|------|---------|
| **Sync file** | The one canonical backup file in Dropbox holding the full app dataset. |
| **Local database** | IndexedDB via Dexie (`owners`, `dogs`, `appointments`); see `domain-model.md`. |
| **Remote revision** | Dropbox’s content version for the sync file (e.g. `rev` / server metadata used to detect overwrites). |

## Dropbox app model

- Use a **Dropbox app** with **Scoped access** and the **app folder** (or equivalent) type so the app only sees **`/Apps/<AppName>/...`** and cannot browse the user’s entire Dropbox.
- Required behavioral capability: **list/search**, **download**, **upload** (with conflict detection via revision), **create folder** if missing.

## Sync file location and name

- **Path** (conceptual): under the app folder, fixed path e.g. `grooming-data.json` (exact path is implementation-defined but **stable** across versions).
- **Single file** only; no multi-file sharding in v1.

## File format (payload)

The sync file is JSON with a **wrapper** so imports stay safe across app updates.

| Field | Type | Required | Notes |
|-------|------|----------|--------|
| `schemaVersion` | number | yes | Start at `1`; bump when breaking structure changes. |
| `exportedAt` | string (ISO 8601) | yes | When this snapshot was written (client clock). |
| `appBuild` | string | optional | Human-readable app version for support/debug. |
| `owners` | array | yes | Matches `Owner` records including `id`. |
| `dogs` | array | yes | Matches `Dog` records including `id`. |
| `appointments` | array | yes | Matches `Appointment` records including `id`. |

**Identity rules**

- **IDs** are **stable integers** as in the domain model. Import must preserve FK integrity (`dog.primaryOwnerId`, `appointment.dogId`).
- Unknown fields in future schema versions: implementation may **ignore** extra fields on read if `schemaVersion` is recognized; otherwise reject import with a clear error.

## Authentication and session

- User initiates **“Connect Dropbox”** (or similar). The app runs the **OAuth 2.0** flow appropriate for a web client (including **PKCE**).
- After success, the user is **linked**: the app may perform Dropbox API calls until tokens expire or the user **disconnects**.
- **Disconnect** clears app-stored tokens and stops automatic export; local IndexedDB data remains on the device unless the user explicitly clears app data or uninstalls the PWA.

(Where refresh tokens and secrets live—pure SPA vs. small backend—is an implementation/security choice; behavior below assumes a valid authenticated session when “sync is enabled.”)

## First connection after sign-in (bootstrap)

When the user has just authenticated and sync is enabled:

1. **Resolve path** to the sync file under the app folder.
2. **If the file exists**
   - Download and parse JSON.
   - Validate `schemaVersion` and required arrays.
   - If **local IndexedDB is empty** (no owners, dogs, or appointments): **import** the remote snapshot into Dexie (see Import behavior), then set **last-known remote revision**; continue to ongoing export rules. **Do not** show the choice UI.
   - If **local data exists** and **remote data exists**: show the **“Choose what to keep”** UI (see below) with **merge (keep both)** as the **default** selection. **Do not** import, overwrite, or merge until the user confirms (e.g. primary **Continue**).
3. **If the file does not exist**
   - **Export** current local database into the sync file (create parent folders if needed).
   - Store the returned remote revision as **last known**.

User-visible outcome: after bootstrap, local data and Dropbox either **match** an imported snapshot, **initial snapshot** was uploaded, or the user **explicitly chose** how to combine local and Dropbox (including a new device with seeded/demo local data vs an existing Dropbox file).

### “Choose what to keep” (local vs Dropbox)

Use this when **both** the sync file and the local database contain data—typical case: user installs the PWA on a **second device** while Dropbox already has a backup, and this device has **fresh local state** (including optional demo/seed data from first launch).

**Summary rows (required copy)**

For **this device** and for **Dropbox**, show at minimum:

- **Owners:** count of owner records.
- **Dogs:** count of dog records.

Showing **appointments** count as well is recommended so the user understands calendar volume on each side.

**Interaction**

Present a **multi-select** (e.g. two options, both can be selected) whose meaning is **which source(s) to include** in the outcome:

| User selection | Resulting behavior |
|----------------|--------------------|
| **Remote only** | Replace local Dexie data with the remote snapshot (Import behavior). Then upload is consistent with “local = remote” unless the user edits again. Equivalent to “discard this device’s data and use Dropbox.” |
| **Local only** | Keep current Dexie data; **do not** apply remote rows. **Upload** local snapshot to Dropbox (may **overwrite** the remote file—user must be warned). Equivalent to “ignore Dropbox and push this device.” |
| **Local + remote** | **Merge** both datasets into Dexie (see Merge behavior), then **export** the combined snapshot to Dropbox so other devices see one combined file. |

The UI must make the three outcomes and their consequences explicit (especially overwrite vs discard).

**Default:** **Local + remote** (merge, keep both) must be **pre-selected** when the screen opens so the user can confirm with one action unless they change the selection.

**Confirmation:** do not run import, overwrite, or merge **without** an explicit confirm (button). The default pre-selection is not an automatic merge on its own.

## Merge behavior (default / “both”)

When the user confirms **local + remote** (including the default path):

- Produce one combined Dexie state that preserves **referential integrity** (`primaryOwnerId`, `dogId`, etc.).
- **ID collisions** between the two snapshots must be resolved by **reassigning** imported numeric IDs and rewriting FKs on the merged-in rows so no orphan or duplicate-key rows remain.
- **Row matching beyond IDs** (e.g. same person different IDs) is **not** required in v1; treat distinct IDs as distinct entities unless you add explicit deduping later.
- Run the result in a **single logical transaction** where possible; on failure, keep the pre-merge local DB intact.

After a successful merge, **export** the merged snapshot and store **last-known remote revision** from the upload response.

## Import behavior

- Run inside a **single logical transaction** against IndexedDB: replace or bulk-upsert so the DB is never left half-applied.
- **Order**: owners and dogs first (respect FKs), then appointments.
- **Empty remote**: if file exists but arrays are empty, treat as **clear** of business data (or block with error—v1: **allow** clear to match “empty salon” intent); product copy should warn if appropriate.
- **Failure**: if JSON is invalid or schema is unsupported, **do not** partially apply; show an error; keep previous local data intact.

## Export behavior (ongoing sync)

- **Trigger:** after local mutations that change persisted data (owners, dogs, appointments), schedule an **export** (debounced, e.g. 1–3 seconds) to avoid API spam during rapid edits.
- **Content:** serialize current local state into the sync file format (same shape as import).
- **Upload:** use Dropbox capabilities so that **concurrent edits** on two devices surface as **revision mismatch** rather than silent corruption:
  - Include **if-match / revision** semantics when uploading: if another device uploaded since our last read, the upload **fails** with a conflict (see Conflicts).
- **After successful upload:** update **last-known remote revision** and optionally **last export timestamp** locally.

## Conflicts

**Scenario A (bootstrap / two full datasets):** covered by **“Choose what to keep”** and optional **merge** (see above)—not an automatic policy.

**Scenario B (ongoing):** Device A and Device B both change data; one device exports, then the other’s upload **fails** revision check.

- **Policy:** **Detect** conflict on upload (revision no longer matches). Do **not** resolve by silently picking a side.
- **User-facing behavior:** notify that **Dropbox was changed** since this device last synced. Offer actions such as: **“Reload from Dropbox”** (replace local with remote snapshot—same risk level as remote-only bootstrap), **“Overwrite Dropbox with this device”** (force upload—destructive to the other side’s pending work), or **“Export a copy”** (download-only backup locally—optional nicety). A **guided merge** similar to bootstrap is optional for this path in v1; minimum is reload vs overwrite with explicit warnings.
- Exact button labels are product decisions; this spec requires **no silent loss** of data without explicit user choice.

## Offline and errors

- If the device is **offline** or Dropbox API **fails**, **local edits still save** to IndexedDB.
- Failed exports should **retry** with backoff when connectivity returns (implementation detail), and surface a **non-blocking** indicator (“Sync pending”).
- **Rate limits:** debounce and batch; if limits hit, show a clear message and retry later.

## Privacy and scope

- Only the **app folder** (or documented Dropbox scope) is accessed.
- No salon data is sent except **through the user’s authenticated Dropbox** as this sync file.
- User can **disconnect** Dropbox; app continues to work locally.

## Out of scope (v1)

- Real-time multi-user collaboration (live cursors, simultaneous editors).
- **Automatic** merge or automatic pick of local vs remote **without** the “Choose what to keep” step when both sides have data at bootstrap.
- Fuzzy deduplication of owners/dogs across local and remote (same human or pet, different IDs).
- Multiple named backups / scheduled history inside Dropbox (only the single sync file).
- Non-Dropbox clouds (may be future specs).

## Acceptance criteria (summary)

- User can connect Dropbox, see success/failure clearly.
- If sync file **exists** and **local DB is empty**, app imports without extra prompts.
- If sync file **exists** and **local DB has data**, app shows **“Choose what to keep”** with owner and dog counts (and preferably appointment counts) for this device and Dropbox, **merge (keep both) pre-selected by default**, and supports **remote only**, **local only**, and **merge both** after explicit confirmation.
- If sync file **missing**, app creates it from local data.
- Local changes eventually **upload** the sync file when online; upload conflicts **never** silently overwrite Dropbox without user acknowledgment.

## Related documents

- `domain-model.md` — entity shapes and IDs.
- `mvp.md` — original MVP scope; multi-device sync was out of scope for MVP and is introduced here as a separate feature.
