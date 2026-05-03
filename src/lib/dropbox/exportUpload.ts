import { readDropboxSyncPrefs, updateLastKnownRev } from "../dropboxSyncPrefs";
import { db } from "../../db";
import { DROPBOX_SYNC_PATH } from "./constants";
import { getFileMetadataOrNull, uploadFileBytes } from "./api";
import { buildPayloadFromTables, serializeSyncPayload } from "./syncPayload";

export async function exportCurrentDatabaseToDropbox(): Promise<string> {
  const [owners, dogs, appointments] = await Promise.all([
    db.owners.toArray(),
    db.dogs.toArray(),
    db.appointments.toArray(),
  ]);
  const payload = buildPayloadFromTables({ owners, dogs, appointments });
  const json = serializeSyncPayload(payload);
  const bytes = new TextEncoder().encode(json);

  const meta = await getFileMetadataOrNull(DROPBOX_SYNC_PATH);
  if (meta == null) {
    const result = await uploadFileBytes(DROPBOX_SYNC_PATH, bytes, {
      tag: "add",
    });
    updateLastKnownRev(result.rev);
    return result.rev;
  }

  const lastKnownRev = readDropboxSyncPrefs().lastKnownRev;
  if (!lastKnownRev) {
    throw new Error(
      "Dropbox already has a sync file. Use Sync now to pull it before uploading.",
    );
  }
  if (meta.rev !== lastKnownRev) {
    throw new Error(
      "Dropbox changed since this device last synced. Use Sync now to pull the latest copy before uploading.",
    );
  }
  const result = await uploadFileBytes(DROPBOX_SYNC_PATH, bytes, {
    tag: "update",
    rev: lastKnownRev,
  });

  updateLastKnownRev(result.rev);
  return result.rev;
}

/** Overwrite remote without reading rev first (destructive). */
export async function exportOverwriteDropbox(): Promise<string> {
  const [owners, dogs, appointments] = await Promise.all([
    db.owners.toArray(),
    db.dogs.toArray(),
    db.appointments.toArray(),
  ]);
  const payload = buildPayloadFromTables({ owners, dogs, appointments });
  const json = serializeSyncPayload(payload);
  const bytes = new TextEncoder().encode(json);
  const result = await uploadFileBytes(DROPBOX_SYNC_PATH, bytes, {
    tag: "overwrite",
  });
  updateLastKnownRev(result.rev);
  return result.rev;
}
