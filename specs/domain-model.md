# Domain model

## Owner

Point of contact for one or more dogs.

| Field   | Type          | Notes                         |
| ------- | ------------- | ----------------------------- |
| `id`    | number (auto) | Dexie primary key             |
| `name`  | string        |                               |
| `phone` | string        |                               |
| `email` | string?       | Reserved for future reminders |

## Dog (client)

The animal receiving grooming.

| Field              | Type          | Notes                              |
| ------------------ | ------------- | ---------------------------------- |
| `id`               | number (auto) |                                    |
| `name`             | string        |                                    |
| `breed`            | string        |                                    |
| `specialCareNotes` | string?       | Allergies, behavior, medical notes |
| `primaryOwnerId`   | number        | FK → Owner (MVP: single owner)     |

### Future: multiple owners

Junction table `dog_owners` (`dogId`, `ownerId`, role) and UI to pick co-owners; not in MVP schema.

## Grooming services (catalog)

Stored on each appointment as a list of service entries:

- `bath`
- `cut`
- `nail_trim`
- `accessory_purchase` — optional `accessoryNote` (what was sold)

## Appointment

Scheduled grooming event for one dog.

| Field            | Type                    | Notes                                     |
| ---------------- | ----------------------- | ----------------------------------------- |
| `id`             | number (auto)           |                                           |
| `dogId`          | number                  | FK → Dog                                  |
| `start`          | number                  | Unix ms (local wall time as selected)     |
| `end`            | number                  | Unix ms                                   |
| `services`       | `GroomingServiceLine[]` |                                           |
| `notes`          | string?                 |                                           |
| `reminderSentAt` | number?                 | ms; null until a reminder pipeline exists |

Indexed by `start` for calendar range queries.
