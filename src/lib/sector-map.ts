import { SectorName } from "@/types";

export interface SectorETFInfo {
  ticker: string;
  fundName: string; // Full SPDR ETF name shown to the user
}

// Maps Tailwind display sector names to SPDR sector ETF info.
// Data sourced from Yahoo Finance chart API — no API key required.
export const SECTOR_ETF_MAP: Record<SectorName, SectorETFInfo> = {
  "Trades and Construction": { ticker: "XLI",  fundName: "Industrial Select Sector SPDR Fund" },
  "Retail":                  { ticker: "XLY",  fundName: "Consumer Discretionary Select Sector SPDR Fund" },
  "Restaurants and Food Service": { ticker: "XLP", fundName: "Consumer Staples Select Sector SPDR Fund" },
  "Healthcare and Wellness": { ticker: "XLV",  fundName: "Health Care Select Sector SPDR Fund" },
  "Real Estate":             { ticker: "XLRE", fundName: "Real Estate Select Sector SPDR Fund" },
  "Financial Services":      { ticker: "XLF",  fundName: "Financial Select Sector SPDR Fund" },
  "Energy and Utilities":    { ticker: "XLE",  fundName: "Energy Select Sector SPDR Fund" },
  "Tech and Software":       { ticker: "XLK",  fundName: "Technology Select Sector SPDR Fund" },
};

// All 11 sector ETFs used to calculate the market benchmark
export const ALL_SECTOR_ETFS = ["XLK", "XLF", "XLE", "XLV", "XLI", "XLP", "XLY", "XLRE", "XLU", "XLB", "XLC"];

export function getSectorETFInfo(sectorName: string): SectorETFInfo | null {
  return SECTOR_ETF_MAP[sectorName as SectorName] ?? null;
}
