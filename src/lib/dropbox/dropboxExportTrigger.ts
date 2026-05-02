import { isDropboxLinked } from "../dropboxSyncPrefs";
import { exportCurrentDatabaseToDropbox } from "./exportUpload";

let timer: ReturnType<typeof setTimeout> | null = null;
let busy = false;

const DEBOUNCE_MS = 2000;

/**
 * Call after local DB mutations when Dropbox may be linked. Debounced upload.
 */
export function scheduleDropboxExport(): void {
  if (!isDropboxLinked()) return;
  if (timer != null) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void (async () => {
      try {
        await flushDropboxExport();
      } catch {
        /* background debounced sync — conflicts surfaced when user uploads */
      }
    })();
  }, DEBOUNCE_MS);
}

export async function flushDropboxExport(): Promise<void> {
  if (!isDropboxLinked() || busy) return;
  busy = true;
  try {
    await exportCurrentDatabaseToDropbox();
  } finally {
    busy = false;
  }
}
