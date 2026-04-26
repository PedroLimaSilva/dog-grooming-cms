# Future: 24h appointment reminders

## Intent

Notify owners of upcoming appointments roughly **24 hours** before start.

## Constraints (today)

- MVP is **local-only** (Dexie). No backend for SMS/email/push payloads unless added later.
- `Appointment.reminderSentAt` exists so a future job can mark “already reminded” and avoid duplicates.

## Options

1. **Web Push** — requires a push service + server or static edge function to send; user grants permission; works when browser has network.
2. **SMS** — Twilio/MessageBird etc.; needs server-side secret and phone consent.
3. **Email** — same pattern as SMS.
4. **In-app only** — on next app open, show banner for “tomorrow’s” appointments if not `reminderSentAt`; no true push.

## Scheduling

- **Periodic Background Sync** (limited browser support) or **check on app foreground** + optional daily notification API where available.
- Respect quiet hours and owner consent.

## Next implementation steps (when prioritized)

- Choose channel(s), add minimal server or use platform APIs.
- Background task + idempotent send using `reminderSentAt`.
