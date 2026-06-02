"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type {
  DnaAnchorMap,
  DnaGraphNode,
  Modality,
  SourceDataset,
  SourceToClusterMap,
} from "@/types/sourceGraph";
import { buildKnowledgeDnaGraph } from "@/utils/intelligence/buildKnowledgeDnaGraph";
import { worldToScreen } from "@/utils/intelligence/worldToScreen";
import styles from "./CompanyIntelligenceView.module.css";

// ── Per-modality colour hues ──────────────────────────────────────────────────
const MOD_HUE: Record<Modality, number> = {
  ai_llm: 178, news: 210, market: 192, finance: 268,
  deals: 152, patents: 200, publications: 224,
  academic: 160, jobs: 28, clinical: 188, entity: 292,
};
const DIM_COL = new THREE.Color("#060e16");
const ACT_COL = new THREE.Color("#ffffff");

function baseColor(node: DnaGraphNode): THREE.Color {
  if (node.type === "root") return new THREE.Color().setHSL(0.5, 0.85, 0.72);
  const h = node.modality ? (MOD_HUE[node.modality] ?? 200) / 360 : 0.56;
  const s = node.type === "modality" ? 0.72 : 0.52;
  const l = node.type === "modality" ? 0.62 : 0.50;
  return new THREE.Color().setHSL(h, s, l);
}

// ── Soft glow sprite texture ──────────────────────────────────────────────────
function makeGlowTex(): THREE.CanvasTexture {
  const sz = 128;
  const c  = document.createElement("canvas");
  c.width  = c.height = sz;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(sz / 2, sz / 2, 0, sz / 2, sz / 2, sz / 2);
  g.addColorStop(0,    "rgba(255,255,255,1.0)");
  g.addColorStop(0.18, "rgba(255,255,255,0.82)");
  g.addColorStop(0.48, "rgba(255,255,255,0.24)");
  g.addColorStop(1,    "rgba(255,255,255,0.0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, sz, sz);
  return new THREE.CanvasTexture(c);
}

// ── Per-node drift params ─────────────────────────────────────────────────────
function makeDrift(node: DnaGraphNode) {
  const amp = node.type === "root" ? 0.4 : node.type === "modality" ? 1.2 : 2.0;
  return {
    amp,
    sx: 0.14 + Math.random() * 0.16,
    sy: 0.10 + Math.random() * 0.12,
    sz: 0.08 + Math.random() * 0.10,
    px: Math.random() * Math.PI * 2,
    py: Math.random() * Math.PI * 2,
    pz: Math.random() * Math.PI * 2,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
export function KnowledgeDnaGraph({
  dataset,
  sourceToCluster,
  activeSourceId,
  activeClusterId,
  selectedModality,
  matchingSourceIds,
  searchActive,
  onActiveSourceId,
  onSelectedModality,
  onAnchors,
}: {
  dataset: SourceDataset;
  sourceToCluster: SourceToClusterMap;
  activeSourceId: string | null;
  activeClusterId: string | null;
  selectedModality: Modality | null;
  matchingSourceIds: Set<string>;
  searchActive: boolean;
  onActiveSourceId: (id: string | null) => void;
  onSelectedModality: (m: Modality | null) => void;
  onAnchors: (a: DnaAnchorMap) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const latest = useRef({
    activeSourceId, activeClusterId, sourceToCluster,
    selectedModality, matchingSourceIds, searchActive,
  });
  const [tooltip, setTooltip]     = useState<{ x: number; y: number; text: string } | null>(null);
  const [rootScreen, setRootScreen] = useState<{ x: number; y: number } | null>(null);
  const graph = useMemo(() => buildKnowledgeDnaGraph(dataset), [dataset]);

  useEffect(() => {
    latest.current = {
      activeSourceId, activeClusterId, sourceToCluster,
      selectedModality, matchingSourceIds, searchActive,
    };
  }, [activeSourceId, activeClusterId, sourceToCluster, selectedModality, matchingSourceIds, searchActive]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ── Scene / renderer ───────────────────────────────────────────────────
    const scene    = new THREE.Scene();
    scene.background = new THREE.Color("#040810");
    const camera   = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
    camera.position.set(0, 0, 400);
    camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // ── Group (slight tilt to reveal z-depth) ─────────────────────────────
    const group = new THREE.Group();
    group.rotation.x = -0.14;
    scene.add(group);

    // ── Camera bounds from node extents ───────────────────────────────────
    const xs  = graph.nodes.map(n => n.x);
    const ys  = graph.nodes.map(n => n.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const cxD  = (minX + maxX) / 2;
    const cyD  = (minY + maxY) / 2;
    const extX = (maxX - minX) / 2 + 18;
    const extY = (maxY - minY) / 2 + 18;

    const nodeById   = new Map(graph.nodes.map(n => [n.id, n]));
    const baseColors = new Map(graph.nodes.map(n => [n.id, baseColor(n)]));
    const glowTex    = makeGlowTex();

    // ── Sprites ────────────────────────────────────────────────────────────
    const sprites = new Map<string, THREE.Sprite>();
    for (const node of graph.nodes) {
      const mat = new THREE.SpriteMaterial({
        map: glowTex,
        color: baseColors.get(node.id)!.clone(),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: node.type === "root" ? 1 : node.type === "modality" ? 0.88 : 0.65,
      });
      const sp = new THREE.Sprite(mat);
      const sc = node.type === "root" ? 20 : node.type === "modality" ? 10 : 4.5;
      sp.scale.setScalar(sc);
      sp.position.set(node.x, node.y, node.z);
      sp.userData.node = node;
      group.add(sp);
      sprites.set(node.id, sp);
    }

    // ── Links — dynamic positions follow drifting sprites ─────────────────
    const linkCount  = graph.links.length;
    const linkPosArr = new Float32Array(linkCount * 6);
    const linkColArr = new Float32Array(linkCount * 6);
    const linkGeo    = new THREE.BufferGeometry();
    const linkPosBuf = new THREE.BufferAttribute(linkPosArr, 3).setUsage(THREE.DynamicDrawUsage);
    const linkColBuf = new THREE.BufferAttribute(linkColArr, 3).setUsage(THREE.DynamicDrawUsage);
    linkGeo.setAttribute("position", linkPosBuf);
    linkGeo.setAttribute("color",    linkColBuf);
    const linkMat = new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true,
      opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    group.add(new THREE.LineSegments(linkGeo, linkMat));

    // Bake link colours once
    for (let i = 0; i < graph.links.length; i++) {
      const lk    = graph.links[i]!;
      const ca    = baseColors.get(lk.source) ?? baseColors.get(lk.target) ?? new THREE.Color("#4488aa");
      const alpha = lk.type === "root" ? 0.55 : lk.type === "rung" ? 0.45 : 0.22;
      const bi    = i * 6;
      linkColArr[bi]     = ca.r * alpha;       linkColArr[bi + 1] = ca.g * alpha;       linkColArr[bi + 2] = ca.b * alpha;
      linkColArr[bi + 3] = ca.r * alpha * 0.5; linkColArr[bi + 4] = ca.g * alpha * 0.5; linkColArr[bi + 5] = ca.b * alpha * 0.5;
    }
    linkColBuf.needsUpdate = true;

    // ── Per-node drift ────────────────────────────────────────────────────
    const drifts = new Map(graph.nodes.map(n => [n.id, makeDrift(n)]));

    // ── Interaction ───────────────────────────────────────────────────────
    const pointer = new THREE.Vector2(10, 10);
    let hovered: DnaGraphNode | null = null;
    let frame = 0;
    let disposed = false;
    let lastAnchors: DnaAnchorMap = {};

    const handlePointerMove = (e: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      pointer.x =  ((e.clientX - r.left) / r.width)  * 2 - 1;
      pointer.y = -((e.clientY - r.top)  / r.height) * 2 + 1;
    };
    const handlePointerLeave = () => {
      pointer.set(10, 10); hovered = null;
      setTooltip(null); onActiveSourceId(null);
    };
    const handleClick = () => {
      if (!hovered) return;
      if (hovered.type === "source" && hovered.url)
        window.open(hovered.url, "_blank", "noopener,noreferrer");
      if (hovered.type === "modality" && hovered.modality)
        onSelectedModality(
          latest.current.selectedModality === hovered.modality ? null : hovered.modality,
        );
    };
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerleave", handlePointerLeave);
    renderer.domElement.addEventListener("click", handleClick);

    // ── Resize ────────────────────────────────────────────────────────────
    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      renderer.setSize(width, height, false);
      const aspect = width / Math.max(height, 1);
      const margin = 1.18;
      const cx = extX * margin, cy = extY * margin;
      if (cx / aspect >= cy) {
        camera.left   = cxD - cx;        camera.right  = cxD + cx;
        camera.top    = cyD + cx / aspect; camera.bottom = cyD - cx / aspect;
      } else {
        camera.left   = cxD - cy * aspect; camera.right  = cxD + cy * aspect;
        camera.top    = cyD + cy;           camera.bottom = cyD - cy;
      }
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", resize);
    resize();

    // ── Animate ───────────────────────────────────────────────────────────
    const animate = () => {
      if (disposed) return;
      frame++;
      const t = performance.now() * 0.001;

      // Gentle sway
      group.rotation.y = Math.sin(t * 0.10) * 0.12;

      // Drift sprites with independent sine waves per axis
      for (const [id, sp] of sprites) {
        const n = nodeById.get(id)!;
        const d = drifts.get(id)!;
        sp.position.set(
          n.x + Math.sin(t * d.sx + d.px) * d.amp,
          n.y + Math.sin(t * d.sy + d.py) * d.amp * 0.55,
          n.z + Math.sin(t * d.sz + d.pz) * d.amp * 0.4,
        );
      }

      // Update link positions to follow drifted sprites
      for (let i = 0; i < graph.links.length; i++) {
        const lk = graph.links[i]!;
        const sa = sprites.get(lk.source), sb = sprites.get(lk.target);
        if (!sa || !sb) continue;
        const bi = i * 6;
        linkPosArr[bi]     = sa.position.x; linkPosArr[bi + 1] = sa.position.y; linkPosArr[bi + 2] = sa.position.z;
        linkPosArr[bi + 3] = sb.position.x; linkPosArr[bi + 4] = sb.position.y; linkPosArr[bi + 5] = sb.position.z;
      }
      linkPosBuf.needsUpdate = true;

      // Screen-space hover
      scene.updateMatrixWorld();
      const dr  = renderer.domElement.getBoundingClientRect();
      const pxX = dr.left + ((pointer.x + 1) * dr.width)  / 2;
      const pxY = dr.top  + ((-pointer.y + 1) * dr.height) / 2;
      let nextHov: DnaGraphNode | null = null;
      let bestSq = 34 * 34;

      for (const [, sp] of sprites) {
        const wp = new THREE.Vector3();
        sp.getWorldPosition(wp);
        const sc = worldToScreen(wp, camera, renderer);
        if (!sc.visible) continue;
        const dx = sc.x - pxX, dy = sc.y - pxY;
        const sq = dx * dx + dy * dy;
        if (sq < bestSq) { bestSq = sq; nextHov = sp.userData.node as DnaGraphNode; }
      }

      if (nextHov !== hovered) {
        hovered = nextHov;
        if (hovered) {
          setTooltip({ x: pxX, y: pxY, text: hovered.name });
          onActiveSourceId(hovered.sourceId ?? null);
        } else {
          setTooltip(null); onActiveSourceId(null);
        }
      } else if (hovered) {
        setTooltip(c => c ? { ...c, x: pxX, y: pxY } : c);
      }

      // Sprite colour / scale
      for (const [id, sp] of sprites) {
        const node = nodeById.get(id)!;
        const st   = latest.current;
        const mat  = sp.material as THREE.SpriteMaterial;

        const isActive =
          hovered?.id === node.id ||
          node.sourceId === st.activeSourceId ||
          (node.sourceId && st.activeClusterId &&
            st.sourceToCluster[node.sourceId] === st.activeClusterId) ||
          (st.selectedModality && node.modality === st.selectedModality) ||
          (node.sourceId && st.searchActive && st.matchingSourceIds.has(node.sourceId));

        const isDim =
          (st.searchActive && node.sourceId && !st.matchingSourceIds.has(node.sourceId)) ||
          (st.selectedModality && node.modality && node.modality !== st.selectedModality);

        mat.color.lerp(isActive ? ACT_COL : isDim ? DIM_COL : baseColors.get(id)!, 0.18);
        mat.opacity = isActive ? 1 : isDim ? 0.1
          : node.type === "root" ? 1 : node.type === "modality" ? 0.88 : 0.65;

        const baseScale = node.type === "root" ? 20 : node.type === "modality" ? 10 : 4.5;
        const pulse     = isActive ? 1 + Math.sin(t * 3.8) * 0.13 : 1;
        sp.scale.setScalar(baseScale * pulse);
      }

      // Root label position (every 3 frames)
      if (frame % 3 === 0) {
        const rootNode = graph.nodes.find(n => n.type === "root");
        if (rootNode) {
          const sp = sprites.get(rootNode.id);
          if (sp) {
            const wp = new THREE.Vector3();
            sp.getWorldPosition(wp);
            const sc = worldToScreen(wp, camera, renderer);
            setRootScreen(sc.visible ? { x: sc.x, y: sc.y } : null);
          }
        }
      }

      // Anchors (every 4 frames)
      if (frame % 4 === 0) {
        const anchors: DnaAnchorMap = {};
        for (const node of graph.nodes) {
          if (!node.sourceId) continue;
          const sp = sprites.get(node.id);
          if (!sp) continue;
          const wp = new THREE.Vector3();
          sp.getWorldPosition(wp);
          anchors[node.sourceId] = { id: node.sourceId, ...worldToScreen(wp, camera, renderer) };
        }
        if (anchorsChanged(lastAnchors, anchors)) {
          lastAnchors = anchors; onAnchors(anchors);
        }
      }

      renderer.render(scene, camera);
    };

    renderer.setAnimationLoop(animate);

    return () => {
      disposed = true;
      renderer.setAnimationLoop(null);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerleave", handlePointerLeave);
      renderer.domElement.removeEventListener("click", handleClick);
      window.removeEventListener("resize", resize);
      glowTex.dispose();
      linkGeo.dispose();
      linkMat.dispose();
      sprites.forEach(s => (s.material as THREE.SpriteMaterial).dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [dataset, graph, onActiveSourceId, onAnchors, onSelectedModality]);

  return (
    <div ref={containerRef} className={styles.canvasHost}>
      {rootScreen ? (
        <div className={styles.rootLabel} style={{ left: rootScreen.x, top: rootScreen.y }}>
          {dataset.company.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dataset.company.logoUrl}
              alt={dataset.company.name}
              className={styles.rootLogoImg}
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          ) : null}
          <span className={styles.rootLabelName}>{dataset.company.name}</span>
        </div>
      ) : null}

      {tooltip ? (
        <div className={styles.particleTooltip} style={{ left: tooltip.x + 14, top: tooltip.y - 8 }}>
          {tooltip.text}
        </div>
      ) : null}
    </div>
  );
}

function anchorsChanged(prev: DnaAnchorMap, next: DnaAnchorMap) {
  const pk = Object.keys(prev), nk = Object.keys(next);
  if (pk.length !== nk.length) return true;
  for (const k of nk) {
    const a = prev[k], b = next[k];
    if (!a || a.visible !== b!.visible) return true;
    if (Math.abs(a.x - b!.x) > 0.75 || Math.abs(a.y - b!.y) > 0.75) return true;
  }
  return false;
}
