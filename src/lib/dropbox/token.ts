import { getDropboxAppKey, getDropboxRedirectUri } from "./oauth";

type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  uid?: string;
  account_id?: string;
};

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: getDropboxAppKey(),
    redirect_uri: getDropboxRedirectUri(),
    code_verifier: codeVerifier,
  });

  const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const text = await res.text();
  if (!res.ok) {
    let msg = text || res.statusText;
    try {
      const j = JSON.parse(text) as {
        error?: string;
        error_description?: string;
      };
      if (j.error_description) msg = j.error_description;
      else if (j.error) msg = j.error;
    } catch {
      /* keep text */
    }
    throw new Error(msg);
  }

  return JSON.parse(text) as TokenResponse;
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: getDropboxAppKey(),
  });

  const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || res.statusText);
  }

  return JSON.parse(text) as TokenResponse;
}
