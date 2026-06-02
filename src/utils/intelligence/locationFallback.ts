import type { Company, GeoPoint, SourceNode } from "@/types/sourceGraph";

export const DEFAULT_COMPANY_HQ: GeoPoint = {
  lat: 37.4419,
  lng: -122.143,
  label: "Palo Alto",
};

export function getSourceLocation(source: SourceNode, company: Company): GeoPoint {
  return source.location ?? company.headquarters ?? DEFAULT_COMPANY_HQ;
}
