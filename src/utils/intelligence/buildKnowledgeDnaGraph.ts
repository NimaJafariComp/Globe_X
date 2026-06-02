import type {
  DnaGraphLink,
  DnaGraphNode,
  Modality,
  SourceDataset,
} from "@/types/sourceGraph";

// ── Left-to-right layout ──────────────────────────────────────────────────────
// Root on the left, modalities spread in a vertical arc to the right,
// source leaves cluster further right from each modality.

const ROOT_X    = -110;
const R_MOD     = 95;   // root → modality reach
const VX        = 0.52; // horizontal compression of arc (controls "flatness")
const FAN_HALF  = Math.PI * 0.43; // ±77° vertical spread
const SRC_DX    = 38;   // sources sit this far to the right of their modality
const LEAF_AMP  = 32;   // max half-height of the source cluster per modality
const Z_WAVE    = 14;   // z-depth amplitude for 3D feel

export function buildKnowledgeDnaGraph(dataset: SourceDataset): {
  nodes: DnaGraphNode[];
  links: DnaGraphLink[];
} {
  const nodes: DnaGraphNode[] = [];
  const links: DnaGraphLink[] = [];

  nodes.push({
    id: dataset.company.id,
    name: dataset.company.name,
    type: "root",
    x: ROOT_X, y: 0, z: 0,
    size: 9,
  });

  // Group by modality (insertion order = source order)
  const byModality = new Map<Modality, typeof dataset.sources>();
  for (const s of dataset.sources) {
    const list = byModality.get(s.modality) ?? [];
    list.push(s);
    byModality.set(s.modality, list);
  }

  const mods = Array.from(byModality.keys());
  const N = mods.length;

  mods.forEach((modality, i) => {
    // theta controls vertical spread; 0 = centre
    const theta = N > 1 ? -FAN_HALF + (i / (N - 1)) * 2 * FAN_HALF : 0;

    // Modality: pushed right of root, arcs vertically
    const ym = R_MOD * Math.sin(theta);
    const xm = ROOT_X + R_MOD * (1 - VX + VX * Math.cos(theta));
    const zm = Math.sin(theta) * Z_WAVE;
    const mid = `mod-${modality}`;

    nodes.push({
      id: mid, name: modality, type: "modality", modality,
      x: xm, y: ym, z: zm, size: 6.2,
    });
    links.push({ source: dataset.company.id, target: mid, type: "root" });

    const srcs = byModality.get(modality)!;
    const M    = srcs.length;
    // Evenly space sources vertically around the modality
    const amp  = Math.min(LEAF_AMP, M * 6.5);

    srcs.forEach((src, j) => {
      const t   = M > 1 ? (j / (M - 1)) * 2 - 1 : 0; // -1..+1
      const xs  = xm + SRC_DX + t * amp * 0.18; // mostly right, slight x jitter
      const ys  = ym + t * amp;
      const zs  = zm + t * 3.5;

      const sid = `${src.id}-source`;
      nodes.push({
        id: sid, sourceId: src.id,
        name: src.name, type: "source", modality,
        url: src.url, description: src.description, industry: src.industry,
        x: xs, y: ys, z: zs, size: 3,
      });
      links.push({ source: mid, target: sid, type: "rung" });
    });
  });

  return { nodes, links };
}
