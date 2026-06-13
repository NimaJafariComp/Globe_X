# Globe X

Globe X maps sources to geographic clusters and lets you explore them on an interactive globe. The UI is centered on the /intelligence page and uses a sample dataset to render sources, locations, and modalities with search and filtering.

## Stack

- Next.js 16 (App Router)
- React 19
- TypeScript 5
- Three.js for globe rendering
- TopoJSON + world-atlas for map data

## Features

- Interactive globe clustered by location
- Source search across modalities and industries
- WebGPU availability detection with WebGL fallback messaging

## Getting started

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run typecheck` — TypeScript type check
- `npm run lint` — ESLint
- `npm run lint:fix` — ESLint with auto-fix
- `npm run format` — Prettier write
- `npm run format:check` — Prettier check
- `npm run lint:all` — typecheck + lint + format check
- `bash scripts/lint.sh` — unified quality gate (same checks, with pass/fail output)

## Project layout

- `src/app/intelligence` — page entry for the intelligence view
- `src/components/intelligence` — globe renderer and hover card
- `src/utils/intelligence` — clustering, search, and coordinate utilities
- `src/data` — sample dataset used for the demo
