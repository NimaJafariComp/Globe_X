"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  DnaAnchorMap,
  GlobeClusterAnchorMap,
  Modality,
  SourceNode,
  SourceToClusterMap,
} from "@/types/sourceGraph";
import styles from "./CompanyIntelligenceView.module.css";

type LinkDatum = {
  id: string;
  d: string;
  active: boolean;
};

export function CrossPanelLinks({
  dnaAnchors,
  globeClusterAnchors,
  sourceToCluster,
  sources,
  activeSourceId,
  activeClusterId,
  selectedModality,
  matchingSourceIds,
  searchActive,
}: {
  dnaAnchors: DnaAnchorMap;
  globeClusterAnchors: GlobeClusterAnchorMap;
  sourceToCluster: SourceToClusterMap;
  sources: SourceNode[];
  activeSourceId: string | null;
  activeClusterId: string | null;
  selectedModality: Modality | null;
  matchingSourceIds: Set<string>;
  searchActive: boolean;
}) {
  const ref = useRef<SVGSVGElement | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const update = () => setRect(ref.current?.getBoundingClientRect() ?? null);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const links = useMemo<LinkDatum[]>(() => {
    if (!rect) return [];
    const visibleSources = sources.filter((source) => {
      const clusterId = sourceToCluster[source.id];
      if (activeSourceId) return source.id === activeSourceId;
      if (activeClusterId) return clusterId === activeClusterId;
      if (selectedModality) return source.modality === selectedModality;
      if (searchActive) return matchingSourceIds.has(source.id);
      return false;
    });

    return visibleSources.flatMap((source) => {
      const clusterId = sourceToCluster[source.id];
      const a = dnaAnchors[source.id];
      const b = globeClusterAnchors[clusterId];
      if (!a?.visible || !b?.visible) return [];
      const ax = a.x - rect.left;
      const ay = a.y - rect.top;
      const bx = b.x - rect.left;
      const by = b.y - rect.top;
      const midX = (ax + bx) / 2;
      return {
        id: source.id,
        d: `M ${ax} ${ay} C ${midX} ${ay}, ${midX} ${by}, ${bx} ${by}`,
        active: source.id === activeSourceId || clusterId === activeClusterId,
      };
    });
  }, [
    activeClusterId,
    activeSourceId,
    dnaAnchors,
    globeClusterAnchors,
    matchingSourceIds,
    rect,
    searchActive,
    selectedModality,
    sourceToCluster,
    sources,
  ]);

  return (
    <svg ref={ref} className={styles.links}>
      {links.map((link) => (
        <g key={link.id}>
          <path
            className={`${styles.path} ${link.active ? styles.pathActive : ""}`}
            d={link.d}
          />
          {link.active ? (
            <circle r="3.2" className={styles.pulse}>
              <animateMotion dur="1.4s" repeatCount="indefinite" path={link.d} />
            </circle>
          ) : null}
        </g>
      ))}
    </svg>
  );
}
