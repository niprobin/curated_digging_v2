# Curated Music To-do app

Curated Music To-do is your personal hub to keep up with new tracks and albums coming from trusted curators. The app mirrors a shadcn-inspired design system, works great on mobile as a PWA, and keeps your filters and likes in sync across every section.

## Features

- **Hierarchical filters** – switch between playlists and albums without losing your time window, curator, or visibility preferences.
- **Opensheet-driven data** – tracks and releases load directly from the shared Google Sheets via Opensheet JSON endpoints.
- **Like history (v2)** – mark songs and albums you love; the app keeps an audit trail so you can revisit active and archived favourites.
- **PWA ready** – installable experience with an offline fallback, manifest, and generated icons.
- **Font Awesome kit** – icons load through the provided kit for a consistent visual language.

## Data sources

- Playlists: `https://opensheet.elk.sh/19q7ac_1HikdJK_mAoItd65khDHi0pNCR8PrdIcR6Fhc/all_tracks`
- Albums: `https://opensheet.elk.sh/1LOx-C1USXeC92Mtv0u6NizEvcTMWkKJNGiNTwAtSj3E/2`

## Getting started

Install dependencies (if you have not already):

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000). Service worker registration is disabled in development by default; build for production to test PWA behaviour.

Create an optimized production build:

```bash
npm run build
npm run start
```

## Project structure highlights

- `app/` – Next.js App Router pages (`/`, `/playlists`, `/albums`, `/history`, `/offline`).
- `components/` – UI primitives and domain views (filters, playlists, albums, overview, history).
- `lib/` – Data fetching helpers, filter utilities, and shared helpers.
- `public/manifest.webmanifest` – PWA manifest plus generated icons in multiple sizes.
- `next.config.ts` – Next.js configuration wrapped with `next-pwa` for offline support.

## Linting

Run ESLint to verify the project state:

```bash
npm run lint
```

Linting runs cleanly after the changes in this version.
