import type { GlobeLocationCluster, SourceDataset, SourceToClusterMap } from "@/types/sourceGraph";
import { getSourceLocation } from "./locationFallback";

function clusterIdFor(label: string, lat: number, lng: number) {
  const normalized = label
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "");
  return `${normalized || "location"}-${lat.toFixed(3)}-${lng.toFixed(3)}`;
}

export function buildLocationClusters(dataset: SourceDataset): {
  clusters: GlobeLocationCluster[];
  sourceToCluster: SourceToClusterMap;
} {
  const byKey = new Map<string, GlobeLocationCluster>();
  const sourceToCluster: SourceToClusterMap = {};

  for (const source of dataset.sources) {
    const location = getSourceLocation(source, dataset.company);
    const roundedLat = Number(location.lat.toFixed(3));
    const roundedLng = Number(location.lng.toFixed(3));
    const label = location.label ?? `${roundedLat}, ${roundedLng}`;
    const key = `${label.toLowerCase()}|${roundedLat.toFixed(3)}|${roundedLng.toFixed(3)}`;
    const id = clusterIdFor(label, roundedLat, roundedLng);

    let cluster = byKey.get(key);
    if (!cluster) {
      cluster = {
        id,
        location: { lat: roundedLat, lng: roundedLng, label },
        sources: [],
        modalities: [],
        count: 0,
      };
      byKey.set(key, cluster);
    }

    cluster.sources.push(source);
    cluster.count = cluster.sources.length;
    if (!cluster.modalities.includes(source.modality)) {
      cluster.modalities.push(source.modality);
    }
    sourceToCluster[source.id] = cluster.id;
  }

  const clusters = [...byKey.values()]
    .map((cluster) => ({
      ...cluster,
      sources: cluster.sources.toSorted((a, b) => a.name.localeCompare(b.name)),
      modalities: cluster.modalities.toSorted(),
    }))
    .toSorted((a, b) => a.id.localeCompare(b.id));

  return { clusters, sourceToCluster };
}
