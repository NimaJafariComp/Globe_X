You are working in an existing Next.js TypeScript frontend codebase. Implement a split-screen 3D company intelligence visualization.

The product has two synchronized visual views:

1. LEFT: a chill DNA-style 3D knowledge graph rendered as linked particles.
2. RIGHT: a dark interactive globe showing company HQ and clustered source locations.

The left graph is the original 3D graph concept. Do NOT build a separate force graph. The DNA linked-particle graph is the knowledge graph.

Use this sample as the visual/technical inspiration for the left graph:
https://github.com/ULuIQ12/webgpu-tsl-linkedparticles

That repo is a Three.js + Vite + React-ish WebGPU/TSL linked-particles experiment. It uses particles and connecting geometry generated with compute/TSL. Treat it as a visual reference and implementation reference, not as product logic. The left graph should have a similar calm linked-particle feel, but our particle positions must come from our knowledge graph data, not random simulation.

Also use the Three.js linked-particles WebGPU/TSL example as a reference:
https://threejs.org/examples/webgpu_tsl_vfx_linkedparticles.html

Important: this project is Next.js, not Vite. Do not introduce Vite-specific assumptions, config, or entrypoints.

============================================================
REQUIRED STACK
============================================================

Use this stack unless the existing codebase already has equivalent packages:

Core:
- Next.js
- TypeScript
- React
- Three.js

Next.js requirements:
- Use the App Router if the project already uses `/app`.
- Use the Pages Router only if the project is already on `/pages`.
- All Three.js/WebGPU/browser-only visualization components must be Client Components.
- Add `"use client"` at the top of components that use:
  - window
  - document
  - navigator
  - requestAnimationFrame
  - Three.js renderers
  - pointer/mouse events
  - React state/effects for browser rendering
- Do not access `window`, `document`, or `navigator` during server render.
- Use dynamic imports with `ssr: false` for heavy 3D components if needed.
- Keep data utilities, types, and pure functions server-safe.
- The visualization should accept a `SourceDataset` prop.
- Add a local demo route/page only if needed for testing.

Recommended Next.js structure:

src/
  app/
    intelligence/
      page.tsx
  components/
    intelligence/
      CompanyIntelligenceView.tsx
      KnowledgeDnaGraph.tsx
      GlobeSourceMap.tsx
      CrossPanelLinks.tsx
  data/
    sampleSourceDataset.ts
  types/
    sourceGraph.ts
  utils/
    intelligence/
      locationFallback.ts
      buildLocationClusters.ts
      buildKnowledgeDnaGraph.ts
      worldToScreen.ts
      searchSources.ts

If this codebase uses a different folder structure, adapt to it while preserving these module boundaries.

3D rendering:
- Three.js WebGLRenderer is the required baseline.
- WebGPU / TSL is an optional enhancement path when supported.
- Detect WebGPU only on the client with `typeof navigator !== "undefined" && !!navigator.gpu`.
- The app must still work without WebGPU.
- Start with the WebGL baseline.
- Keep the renderer modular so a future pass can replace/enhance the left DNA renderer with a closer WebGPU/TSL implementation based on the linked-particles sample.

Left DNA graph:
- Custom Three.js component.
- Do NOT require `3d-force-graph`.
- Do NOT render a random force-directed graph.
- Use deterministic DNA/helix layout based on our source data.
- Prefer WebGPU/TSL linked-particle style if the project already supports it.
- Otherwise implement a WebGL fallback using:
  - `THREE.Points`, sprites, or instanced sphere meshes for nodes
  - `THREE.BufferGeometry`, `LineSegments`, or curves for links
  - raycasting for hover/click
  - subtle animation with shader material or CPU-updated positions

Right globe:
- Prefer `three-globe` if available or acceptable to install.
- Otherwise use a custom Three.js sphere with lat/lng marker conversion.
- Globe must be dark and minimal.
- Use arcs from company HQ to location clusters.
- Render one marker per location cluster, not one marker per source.

State/UI:
- React state for hover/search/selection.
- CSS modules, Tailwind, or the existing styling system.
- No heavy backend work.
- No API route is required unless the existing app architecture expects one.
- Visualization accepts a `SourceDataset` prop.

Optional packages if not already installed:
- three
- three-globe
- @types/three

Do not add Vite. Do not add Vite config. Do not use `import.meta.env` unless the existing Next.js project already has a compatibility layer. Use Next.js environment conventions if environment variables are ever needed.

============================================================
NEXT.JS IMPLEMENTATION NOTES
============================================================

Because Three.js relies on browser APIs, keep all 3D rendering inside Client Components.

Example:

"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export function KnowledgeDnaGraph(...) {
  // safe to use window/document/navigator here inside effects
}

If creating an App Router page:

src/app/intelligence/page.tsx

This page may be a Server Component by default, but it should render a client wrapper or dynamically import the visualization.

Option A: use a client wrapper:

import { sampleSourceDataset } from "@/data/sampleSourceDataset";
import { CompanyIntelligenceView } from "@/components/intelligence/CompanyIntelligenceView";

export default function IntelligencePage() {
  return <CompanyIntelligenceView dataset={sampleSourceDataset} />;
}

Then `CompanyIntelligenceView.tsx` must start with `"use client"`.

Option B: dynamic import with SSR disabled:

import dynamic from "next/dynamic";
import { sampleSourceDataset } from "@/data/sampleSourceDataset";

const CompanyIntelligenceView = dynamic(
  () =>
    import("@/components/intelligence/CompanyIntelligenceView").then(
      (mod) => mod.CompanyIntelligenceView
    ),
  { ssr: false }
);

export default function IntelligencePage() {
  return <CompanyIntelligenceView dataset={sampleSourceDataset} />;
}

Use Option A if it works cleanly. Use Option B if Three.js or `three-globe` causes SSR/import issues.

For `three-globe`, if importing it at the top level causes SSR problems, dynamically import it inside `useEffect`:

useEffect(() => {
  let cancelled = false;

  async function init() {
    const [{ default: ThreeGlobe }, THREE] = await Promise.all([
      import("three-globe"),
      import("three"),
    ]);

    if (cancelled || !containerRef.current) return;

    // initialize globe
  }

  init();

  return () => {
    cancelled = true;
    // cleanup
  };
}, [...]);

Use the same pattern for any browser-only or WebGPU-specific modules that do not tolerate SSR.

============================================================
HIGH-LEVEL VISUAL DESIGN
============================================================

Final screen:

┌─────────────────────────────────────────────────────────────┐
│ Top bar: search, selected company, filters                  │
├──────────────────────────────┬──────────────────────────────┤
│ LEFT                         │ RIGHT                        │
│ DNA linked-particle graph    │ dark globe source map        │
│                              │                              │
│ Company → modalities         │ Company HQ → clustered       │
│ → input source leaves        │ source locations             │
└──────────────────────────────┴──────────────────────────────┘

Left side answers:
“What intelligence/source types does this company have?”

Right side answers:
“Where are those sources geographically connected?”

Cross-panel faded/pulsing links answer:
“This source leaf on the left corresponds to this location cluster on the globe.”

============================================================
DATA MODEL
============================================================

Create/update shared types.

type GeoPoint = {
  lat: number;
  lng: number;
  label?: string;
};

type Company = {
  id: string;
  name: string;
  logoUrl?: string;
  headquarters?: GeoPoint;
};

type Modality =
  | "news"
  | "market"
  | "finance"
  | "deals"
  | "patents"
  | "publications"
  | "academic"
  | "jobs"
  | "clinical"
  | "entity"
  | "ai_llm";

type SourceNode = {
  id: string;
  name: string;
  url?: string;
  modality: Modality;
  description?: string;
  industry?: string;
  location?: GeoPoint;
  companyId?: string;
};

type SourceDataset = {
  company: Company;
  sources: SourceNode[];
};

Default company HQ fallback:

const DEFAULT_COMPANY_HQ: GeoPoint = {
  lat: 37.4419,
  lng: -122.143,
  label: "Palo Alto"
};

Location fallback:
- If source.location exists, use it.
- Else if company.headquarters exists, use it.
- Else use DEFAULT_COMPANY_HQ.

============================================================
UTILITY FILES TO CREATE
============================================================

Prefer these files unless the codebase has better equivalents:

src/types/sourceGraph.ts
src/utils/intelligence/locationFallback.ts
src/utils/intelligence/buildLocationClusters.ts
src/utils/intelligence/buildKnowledgeDnaGraph.ts
src/utils/intelligence/worldToScreen.ts
src/utils/intelligence/searchSources.ts
src/components/intelligence/CompanyIntelligenceView.tsx
src/components/intelligence/KnowledgeDnaGraph.tsx
src/components/intelligence/GlobeSourceMap.tsx
src/components/intelligence/CrossPanelLinks.tsx
src/data/sampleSourceDataset.ts

============================================================
GLOBE LOCATION CLUSTERING
============================================================

The globe must not render duplicate markers for multiple sources at the same location.

Example:
- News article in San Francisco
- Job posting in San Francisco
- Patent filing in San Francisco

Render ONE San Francisco globe marker.

On hover, show:

San Francisco
3 sources

News
• TechCrunch article

Jobs
• AI research engineer posting

Patents
• Patent filing

Types:

type GlobeLocationCluster = {
  id: string;
  location: GeoPoint;
  sources: SourceNode[];
  modalities: Modality[];
  count: number;
};

type SourceToClusterMap = Record<string, string>;

Implement:

buildLocationClusters(dataset: SourceDataset): {
  clusters: GlobeLocationCluster[];
  sourceToCluster: SourceToClusterMap;
}

Clustering details:
- Use getSourceLocation(source, company).
- Normalize by label + rounded lat/lng.
- Use lat.toFixed(3), lng.toFixed(3).
- Cluster IDs must be deterministic.
- Every source.id must map to exactly one cluster.id.
- Modalities should be unique per cluster.

============================================================
LEFT DNA KNOWLEDGE GRAPH
============================================================

Create:

KnowledgeDnaGraph.tsx

This is the main graph. It replaces a normal force graph.

It should render:
- Company/root node
- Modality nodes
- Source/input leaf nodes
- Two DNA strands:
  - one strand for modalities
  - one strand for source leaves
- Rungs connecting modality node to source node
- Optional root links from the company node into the first helix pair

Semantically, it represents:

Company / Logo
├── News
│   ├── Source link
├── Market / Finance
│   ├── Source link
├── Deals
├── Patents
├── Publications / Academic
├── Jobs
├── Clinical
└── Entity

Visually, it should be a DNA/helix linked-particle structure.

Important:
- Do not rely on random force layout.
- Use deterministic helix coordinates.
- Ambient motion is allowed, but semantic positions must stay readable.

Helix layout:

For each source at index i:

const angle = i * twist;
const y = i * verticalGap;
const radius = 44;

modality node:
{
  x: Math.cos(angle) * radius,
  y,
  z: Math.sin(angle) * radius
}

source node:
{
  x: Math.cos(angle + Math.PI) * radius,
  y,
  z: Math.sin(angle + Math.PI) * radius
}

Defaults:
- radius = 44
- verticalGap = 18
- twist = 0.72
- root = { x: 0, y: -60, z: 0 }

Types:

type DnaGraphNode = {
  id: string;
  sourceId?: string;
  name: string;
  type: "root" | "modality" | "source";
  modality?: Modality;
  url?: string;
  description?: string;
  industry?: string;
  x: number;
  y: number;
  z: number;
  size: number;
};

type DnaGraphLink = {
  source: string;
  target: string;
  type: "strand" | "rung" | "root";
};

Implement:

buildKnowledgeDnaGraph(dataset: SourceDataset): {
  nodes: DnaGraphNode[];
  links: DnaGraphLink[];
}

Rules:
- Root node uses company.id.
- Source leaf node must preserve source.id as sourceId.
- Modality nodes may repeat per source row to preserve helix readability.
- Links:
  - rung: modality node → source node
  - modality strand: previous modality node → current modality node
  - source strand: previous source node → current source node
  - root: company node → first modality/source nodes

Interaction:
- Hover any node: show tooltip with full name.
- Hover source node: setActiveSourceId(source.id).
- Hover modality node: optional preview/highlight that modality.
- Click source node with url: open source.url in new tab using noopener/noreferrer.
- Click modality node: toggle selectedModality.
- Search highlights matches by:
  - source name
  - modality
  - industry
  - description
  - company name
  - location label
- Dim unrelated nodes when search is active.
- Emit screen anchors for source nodes keyed by source.id.

Visual style:
- Dark background.
- Root/company node: largest, soft aqua/cyan glow.
- Modality nodes: medium cool blue.
- Source nodes: smaller warm orange or neutral.
- Active/hover/search: white or aqua.
- Rung links: brighter than strand links.
- Strand links: very faint.
- Root links: aqua and slightly brighter.
- Overall mood: calm, minimal, high-tech, not cluttered.

WebGPU/TSL note:
Use the linked-particles sample as a visual direction. If implementing WebGPU/TSL now is too much for the first pass, build the WebGL version first with the same public component API. Keep the internal renderer modular so WebGPU/TSL can replace/enhance it later.

============================================================
RIGHT GLOBE SOURCE MAP
============================================================

Create:

GlobeSourceMap.tsx

It renders:
- dark globe
- company HQ marker
- one marker per location cluster
- one arc from company HQ to each cluster
- hover card per cluster
- active/search/modality highlighting

Use:
- three-globe if available
- otherwise custom Three.js sphere

Do not render one marker per source. Render one marker per cluster.

Marker sizing:
- 1 source: small
- 2–5 sources: medium
- 6+ sources: larger glow

Marker behavior:
- Hover cluster:
  - setActiveClusterId(cluster.id)
  - show hover card
  - highlight all source leaves in DNA graph that belong to this cluster
  - cross-panel links show from those source leaves to this marker
- Click source item in hover card:
  - open source.url
- selectedModality:
  - highlight clusters containing that modality
  - dim unrelated clusters
- activeSourceId:
  - highlight cluster containing that source
- search:
  - highlight clusters containing matching sources

Arc behavior:
- Draw one arc from company HQ to each cluster.
- No duplicate arcs for sources in the same cluster.
- Default opacity subtle.
- Highlight active/search/selected modality arcs.

Hover card:
- Should show location label.
- Should show source count.
- Should show modalities present.
- Should group sources by modality.
- Source items with URLs are clickable.

============================================================
CROSS-PANEL LINKS
============================================================

Create:

CrossPanelLinks.tsx

This draws SVG paths over both panels connecting:
DNA source leaf anchor → Globe location cluster anchor

Because multiple source leaves can map to one globe cluster, this must support many-to-one links.

Types:

type ScreenAnchor = {
  id: string;
  x: number;
  y: number;
  visible: boolean;
};

type DnaAnchorMap = Record<string, ScreenAnchor>;
// keyed by source.id

type GlobeClusterAnchorMap = Record<string, ScreenAnchor>;
// keyed by cluster.id

type SourceToClusterMap = Record<string, string>;

Props:
- dnaAnchors
- globeClusterAnchors
- sourceToCluster
- sources
- activeSourceId
- activeClusterId
- selectedModality
- matchingSourceIds

Visibility rules:
1. Default:
   - No lines, or extremely faint only for active/matched items.
2. Hover source leaf:
   - Draw one line from source leaf to its cluster marker.
   - Add small pulse traveling from leaf to globe.
3. Hover globe cluster:
   - Draw faint lines from all DNA source leaves in that cluster to the cluster marker.
4. Selected modality:
   - Draw faint lines only from matching modality source leaves to clusters.
5. Search:
   - Draw lines only for matching sources.

Path:
Use cubic bezier:

const midX = (a.x + b.x) / 2;
const d = `M ${a.x} ${a.y} C ${midX} ${a.y}, ${midX} ${b.y}, ${b.x} ${b.y}`;

Style:
- SVG absolute over workspace
- pointer-events: none
- z-index above canvases, below tooltips
- base stroke rgba(255,255,255,0.10)
- active stroke rgba(127,255,212,0.55)
- dashed base line
- small aqua pulse circle for active link

============================================================
SCREEN ANCHOR PROJECTION
============================================================

Create:

worldToScreen.ts

Implement:

function worldToScreen(
  position: THREE.Vector3,
  camera: THREE.Camera,
  renderer: THREE.WebGLRenderer
): { x: number; y: number; visible: boolean } {
  const vector = position.clone().project(camera);
  const rect = renderer.domElement.getBoundingClientRect();

  return {
    x: rect.left + ((vector.x + 1) * rect.width) / 2,
    y: rect.top + ((-vector.y + 1) * rect.height) / 2,
    visible: vector.z >= -1 && vector.z <= 1,
  };
}

DNA graph:
- Report anchors for source leaf nodes.
- Key anchors by source.id.

Globe:
- Report anchors for cluster markers.
- Key anchors by cluster.id.
- For three-globe, use globe.getCoords(lat, lng, altitude) or equivalent.
- For custom sphere, convert lat/lng to sphere coordinates.

Performance:
- Update anchors on animation frame, but throttle React state updates.
- Avoid state updates if anchor values did not materially change.
- Clean up animation frames, listeners, renderers, geometries, materials on unmount.

============================================================
PARENT COMPONENT
============================================================

Create:

CompanyIntelligenceView.tsx

This must be a Client Component.

Props:
type CompanyIntelligenceViewProps = {
  dataset: SourceDataset;
};

State:
const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
const [activeClusterId, setActiveClusterId] = useState<string | null>(null);
const [selectedModality, setSelectedModality] = useState<Modality | null>(null);
const [searchQuery, setSearchQuery] = useState("");
const [dnaAnchors, setDnaAnchors] = useState<DnaAnchorMap>({});
const [globeClusterAnchors, setGlobeClusterAnchors] = useState<GlobeClusterAnchorMap>({});

Compute:
- clusters
- sourceToCluster
- matchingSourceIds

Layout:
- top bar
- left panel KnowledgeDnaGraph
- right panel GlobeSourceMap
- CrossPanelLinks overlay

Example structure:

<main className="company-intelligence-view">
  <header className="topbar">
    <div>{dataset.company.name}</div>
    <input value={searchQuery} onChange={...} placeholder="Search sources, modalities, industries..." />
  </header>

  <section className="workspace">
    <section className="panel dna-panel">
      <KnowledgeDnaGraph ... />
    </section>

    <section className="panel globe-panel">
      <GlobeSourceMap ... />
    </section>

    <CrossPanelLinks ... />
  </section>
</main>

CSS:
.company-intelligence-view {
  width: 100%;
  height: 100vh;
  background: #050505;
  color: white;
  overflow: hidden;
}

.workspace {
  width: 100%;
  height: calc(100vh - 64px);
  display: grid;
  grid-template-columns: 42% 58%;
  position: relative;
  overflow: hidden;
}

.panel {
  position: relative;
  overflow: hidden;
}

.cross-panel-links {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
}

============================================================
SAMPLE DATA FOR NEXT.JS TESTING
============================================================

Create:

src/data/sampleSourceDataset.ts

Export:

export const sampleSourceDataset: SourceDataset = { ... };

Generate realistic fake/demo data for local testing.

Requirements:
- 35–50 sources.
- One root company:
  - id: "aurora-synbio"
  - name: "Aurora SynBio"
  - logoUrl: "/logos/aurora-synbio.svg"
  - headquarters: Palo Alto
- Include modalities:
  - news
  - jobs
  - patents
  - publications
  - academic
  - finance
  - market
  - deals
  - clinical
  - entity
  - ai_llm
- Include repeated locations:
  - San Francisco: many mixed sources, at least 6
  - Palo Alto: HQ and fallback cluster
  - New York: finance/news/deals/market
  - Boston: academic/publications/clinical
  - London: finance/news/entity
  - Berlin: jobs/publications/academic
  - Tokyo: entity/market/finance
  - Singapore: clinical/deals/news
  - Toronto: ai_llm/jobs/publications
  - Zurich: patents/academic/publications
- At least 5 sources must omit location to test fallback to Palo Alto.
- Use fake URLs under example.com.
- Make search terms like "clinical", "patent", "foundation model", "jobs", "finance", and "Singapore" return visible matches.
- Ensure several sources share exact same lat/lng/label so clustering is easy to verify.
- Ensure at least one cluster has 5+ sources so marker sizing can be tested.

Do not use real company claims unless they are clearly fake/demo entries.

============================================================
OPTIONAL DEMO PAGE
============================================================

If the project uses the Next.js App Router, add:

src/app/intelligence/page.tsx

It should render the sample visualization.

Example:

import { sampleSourceDataset } from "@/data/sampleSourceDataset";
import { CompanyIntelligenceView } from "@/components/intelligence/CompanyIntelligenceView";

export default function IntelligencePage() {
  return <CompanyIntelligenceView dataset={sampleSourceDataset} />;
}

If SSR/import issues occur with Three.js or three-globe, use a dynamic import with ssr: false.

============================================================
ACCEPTANCE CRITERIA
============================================================

Done means:

1. Stack:
   - Next.js
   - TypeScript
   - React
   - Three.js
   - WebGL baseline
   - WebGPU/TSL enhancement path optional but architecture-ready
   - three-globe or custom globe
   - no Vite assumptions

2. Next.js correctness:
   - Client Components are used where browser APIs are needed.
   - No `window`, `document`, or `navigator` access during server render.
   - Heavy 3D imports are dynamically imported or safely isolated if needed.
   - Demo page works in Next.js.
   - No hydration errors.

3. Left DNA graph:
   - company/root node exists
   - modality nodes exist
   - source leaves exist
   - helix/DNA shape is visible
   - rungs connect modality/source pairs
   - source leaves are clickable
   - hover labels work
   - search highlights/dims correctly
   - source leaf screen anchors are emitted

4. Right globe:
   - company HQ marker exists
   - source locations are clustered
   - no duplicate markers for same location
   - arcs go from company HQ to each cluster
   - hover card lists sources grouped by modality
   - source URLs open from hover card
   - cluster screen anchors are emitted

5. Cross-panel links:
   - source.id maps to cluster.id through sourceToCluster
   - multiple source leaves can connect to one cluster marker
   - lines are minimal/faded
   - pulse appears for active source
   - search/modality/cluster hover lines work

6. Data:
   - missing source location falls back to company HQ
   - source IDs are stable everywhere
   - cluster IDs are deterministic
   - TypeScript is strict and valid
   - sample dataset demonstrates all required cases

7. Performance/cleanup:
   - animation loops cleaned up
   - Three resources disposed on unmount
   - resize handled
   - anchor updates throttled
   - no runaway React render loop

8. Visual:
   - dark, calm, high-tech
   - left side resembles linked-particle DNA inspired by webgpu-tsl-linkedparticles
   - right side resembles a minimal dark source globe
   - UI is not cluttered

Start by implementing the WebGL baseline in Next.js. Keep the renderer modular so a future pass can replace the left DNA renderer with a closer WebGPU/TSL implementation based on the linked-particles sample.