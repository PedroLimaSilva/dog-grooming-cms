import type { Appointment, Dog, Owner } from "../../types";
import { SYNC_SCHEMA_VERSION } from "./constants";

export type SyncFilePayload = {
  schemaVersion: number;
  exportedAt: string;
  appBuild?: string;
  owners: Owner[];
  dogs: Dog[];
  appointments: Appointment[];
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function parseSyncFileJson(text: string): SyncFilePayload {
  let root: unknown;
  try {
    root = JSON.parse(text) as unknown;
  } catch {
    throw new Error("Sync file is not valid JSON.");
  }
  if (!isRecord(root)) {
    throw new Error("Sync file must be a JSON object.");
  }
  const schemaVersion = root.schemaVersion;
  if (schemaVersion !== 1) {
    throw new Error(
      `Unsupported sync schema version: ${String(schemaVersion)} (expected 1).`,
    );
  }
  if (typeof root.exportedAt !== "string") {
    throw new Error("Sync file is missing exportedAt.");
  }
  if (
    !Array.isArray(root.owners) ||
    !Array.isArray(root.dogs) ||
    !Array.isArray(root.appointments)
  ) {
    throw new Error(
      "Sync file must include owners, dogs, and appointments arrays.",
    );
  }

  const owners = root.owners as Owner[];
  const dogs = root.dogs as Dog[];
  const appointments = root.appointments as Appointment[];

  for (const o of owners) {
    if (typeof o?.id !== "number" || typeof o.name !== "string") {
      throw new Error("Invalid owner row in sync file.");
    }
  }
  for (const d of dogs) {
    if (typeof d?.id !== "number" || typeof d.name !== "string") {
      throw new Error("Invalid dog row in sync file.");
    }
    if (typeof d.primaryOwnerId !== "number") {
      throw new Error("Invalid dog.primaryOwnerId in sync file.");
    }
  }
  for (const a of appointments) {
    if (
      typeof a?.id !== "number" ||
      typeof a.dogId !== "number" ||
      typeof a.start !== "number" ||
      typeof a.end !== "number" ||
      !Array.isArray(a.services)
    ) {
      throw new Error("Invalid appointment row in sync file.");
    }
  }

  return {
    schemaVersion: 1,
    exportedAt: root.exportedAt,
    appBuild: typeof root.appBuild === "string" ? root.appBuild : undefined,
    owners,
    dogs,
    appointments,
  };
}

export function serializeSyncPayload(payload: SyncFilePayload): string {
  return JSON.stringify(payload, null, 2);
}

export function buildPayloadFromTables(input: {
  owners: Owner[];
  dogs: Dog[];
  appointments: Appointment[];
}): SyncFilePayload {
  return {
    schemaVersion: SYNC_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appBuild: import.meta.env.VITE_APP_BUILD?.trim() || undefined,
    owners: input.owners.filter((o) => o.id != null) as Owner[],
    dogs: input.dogs.filter((d) => d.id != null) as Dog[],
    appointments: input.appointments.filter(
      (a) => a.id != null,
    ) as Appointment[],
  };
}

export function payloadHasAnyData(p: SyncFilePayload): boolean {
  return p.owners.length > 0 || p.dogs.length > 0 || p.appointments.length > 0;
}

/**
 * Deep-copy via JSON so rows are plain objects IndexedDB can clone.
 * Svelte 5 may wrap bootstrap payloads in reactive proxies; `db.put()` then throws DataCloneError.
 */
export function plainSyncPayload(payload: SyncFilePayload): SyncFilePayload {
  return JSON.parse(JSON.stringify(payload)) as SyncFilePayload;
}
