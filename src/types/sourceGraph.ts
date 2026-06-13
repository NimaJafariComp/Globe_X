export interface GeoPoint {
  lat: number;
  lng: number;
  label?: string;
}

export interface Company {
  id: string;
  name: string;
  logoUrl?: string;
  headquarters?: GeoPoint;
}

export type Modality =
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

export interface SourceNode {
  id: string;
  name: string;
  url?: string;
  modality: Modality;
  description?: string;
  industry?: string;
  location?: GeoPoint;
  companyId?: string;
}

export interface SourceDataset {
  company: Company;
  sources: SourceNode[];
}

export interface GlobeLocationCluster {
  id: string;
  location: GeoPoint;
  sources: SourceNode[];
  modalities: Modality[];
  count: number;
}

export type SourceToClusterMap = Record<string, string>;

export interface ScreenAnchor {
  id: string;
  x: number;
  y: number;
  visible: boolean;
}

export type GlobeClusterAnchorMap = Record<string, ScreenAnchor>;
