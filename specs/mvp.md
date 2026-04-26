# MVP — Dog grooming salon CMS (PWA)

## Goal

On-device-first CMS for a dog grooming salon: appointments, dogs as clients, owners as contacts, calendar booking and rescheduling, data in IndexedDB via Dexie.

## In scope

- **Owners**: name, phone (primary contact).
- **Dogs (clients)**: name, breed, special care notes, linked primary owner (one owner per dog in MVP).
- **Appointments**: linked dog, start/end time, grooming services (bath, cut, nail trim, accessory purchase + optional note), free-text notes; optional `reminderSentAt` field for future use (not sent in MVP).
- **Calendar**: week / month / day views, create appointment from time selection, **drag-and-drop** to reschedule; **Move…** flow (date/time pickers) as fallback when drag is awkward on touch.
- **PWA**: installable shell, Workbox precaching via `vite-plugin-pwa`, offline reload of app assets; business data stays in IndexedDB.

## Out of scope (MVP)

- Multi-owner per dog (documented in domain model as future).
- Sending SMS/push/email reminders (see `future-reminders.md`).
- Server sync / multi-device backup.

## Testing checklist

- Safari on iPhone/iPad: Add to Home Screen, safe areas, tap targets (~44pt), calendar create + drag or Move fallback.
- Production build + `yarn preview`: service worker registers; app loads after refresh offline.

## Local development

From the project root (Node **20.19+** or **22+** recommended; repo includes [`.nvmrc`](../.nvmrc)):

- `yarn install` — if your Node is slightly below Vite’s stated minimum, `YARN_IGNORE_ENGINES=1 yarn install` may be needed.
- `yarn dev` — Vite dev server (PWA service worker is mainly exercised in production build).
- `yarn build` then `yarn preview` — test installability and offline precache.
