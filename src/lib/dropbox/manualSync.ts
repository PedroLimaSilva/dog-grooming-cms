import { readDropboxSyncPrefs, updateLastKnownRev } from "../dropboxSyncPrefs";
import { DROPBOX_SYNC_PATH } from "./constants";
import { downloadFile, getFileMetadataOrNull } from "./api";
import { importRemoteSnapshotReplaceAll } from "./dexieSync";
import { exportCurrentDatabaseToDropbox } from "./exportUpload";
import { parseSyncFileJson } from "./syncPayload";

export type ManualSyncResult =
  | { kind: "cancelled" }
  | { kind: "created"; rev: string }
  | { kind: "pulled"; rev: string }
  | { kind: "pushed"; rev: string };

export async function syncDropboxNow(options?: {
  confirmRemotePull?: () => boolean | Promise<boolean>;
}): Promise<ManualSyncResult> {
  const meta = await getFileMetadataOrNull(DROPBOX_SYNC_PATH);
  if (meta == null) {
    const rev = await exportCurrentDatabaseToDropbox();
    return { kind: "created", rev };
  }

  const lastKnownRev = readDropboxSyncPrefs().lastKnownRev;
  if (lastKnownRev !== meta.rev) {
    if (options?.confirmRemotePull) {
      const confirmed = await options.confirmRemotePull();
      if (!confirmed) return { kind: "cancelled" };
    }
    const { bytes, rev } = await downloadFile(DROPBOX_SYNC_PATH);
    const text = new TextDecoder().decode(bytes);
    const remote = parseSyncFileJson(text);
    await importRemoteSnapshotReplaceAll(remote);
    updateLastKnownRev(rev);
    return { kind: "pulled", rev };
  }

  const rev = await exportCurrentDatabaseToDropbox();
  return { kind: "pushed", rev };
}
