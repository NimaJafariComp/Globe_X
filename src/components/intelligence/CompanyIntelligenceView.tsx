"use client";

import { useEffect, useMemo, useState } from "react";
import type { GlobeClusterAnchorMap, Modality, SourceDataset } from "@/types/sourceGraph";
import { buildLocationClusters } from "@/utils/intelligence/buildLocationClusters";
import { searchSources } from "@/utils/intelligence/searchSources";
import { GlobeSourceMap } from "./GlobeSourceMap";
import styles from "./CompanyIntelligenceView.module.css";

export function CompanyIntelligenceView({
  dataset,
}: {
  dataset: SourceDataset;
}) {
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  const [activeClusterId, setActiveClusterId] = useState<string | null>(null);
  const [selectedModality, setSelectedModality] = useState<Modality | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [, setGlobeClusterAnchors] = useState<GlobeClusterAnchorMap>({});
  const [webGpuAvailable, setWebGpuAvailable] = useState(false);

  useEffect(() => {
    setWebGpuAvailable(
      typeof navigator !== "undefined" &&
        "gpu" in navigator &&
        Boolean((navigator as Navigator & { gpu?: unknown }).gpu),
    );
  }, []);

  const { clusters, sourceToCluster } = useMemo(
    () => buildLocationClusters(dataset),
    [dataset],
  );
  const matchingSourceIds = useMemo(
    () => searchSources(dataset, searchQuery),
    [dataset, searchQuery],
  );

  return (
    <main className={styles.view}>
      <header className={styles.topbar}>
        <div>
          <div className={styles.companyName}>{dataset.company.name}</div>
          <div className={styles.meta}>
            {dataset.sources.length} sources / {clusters.length} locations /{" "}
            {webGpuAvailable ? "WebGPU available" : "WebGL baseline"}
          </div>
        </div>
        <input
          className={styles.search}
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search sources, modalities, industries..."
        />
        <button
          className={styles.clearButton}
          onClick={() => {
            setSelectedModality(null);
            setSearchQuery("");
            setActiveSourceId(null);
            setActiveClusterId(null);
          }}
        >
          Clear
        </button>
      </header>

      <section className={styles.workspace}>
        <section className={styles.panel}>
          <GlobeSourceMap
            dataset={dataset}
            clusters={clusters}
            sourceToCluster={sourceToCluster}
            activeSourceId={activeSourceId}
            activeClusterId={activeClusterId}
            selectedModality={selectedModality}
            matchingSourceIds={matchingSourceIds}
            searchActive={searchQuery.trim().length > 0}
            onActiveClusterId={setActiveClusterId}
            onActiveSourceId={setActiveSourceId}
            onAnchors={setGlobeClusterAnchors}
          />
        </section>
      </section>
    </main>
  );
}
