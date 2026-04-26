import Dexie, { type EntityTable } from 'dexie'
import type { Appointment, Dog, GroomingServiceLine, Owner } from '../types'

export type OwnerRecord = Owner
export type DogRecord = Dog
export type AppointmentRecord = Appointment

const SEED_KEY = 'grooming-seeded-v1'

export class GroomingDB extends Dexie {
  owners!: EntityTable<OwnerRecord, 'id'>
  dogs!: EntityTable<DogRecord, 'id'>
  appointments!: EntityTable<AppointmentRecord, 'id'>

  constructor() {
    super('groomingSalonDB')
    this.version(1).stores({
      owners: '++id, name',
      dogs: '++id, primaryOwnerId, name',
      appointments: '++id, dogId, start',
    })
  }
}

export const db = new GroomingDB()

export async function seedIfEmpty(): Promise<void> {
  if (typeof localStorage === 'undefined') return
  if (localStorage.getItem(SEED_KEY)) return
  const n = await db.owners.count()
  if (n > 0) {
    localStorage.setItem(SEED_KEY, '1')
    return
  }

  const jamie = (await db.owners.add({ name: 'Jamie Smith', phone: '+1 555-0100' })) as number
  const alex = (await db.owners.add({ name: 'Alex Ruiz', phone: '+1 555-0101' })) as number

  const cocoa = (await db.dogs.add({
    name: 'Cocoa',
    breed: 'Poodle',
    specialCareNotes: 'Sensitive ears; no perfumed shampoo',
    primaryOwnerId: jamie,
  })) as number
  await db.dogs.add({
    name: 'Bear',
    breed: 'Golden Retriever',
    primaryOwnerId: alex,
  })

  const now = new Date()
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    10,
    0,
    0,
    0,
  ).getTime()
  const end = start + 60 * 60 * 1000
  await db.appointments.add({
    dogId: cocoa,
    start,
    end,
    services: [{ kind: 'bath' }, { kind: 'cut' }],
    notes: 'Demo appointment',
  })

  localStorage.setItem(SEED_KEY, '1')
}

export async function upsertOwner(row: OwnerRecord): Promise<number> {
  if (row.id != null) {
    await db.owners.put(row)
    return row.id
  }
  return (await db.owners.add({ name: row.name, phone: row.phone, email: row.email })) as number
}

export async function upsertDog(row: DogRecord): Promise<number> {
  if (row.id != null) {
    await db.dogs.put(row)
    return row.id
  }
  return (await db.dogs.add({
    name: row.name,
    breed: row.breed,
    specialCareNotes: row.specialCareNotes,
    primaryOwnerId: row.primaryOwnerId,
  })) as number
}

export async function deleteOwner(id: number): Promise<void> {
  const linked = await db.dogs.where('primaryOwnerId').equals(id).count()
  if (linked > 0) {
    throw new Error('Cannot delete owner while dogs still reference them.')
  }
  await db.owners.delete(id)
}

export async function deleteDog(id: number): Promise<void> {
  await db.appointments.where('dogId').equals(id).delete()
  await db.dogs.delete(id)
}

const defaultServices: GroomingServiceLine[] = [{ kind: 'bath' }]

export async function createAppointment(input: {
  dogId: number
  start: number
  end: number
  services?: GroomingServiceLine[]
  notes?: string
}): Promise<number> {
  return (await db.appointments.add({
    dogId: input.dogId,
    start: input.start,
    end: input.end,
    services: input.services?.length ? input.services : defaultServices,
    notes: input.notes,
  })) as number
}

export async function updateAppointmentTimes(
  id: number,
  start: number,
  end: number,
): Promise<void> {
  const prev = await db.appointments.get(id)
  if (!prev) return
  await db.appointments.put({ ...prev, start, end })
}

export async function updateAppointment(input: {
  id: number
  dogId: number
  start: number
  end: number
  services: GroomingServiceLine[]
  notes?: string
}): Promise<void> {
  const prev = await db.appointments.get(input.id)
  if (!prev) return
  await db.appointments.put({
    ...prev,
    dogId: input.dogId,
    start: input.start,
    end: input.end,
    services: input.services,
    notes: input.notes,
  })
}

export async function deleteAppointment(id: number): Promise<void> {
  await db.appointments.delete(id)
}
