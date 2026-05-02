import type { Appointment, Dog, Owner } from "../../types";
import { db } from "../../db";
import type { SyncFilePayload } from "./syncPayload";

export type TableCounts = {
  owners: number;
  dogs: number;
  appointments: number;
};

export async function getLocalCounts(): Promise<TableCounts> {
  const [owners, dogs, appointments] = await Promise.all([
    db.owners.count(),
    db.dogs.count(),
    db.appointments.count(),
  ]);
  return { owners, dogs, appointments };
}

export async function isLocalDatabaseEmpty(): Promise<boolean> {
  const c = await getLocalCounts();
  return c.owners === 0 && c.dogs === 0 && c.appointments === 0;
}

export async function importRemoteSnapshotReplaceAll(
  payload: SyncFilePayload,
): Promise<void> {
  const { owners, dogs, appointments } = payload;
  await db.transaction("rw", db.owners, db.dogs, db.appointments, async () => {
    await db.appointments.clear();
    await db.dogs.clear();
    await db.owners.clear();
    for (const o of owners) {
      await db.owners.put({ ...o, id: o.id! });
    }
    for (const d of dogs) {
      await db.dogs.put({
        ...d,
        id: d.id!,
        primaryOwnerId: d.primaryOwnerId,
      });
    }
    for (const a of appointments) {
      await db.appointments.put({
        ...a,
        id: a.id!,
        dogId: a.dogId,
      });
    }
  });
}

function sortById<T extends { id?: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
}

function nextFreeId(used: Set<number>, startFrom: number): number {
  let n = startFrom;
  while (used.has(n)) n += 1;
  return n;
}

/**
 * Merge remote rows into local tables; reassigns remote IDs on collision.
 */
export async function mergeRemoteIntoLocal(
  payload: SyncFilePayload,
): Promise<void> {
  const localOwners = await db.owners.toArray();
  const localDogs = await db.dogs.toArray();
  const localAppts = await db.appointments.toArray();

  const mergedOwners: Owner[] = localOwners.map((o) => ({ ...o }));
  const mergedDogs: Dog[] = localDogs.map((d) => ({ ...d }));
  const mergedAppts: Appointment[] = localAppts.map((a) => ({ ...a }));

  const usedOwnerIds = new Set(
    mergedOwners.map((o) => o.id!).filter((id) => Number.isFinite(id)),
  );
  const usedDogIds = new Set(
    mergedDogs.map((d) => d.id!).filter((id) => Number.isFinite(id)),
  );
  const usedApptIds = new Set(
    mergedAppts.map((a) => a.id!).filter((id) => Number.isFinite(id)),
  );

  let ownerMax = Math.max(0, ...[...usedOwnerIds]);
  const ownerRemap = new Map<number, number>();

  for (const ro of sortById(payload.owners)) {
    const rid = ro.id!;
    let finalId = rid;
    if (usedOwnerIds.has(rid)) {
      finalId = nextFreeId(usedOwnerIds, ownerMax + 1);
      ownerMax = Math.max(ownerMax, finalId);
    } else {
      ownerMax = Math.max(ownerMax, rid);
    }
    ownerRemap.set(rid, finalId);
    usedOwnerIds.add(finalId);
    mergedOwners.push({ ...ro, id: finalId });
  }

  let dogMax = Math.max(0, ...[...usedDogIds]);
  const dogRemap = new Map<number, number>();

  for (const rd of sortById(payload.dogs)) {
    const rid = rd.id!;
    const mappedOwner = ownerRemap.get(rd.primaryOwnerId!);
    const primaryOwnerId = mappedOwner ?? rd.primaryOwnerId!;

    let finalId = rid;
    if (usedDogIds.has(rid)) {
      finalId = nextFreeId(usedDogIds, dogMax + 1);
      dogMax = Math.max(dogMax, finalId);
    } else {
      dogMax = Math.max(dogMax, rid);
    }
    dogRemap.set(rid, finalId);
    usedDogIds.add(finalId);
    mergedDogs.push({
      ...rd,
      id: finalId,
      primaryOwnerId,
    });
  }

  let apptMax = Math.max(0, ...[...usedApptIds]);

  for (const ra of sortById(payload.appointments)) {
    const rid = ra.id!;
    const mappedDog = dogRemap.get(ra.dogId);
    const dogId = mappedDog ?? ra.dogId;

    let finalId = rid;
    if (usedApptIds.has(rid)) {
      finalId = nextFreeId(usedApptIds, apptMax + 1);
      apptMax = Math.max(apptMax, finalId);
    } else {
      apptMax = Math.max(apptMax, rid);
    }
    usedApptIds.add(finalId);
    mergedAppts.push({
      ...ra,
      id: finalId,
      dogId,
    });
  }

  await db.transaction("rw", db.owners, db.dogs, db.appointments, async () => {
    await db.appointments.clear();
    await db.dogs.clear();
    await db.owners.clear();
    for (const o of mergedOwners) {
      await db.owners.put({ ...o, id: o.id! });
    }
    for (const d of mergedDogs) {
      await db.dogs.put({ ...d, id: d.id!, primaryOwnerId: d.primaryOwnerId });
    }
    for (const a of mergedAppts) {
      await db.appointments.put({ ...a, id: a.id!, dogId: a.dogId });
    }
  });
}
