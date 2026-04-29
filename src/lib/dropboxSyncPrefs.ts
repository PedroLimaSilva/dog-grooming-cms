const STORAGE_KEY = "grooming_dropbox_sync_prefs_v1";

export type DropboxSyncPrefs = {
  /** True when OAuth completed and tokens are stored (placeholder until OAuth exists). */
  linked: boolean;
  /** Dropbox display name or email fragment, for UI only. */
  accountLabel?: string;
  linkedAt?: string;
};

const defaultPrefs: DropboxSyncPrefs = { linked: false };

export function readDropboxSyncPrefs(): DropboxSyncPrefs {
  if (typeof localStorage === "undefined") return { ...defaultPrefs };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultPrefs };
    const parsed = JSON.parse(raw) as Partial<DropboxSyncPrefs>;
    if (typeof parsed.linked !== "boolean") return { ...defaultPrefs };
    return {
      linked: parsed.linked,
      accountLabel:
        typeof parsed.accountLabel === "string"
          ? parsed.accountLabel
          : undefined,
      linkedAt:
        typeof parsed.linkedAt === "string" ? parsed.linkedAt : undefined,
    };
  } catch {
    return { ...defaultPrefs };
  }
}

export function writeDropboxSyncPrefs(prefs: DropboxSyncPrefs): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function clearDropboxSyncPrefs(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
