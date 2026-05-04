export type SectorName =
  | "Trades and Construction"
  | "Retail"
  | "Restaurants and Food Service"
  | "Healthcare and Wellness"
  | "Real Estate"
  | "Financial Services"
  | "Energy and Utilities"
  | "Tech and Software";

export type Direction = "tailwind" | "crosswind" | "headwind";
export type Sentiment = "tailwind" | "crosswind" | "headwind";

export interface SectorPerformanceResponse {
  sectorName: string;
  sectorPerformance: number;
  marketBenchmark: number;
  allSectorValues: number[];
  direction: Direction;
  cached: boolean;
  updatedAt: string;
  fundName?: string;
  lastTradingDate?: string; // e.g. "Apr 25"
  error?: "unavailable" | "unmapped";
}

export interface NewsArticle {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  sentiment: Sentiment;
  score: number;
}

export interface NewsResponse {
  articles: NewsArticle[];
  count: number;
  limited: boolean;
  cached: boolean;
  updatedAt: string;
  error?: "no-key" | "unavailable";
}

export interface SummaryResponse {
  summary: string;
  cached: boolean;
  personalized: boolean;
  updatedAt: string;
  error?: "unavailable" | "no-data" | "no-key";
}
