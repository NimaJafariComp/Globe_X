export type GeoPoint = {
  lat: number;
  lng: number;
  label?: string;
};

export type Company = {
  id: string;
  name: string;
  logoUrl?: string;
  headquarters?: GeoPoint;
};

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

export type SourceNode = {
  id: string;
  name: string;
  url?: string;
  modality: Modality;
  description?: string;
  industry?: string;
  location?: GeoPoint;
  companyId?: string;
};

export type SourceDataset = {
  company: Company;
  sources: SourceNode[];
};

export type GlobeLocationCluster = {
  id: string;
  location: GeoPoint;
  sources: SourceNode[];
  modalities: Modality[];
  count: number;
};

export type SourceToClusterMap = Record<string, string>;

export type DnaGraphNode = {
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

export type DnaGraphLink = {
  source: string;
  target: string;
  type: "strand" | "rung" | "root";
};

export type ScreenAnchor = {
  id: string;
  x: number;
  y: number;
  visible: boolean;
};

export type DnaAnchorMap = Record<string, ScreenAnchor>;
export type GlobeClusterAnchorMap = Record<string, ScreenAnchor>;
