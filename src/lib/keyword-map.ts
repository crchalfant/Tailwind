import { SectorName } from "@/types";

export const KEYWORD_MAP: Record<SectorName, string[]> = {
  "Trades and Construction": ["construction industry", "homebuilding", "contractors", "building permits"],
  "Retail": ["retail sales", "consumer spending", "retail industry", "e-commerce"],
  "Restaurants and Food Service": ["restaurant industry", "food service", "hospitality", "dining"],
  "Healthcare and Wellness": ["healthcare industry", "medical services", "wellness", "health spending"],
  "Real Estate": ["real estate market", "housing market", "commercial real estate", "mortgage rates"],
  "Financial Services": ["financial services", "banking industry", "lending", "interest rates"],
  "Energy and Utilities": ["energy sector", "oil and gas", "utilities", "renewable energy"],
  "Tech and Software": ["technology industry", "software", "SaaS", "tech sector"],
};

export function getKeywords(sectorName: string): string[] | null {
  return KEYWORD_MAP[sectorName as SectorName] ?? null;
}
