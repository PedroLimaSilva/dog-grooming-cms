# UX — iPad and iPhone first

## Targets

Primary devices: **iPhone** and **iPad** in Safari and as an **installed PWA** (Add to Home Screen).

## Layout

- Mobile-first CSS; meaningful breakpoints around **~390px** (phone) and **~768px / ~1024px** (iPad portrait / landscape).
- Calendar must be usable in **iPad portrait** (stacked toolbar + grid); landscape uses wider time grid when applicable.

## Touch

- Minimum interactive targets **~44×44pt** (buttons, tabs, list rows, draggable event hit areas).
- Avoid hover-only critical actions; provide tap alternatives.

## Safe areas

- `viewport-fit=cover` in HTML viewport meta where used with `env(safe-area-inset-*)` on fixed chrome (header, bottom nav, full-screen sheets).
- Modals and forms respect bottom inset (home indicator).

## PWA / iOS

- Manifest: `display: standalone`, `theme_color`, icons.
- Meta: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `theme-color`.

## Calendar interaction

- Prefer pointer/touch-friendly calendar (Event Calendar interaction).
- If drag is unreliable on a device, use **Move appointment** sheet (date/time pickers).

## Forms

- On iPhone, avoid inputs staying under the keyboard: scroll focused field into view (`scrollIntoView` / `visualViewport` if needed).
