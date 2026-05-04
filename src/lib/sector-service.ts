import cache from "./cache";
import { getSectorETFInfo, ALL_SECTOR_ETFS } from "./sector-map";
import { SectorPerformanceResponse, Direction } from "@/types";

const CACHE_KEY = "sector-performance-raw";
const CACHE_TTL = 60 * 60 * 1000; // 60 minutes
const TIMEOUT_MS = 10_000;
const YAHOO_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; Tailwind/1.0)" };

interface RawSectorData {
  etfChanges: Record<string, number>; // ticker -> last trading day % change
  allValues: number[];
  marketBenchmark: number;
  lastTradingDate: string; // e.g. "Apr 25"
  fetchedAt: string;
}

type FetchRawResult =
  | { status: "ok"; data: RawSectorData }
  | { status: "error" };

function calcDirection(sectorPerf: number, benchmark: number): Direction {
  const diff = sectorPerf - benchmark;
  if (diff >= 1.0) return "tailwind";
  if (diff <= -1.0) return "headwind";
  return "crosswind";
}

async function fetchETFChange(ticker: string, signal: AbortSignal): Promise<{ change: number; lastDate: string } | null> {
  try {
    const res = await fetch(`${YAHOO_BASE}/${ticker}?interval=1d&range=5d`, { signal, headers: HEADERS });
    if (!res.ok) return null;
    const json = await res.json();
    const closes: number[] = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
    const timestamps: number[] = json?.chart?.result?.[0]?.timestamp ?? [];

    if (closes.length < 2) return null;

    const lastClose = closes[closes.length - 1];
    const prevClose = closes[closes.length - 2];
    if (!lastClose || !prevClose) return null;

    const change = parseFloat((((lastClose - prevClose) / prevClose) * 100).toFixed(2));

    // Format the last trading day date from the Unix timestamp
    const lastTimestamp = timestamps[timestamps.length - 1];
    const lastDate = lastTimestamp
      ? new Date(lastTimestamp * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" })
      : "";

    return { change, lastDate };
  } catch {
    return null;
  }
}

async function fetchRawData(): Promise<FetchRawResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const results = await Promise.all(
      ALL_SECTOR_ETFS.map((ticker) => fetchETFChange(ticker, controller.signal))
    );
    clearTimeout(timer);

    const etfChanges: Record<string, number> = {};
    const allValues: number[] = [];
    let lastTradingDate = "";

    ALL_SECTOR_ETFS.forEach((ticker, i) => {
      const val = results[i];
      if (val !== null) {
        etfChanges[ticker] = val.change;
        allValues.push(val.change);
        if (!lastTradingDate && val.lastDate) lastTradingDate = val.lastDate;
      }
    });

    if (allValues.length === 0) {
      console.error("[sector-service] No ETF data returned from Yahoo Finance");
      return { status: "error" };
    }

    const marketBenchmark = allValues.reduce((a, b) => a + b, 0) / allValues.length;

    return {
      status: "ok",
      data: {
        etfChanges,
        allValues,
        marketBenchmark: parseFloat(marketBenchmark.toFixed(2)),
        lastTradingDate,
        fetchedAt: new Date().toISOString(),
      },
    };
  } catch {
    clearTimeout(timer);
    console.error("[sector-service] Fetch failed or timed out");
    return { status: "error" };
  }
}

export async function fetchSectorPerformance(sectorName: string): Promise<SectorPerformanceResponse> {
  const etfInfo = getSectorETFInfo(sectorName);
  if (!etfInfo) {
    return makeError(sectorName, "unmapped");
  }

  const cachedRaw = cache.get<RawSectorData>(CACHE_KEY);
  if (cachedRaw) {
    return buildResponse(sectorName, etfInfo.ticker, etfInfo.fundName, cachedRaw, true);
  }

  const result = await fetchRawData();
  if (result.status === "error") {
    return makeError(sectorName, "unavailable");
  }

  cache.set(CACHE_KEY, result.data, CACHE_TTL);
  return buildResponse(sectorName, etfInfo.ticker, etfInfo.fundName, result.data, false);
}

function buildResponse(
  sectorName: string,
  ticker: string,
  fundName: string,
  raw: RawSectorData,
  cached: boolean
): SectorPerformanceResponse {
  const sectorPerf = raw.etfChanges[ticker];
  if (sectorPerf === undefined) {
    console.error(`[sector-service] ETF "${ticker}" not found in fetched data`);
    return makeError(sectorName, "unavailable");
  }
  return {
    sectorName,
    sectorPerformance: sectorPerf,
    marketBenchmark: raw.marketBenchmark,
    allSectorValues: raw.allValues,
    direction: calcDirection(sectorPerf, raw.marketBenchmark),
    fundName: `${fundName} (${ticker})`,
    lastTradingDate: raw.lastTradingDate,
    cached,
    updatedAt: raw.fetchedAt,
  };
}

function makeError(sectorName: string, error: SectorPerformanceResponse["error"]): SectorPerformanceResponse {
  return {
    sectorName,
    sectorPerformance: 0,
    marketBenchmark: 0,
    allSectorValues: [],
    direction: "crosswind",
    cached: false,
    updatedAt: new Date().toISOString(),
    error,
  };
}
