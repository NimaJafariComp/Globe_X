import type { SourceDataset } from "@/types/sourceGraph";
import { getSourceLocation } from "./locationFallback";

export function searchSources(dataset: SourceDataset, query: string): Set<string> {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return new Set(dataset.sources.map((source) => source.id));

  const matches = new Set<string>();
  for (const source of dataset.sources) {
    const location = getSourceLocation(source, dataset.company);
    const haystack = [
      dataset.company.name,
      source.name,
      source.modality,
      source.industry,
      source.description,
      location.label,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (haystack.includes(normalized)) {
      matches.add(source.id);
    }
  }

  return matches;
}
