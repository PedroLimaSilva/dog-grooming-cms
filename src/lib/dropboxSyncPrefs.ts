const STORAGE_KEY = "grooming_dropbox_sync_prefs_v1";

export type DropboxSyncPrefs = {
  linked: boolean;
  accountLabel?: string;
  linkedAt?: string;
  accessToken?: string;
  refreshToken?: string;
  /** Epoch ms when access_token is expected to expire. */
  expiresAtMs?: number;
  /** Dropbox `rev` for grooming-data.json after last successful download or upload. */
  lastKnownRev?: string;
};

const defaultPrefs: DropboxSyncPrefs = { linked: false };

export function readDropboxSyncPrefs(): DropboxSyncPrefs {
  if (typeof localStorage === "undefined") return { ...defaultPrefs };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultPrefs };
    const parsed = JSON.parse(raw) as Partial<DropboxSyncPrefs>;
    if (typeof parsed.linked !== "boolean") return { ...defaultPrefs };
    const hasTokens = !!(parsed.accessToken || parsed.refreshToken);
    return {
      linked: Boolean(parsed.linked) && hasTokens,
      accountLabel:
        typeof parsed.accountLabel === "string"
          ? parsed.accountLabel
          : undefined,
      linkedAt:
        typeof parsed.linkedAt === "string" ? parsed.linkedAt : undefined,
      accessToken:
        typeof parsed.accessToken === "string" ? parsed.accessToken : undefined,
      refreshToken:
        typeof parsed.refreshToken === "string"
          ? parsed.refreshToken
          : undefined,
      expiresAtMs:
        typeof parsed.expiresAtMs === "number" ? parsed.expiresAtMs : undefined,
      lastKnownRev:
        typeof parsed.lastKnownRev === "string"
          ? parsed.lastKnownRev
          : undefined,
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

export function isDropboxLinked(): boolean {
  return readDropboxSyncPrefs().linked;
}

export function updateLastKnownRev(rev: string): void {
  const cur = readDropboxSyncPrefs();
  writeDropboxSyncPrefs({ ...cur, lastKnownRev: rev });
}
