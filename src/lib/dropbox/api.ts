import {
  readDropboxSyncPrefs,
  writeDropboxSyncPrefs,
} from "../dropboxSyncPrefs";
import { refreshAccessToken } from "./token";

const CONTENT_UPLOAD = "https://content.dropboxapi.com/2/files/upload";
const CONTENT_DOWNLOAD = "https://content.dropboxapi.com/2/files/download";

export type FileMetadata = {
  rev: string;
  name: string;
  path_display?: string;
};

async function ensureFreshAccessToken(): Promise<string> {
  const prefs = readDropboxSyncPrefs();
  const refresh = prefs.refreshToken;
  const access = prefs.accessToken;
  const exp = prefs.expiresAtMs ?? 0;
  if (!refresh && !access) {
    throw new Error("Not signed in to Dropbox.");
  }
  const now = Date.now();
  if (access && exp > now + 60_000) {
    return access;
  }
  if (!refresh) {
    throw new Error("Dropbox session expired. Connect again.");
  }
  const next = await refreshAccessToken(refresh);
  const expiresAtMs = now + (next.expires_in ?? 14_400) * 1000;
  writeDropboxSyncPrefs({
    ...prefs,
    accessToken: next.access_token,
    refreshToken: next.refresh_token ?? refresh,
    expiresAtMs,
    linked: true,
  });
  return next.access_token;
}

export async function dropboxRpc<T>(
  path: string,
  body: object | null,
): Promise<T> {
  const token = await ensureFreshAccessToken();
  const res = await fetch(`https://api.dropboxapi.com/2${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body == null ? "null" : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text || res.statusText;
    try {
      const j = JSON.parse(text) as {
        error_summary?: string;
        error?: { ".tag"?: string } | string;
      };
      if (j.error_summary) msg = j.error_summary;
    } catch {
      /* keep */
    }
    throw new Error(msg);
  }
  return text ? (JSON.parse(text) as T) : (null as T);
}

export async function getCurrentAccountDisplayName(): Promise<string> {
  type Acc = {
    name: { display_name: string; abbreviated_name?: string };
    email: string;
  };
  const acc = await dropboxRpc<Acc>("/users/get_current_account", null);
  return acc.name.display_name || acc.email || "Dropbox";
}

export async function getFileMetadataOrNull(
  dropboxPath: string,
): Promise<FileMetadata | null> {
  try {
    return await dropboxRpc<FileMetadata>("/files/get_metadata", {
      path: dropboxPath,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("path/not_found") || msg.includes("not_found")) {
      return null;
    }
    throw e;
  }
}

export type DownloadResult = {
  bytes: Uint8Array;
  rev: string;
};

export async function downloadFile(
  dropboxPath: string,
): Promise<DownloadResult> {
  const token = await ensureFreshAccessToken();
  const res = await fetch(CONTENT_DOWNLOAD, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Dropbox-API-Arg": JSON.stringify({ path: dropboxPath }),
    },
  });
  const buf = await res.arrayBuffer();
  if (!res.ok) {
    const text = new TextDecoder().decode(buf);
    throw new Error(text || res.statusText);
  }
  const metaHeader = res.headers.get("dropbox-api-result");
  if (!metaHeader) {
    throw new Error("Missing Dropbox-API-Result header on download.");
  }
  const meta = JSON.parse(metaHeader) as { rev: string };
  return { bytes: new Uint8Array(buf), rev: meta.rev };
}

type UploadMode =
  | { tag: "add" }
  | { tag: "overwrite" }
  | { tag: "update"; rev: string };

export async function uploadFileBytes(
  dropboxPath: string,
  bytes: Uint8Array,
  mode: UploadMode,
): Promise<FileMetadata> {
  const token = await ensureFreshAccessToken();
  let modeArg: Record<string, unknown>;
  if (mode.tag === "add") {
    modeArg = { ".tag": "add" };
  } else if (mode.tag === "overwrite") {
    modeArg = { ".tag": "overwrite" };
  } else {
    modeArg = { ".tag": "update", update: mode.rev };
  }

  const apiArg = {
    path: dropboxPath,
    mode: modeArg,
    autorename: false,
    mute: true,
    strict_conflict: true,
  };

  const res = await fetch(CONTENT_UPLOAD, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
      "Dropbox-API-Arg": JSON.stringify(apiArg),
    },
    body: bytes as BodyInit,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || res.statusText);
  }
  return JSON.parse(text) as FileMetadata;
}
