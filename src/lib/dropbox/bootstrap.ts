import { updateLastKnownRev } from "../dropboxSyncPrefs";
import { DROPBOX_SYNC_PATH, OAUTH_ERROR_KEY } from "./constants";
import { downloadFile, getFileMetadataOrNull } from "./api";
import {
  getLocalCounts,
  importRemoteSnapshotReplaceAll,
  mergeRemoteIntoLocal,
} from "./dexieSync";
import { parseSyncFileJson, type SyncFilePayload } from "./syncPayload";
import {
  exportCurrentDatabaseToDropbox,
  exportOverwriteDropbox,
} from "./exportUpload";

export type BootstrapCounts = {
  owners: number;
  dogs: number;
  appointments: number;
};

export type BootstrapNeedChoice = {
  kind: "need_choice";
  remote: SyncFilePayload;
  remoteRev: string;
  local: BootstrapCounts;
  remoteCounts: BootstrapCounts;
};

export type BootstrapResult =
  | { kind: "done" }
  | BootstrapNeedChoice
  | { kind: "error"; message: string };

function countsFromPayload(p: SyncFilePayload): BootstrapCounts {
  return {
    owners: p.owners.length,
    dogs: p.dogs.length,
    appointments: p.appointments.length,
  };
}

/**
 * After OAuth, align local DB and Dropbox per dropbox-sync.md bootstrap rules.
 */
export async function runDropboxBootstrapAfterLink(): Promise<BootstrapResult> {
  try {
    const meta = await getFileMetadataOrNull(DROPBOX_SYNC_PATH);

    if (meta == null) {
      await exportCurrentDatabaseToDropbox();
      return { kind: "done" };
    }

    const { bytes, rev } = await downloadFile(DROPBOX_SYNC_PATH);
    const text = new TextDecoder().decode(bytes);
    const remote = parseSyncFileJson(text);
    const remoteCounts = countsFromPayload(remote);
    const local = await getLocalCounts();
    const localEmpty =
      local.owners === 0 && local.dogs === 0 && local.appointments === 0;

    if (localEmpty) {
      await importRemoteSnapshotReplaceAll(remote);
      updateLastKnownRev(rev);
      return { kind: "done" };
    }

    return {
      kind: "need_choice",
      remote,
      remoteRev: rev,
      local,
      remoteCounts,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { kind: "error", message };
  }
}

export async function applyBootstrapRemoteOnly(
  remote: SyncFilePayload,
  remoteRev: string,
): Promise<void> {
  await importRemoteSnapshotReplaceAll(remote);
  updateLastKnownRev(remoteRev);
}

export async function applyBootstrapLocalOnly(): Promise<void> {
  await exportOverwriteDropbox();
}

export async function applyBootstrapMergeBoth(
  remote: SyncFilePayload,
): Promise<void> {
  await mergeRemoteIntoLocal(remote);
  await exportCurrentDatabaseToDropbox();
}

/** Clear bootstrap error flag after showing in UI. */
export function readBootstrapOAuthError(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage.getItem(OAUTH_ERROR_KEY);
}

export function clearBootstrapOAuthError(): void {
  sessionStorage.removeItem(OAUTH_ERROR_KEY);
}
