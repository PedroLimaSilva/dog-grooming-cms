import {
  OAUTH_ERROR_KEY,
  OAUTH_STATE_KEY,
  PKCE_VERIFIER_KEY,
} from "./constants";

function randomUrlSafeString(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += charset[bytes[i]! % charset.length];
  }
  return out;
}

async function sha256Base64Url(plain: string): Promise<string> {
  const data = new TextEncoder().encode(plain);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  const b64 = btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function getDropboxRedirectUri(): string {
  const fromEnv = import.meta.env.VITE_DROPBOX_REDIRECT_URI;
  if (typeof fromEnv === "string" && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }
  if (typeof window === "undefined") return "";
  const { origin, pathname } = window.location;
  if (pathname === "/" || pathname === "") return origin;
  return origin + pathname.replace(/\/$/, "");
}

export function getDropboxAppKey(): string {
  const k = import.meta.env.VITE_DROPBOX_APP_KEY;
  return typeof k === "string" ? k.trim() : "";
}

export async function beginDropboxAuthorization(): Promise<void> {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(OAUTH_ERROR_KEY);
  }
  const clientId = getDropboxAppKey();
  if (!clientId) {
    throw new Error(
      "Missing VITE_DROPBOX_APP_KEY. Add it to .env and restart the dev server.",
    );
  }

  const verifier = randomUrlSafeString(64);
  const challenge = await sha256Base64Url(verifier);
  const state = randomUrlSafeString(32);

  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  sessionStorage.setItem(OAUTH_STATE_KEY, state);

  const redirectUri = getDropboxRedirectUri();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    state,
    token_access_type: "offline",
    code_challenge: challenge,
    code_challenge_method: "S256",
    scope: [
      "account_info.read",
      "files.metadata.read",
      "files.metadata.write",
      "files.content.read",
      "files.content.write",
    ].join(" "),
  });

  window.location.href = `https://www.dropbox.com/oauth2/authorize?${params.toString()}`;
}

export function readOAuthReturnFromUrl(): {
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
} {
  if (typeof window === "undefined") return {};
  const q = new URLSearchParams(window.location.search);
  const code = q.get("code") ?? undefined;
  const state = q.get("state") ?? undefined;
  const error = q.get("error") ?? undefined;
  const errorDescription = q.get("error_description") ?? undefined;
  return { code, state, error, errorDescription };
}

export function clearOAuthQueryFromUrl(): void {
  if (typeof window === "undefined") return;
  const { pathname, hash } = window.location;
  window.history.replaceState({}, document.title, pathname + hash);
}
