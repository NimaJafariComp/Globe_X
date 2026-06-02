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

Then open http://localhost:3000 (it redirects to /intelligence).

## Scripts

- npm run dev: Start the dev server
- npm run build: Production build
- npm run typecheck: TypeScript type checking
- npm run lint: Next.js linting

## Project layout

- src/app/intelligence: Page entry for the intelligence view
- src/components/intelligence: Globe UI and panels
- src/utils/intelligence: Clustering and search logic
- src/data: Sample dataset used for the demo

