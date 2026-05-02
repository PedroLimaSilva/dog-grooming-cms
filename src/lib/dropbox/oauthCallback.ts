import {
  readDropboxSyncPrefs,
  writeDropboxSyncPrefs,
} from "../dropboxSyncPrefs";
import {
  OAUTH_ERROR_KEY,
  OAUTH_RUN_BOOTSTRAP_KEY,
  OAUTH_STATE_KEY,
  PKCE_VERIFIER_KEY,
} from "./constants";
import { clearOAuthQueryFromUrl, readOAuthReturnFromUrl } from "./oauth";
import { exchangeCodeForTokens } from "./token";
import { getCurrentAccountDisplayName } from "./api";

/**
 * Handle `?code=` / `?error=` from Dropbox redirect before the app mounts.
 * @returns true if this load was an OAuth return (URL cleaned afterward).
 */
export async function handleDropboxOAuthRedirect(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const { code, state, error, errorDescription } = readOAuthReturnFromUrl();
  if (!code && !error) return false;

  const clearPkce = () => {
    sessionStorage.removeItem(PKCE_VERIFIER_KEY);
    sessionStorage.removeItem(OAUTH_STATE_KEY);
  };

  if (error) {
    sessionStorage.setItem(
      OAUTH_ERROR_KEY,
      errorDescription || error || "Dropbox sign-in was cancelled.",
    );
    clearPkce();
    clearOAuthQueryFromUrl();
    if (!window.location.hash) window.location.hash = "#/settings";
    return true;
  }

  const expectedState = sessionStorage.getItem(OAUTH_STATE_KEY);
  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
  if (!code || !state || !verifier || state !== expectedState) {
    sessionStorage.setItem(
      OAUTH_ERROR_KEY,
      "Invalid Dropbox OAuth state. Try connecting again.",
    );
    clearPkce();
    clearOAuthQueryFromUrl();
    if (!window.location.hash) window.location.hash = "#/settings";
    return true;
  }

  try {
    const tokens = await exchangeCodeForTokens(code, verifier);
    const now = Date.now();
    const expiresAtMs = now + (tokens.expires_in ?? 14_400) * 1000;
    writeDropboxSyncPrefs({
      linked: true,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAtMs,
      linkedAt: new Date().toISOString(),
    });
    let accountLabel = "Dropbox";
    try {
      accountLabel = await getCurrentAccountDisplayName();
    } catch {
      /* optional */
    }
    writeDropboxSyncPrefs({
      ...readDropboxSyncPrefs(),
      accountLabel,
    });
    sessionStorage.setItem(OAUTH_RUN_BOOTSTRAP_KEY, "1");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    sessionStorage.setItem(OAUTH_ERROR_KEY, msg);
  } finally {
    clearPkce();
  }

  clearOAuthQueryFromUrl();
  window.location.hash = "#/settings";
  return true;
}
