# Dog Grooming CMS

A lightweight **browser-based CMS for dog grooming salons**. It keeps owners, dogs, and grooming appointments in one place with a calendar-first workflow. Data stays **on the device** (IndexedDB via Dexie), so there is no backend to deploy for everyday use—the app is suitable as a demo or an offline-capable internal tool.

## What you get

- **Owners** — contact details for clients who book grooming for their dogs  
- **Dogs** — profiles linked to an owner, with notes for special care  
- **Calendar** — schedule appointments, move them, and line up services (bath, cut, nail trim, accessories)  
- **PWA** — installable; works well on phones and tablets for front-desk use  

Pushes to `main` (or `master`) build and deploy the static site to **GitHub Pages** (see `.github/workflows/github-pages.yml`).

## Tech stack

- [Svelte 5](https://svelte.dev/) + [TypeScript](https://www.typescriptlang.org/)  
- [Vite](https://vite.dev/) for dev server and production build  
- [Dexie](https://dexie.org/) / IndexedDB for local persistence  
- [Event Calendar](https://github.com/vkurko/calendar) for the scheduling UI  
- [Vite PWA](https://vite-pwa-org.netlify.app/) for the service worker and web app manifest  

## Development

**Requirements:** Node `>=20.19.0` or `>=22.12.0`, [Yarn 4](https://yarnpkg.com/) (Corepack).

```bash
corepack enable
yarn install
yarn dev
```

Other scripts:

- `yarn build` — production build to `dist/`  
- `yarn preview` — serve the production build locally  
- `yarn check` — Svelte and TypeScript checks  

For GitHub Pages, the workflow sets `VITE_BASE_PATH` to the repository name path; local `yarn dev` uses the default Vite base.

## Recommended IDE setup

[VS Code](https://code.visualstudio.com/) + [Svelte extension](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode). The repo includes `.vscode/extensions.json` so the editor can suggest the Svelte extension when you open the project.
