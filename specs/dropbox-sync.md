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
   - **Conflict check:** compare remote revision with any **last-known revision** stored locally for this file (if any).
     - If remote is **newer** than last known, or there is no local “last known,” proceed to import (see Import behavior).
     - If remote is **older or same** as last known and local DB has changed since last export, implementation-defined whether to **skip import** or still merge; v1 recommendation: **prefer remote if strictly newer by revision**; if revisions equal, **prefer local** and trigger export (last-write-wins at snapshot level).
3. **If the file does not exist**
   - **Export** current local database into the sync file (create parent folders if needed).
   - Store the returned remote revision as **last known**.

User-visible outcome: after bootstrap, local data and Dropbox either **match** an imported snapshot or **initial snapshot** was uploaded.

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

**Scenario:** Device A and Device B both change data; both try to export.

- **Preferred v1 policy:** **Detect** conflict on upload (revision no longer matches). Do **not** auto-merge row-by-row in v1.
- **User-facing behavior:**
  - Notify user that **Dropbox has a newer version** than this device expected.
  - Offer actions such as: **“Reload from Dropbox”** (discard local changes since last successful sync—implementation must define scope), **“Overwrite Dropbox with this device”** (force upload—destructive to other device’s pending work), or **“Export a copy”** (download-only backup file locally—optional nicety).
- Exact button labels and whether “force overwrite” is allowed are product decisions; this spec requires **no silent loss** of data without explicit user choice.

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
- Automatic **merge** of conflicting row-level edits without user decision.
- Multiple named backups / scheduled history inside Dropbox (only the single sync file).
- Non-Dropbox clouds (may be future specs).

## Acceptance criteria (summary)

- User can connect Dropbox, see success/failure clearly.
- If sync file **exists**, app imports into Dexie or handles conflict per policy.
- If sync file **missing**, app creates it from local data.
- Local changes eventually **upload** the sync file when online; conflicts **never** silently overwrite another device’s newer upload without user acknowledgment.

## Related documents

- `domain-model.md` — entity shapes and IDs.
- `mvp.md` — original MVP scope; multi-device sync was out of scope for MVP and is introduced here as a separate feature.
