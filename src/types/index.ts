/** Point of contact for one or more dogs */
export type Owner = {
  id?: number
  name: string
  phone: string
  email?: string
}

/** Grooming client (dog) */
export type Dog = {
  id?: number
  name: string
  breed: string
  specialCareNotes?: string
  primaryOwnerId: number
}

export type GroomingServiceKind = 'bath' | 'cut' | 'nail_trim' | 'accessory_purchase'

export type GroomingServiceLine =
  | { kind: 'bath' }
  | { kind: 'cut' }
  | { kind: 'nail_trim' }
  | { kind: 'accessory_purchase'; accessoryNote?: string }

/** Scheduled visit */
export type Appointment = {
  id?: number
  dogId: number
  /** Unix ms (local instant) */
  start: number
  end: number
  services: GroomingServiceLine[]
  notes?: string
  /** Set when a reminder pipeline sends; null/undefined until then */
  reminderSentAt?: number | null
}
