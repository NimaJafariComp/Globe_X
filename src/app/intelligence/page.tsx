import { CompanyIntelligenceView } from "@/components/intelligence/CompanyIntelligenceView";
import { sampleSourceDataset } from "@/data/sampleSourceDataset";

export default function IntelligencePage() {
  return <CompanyIntelligenceView dataset={sampleSourceDataset} />;
}
