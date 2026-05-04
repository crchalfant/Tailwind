import cache from "./cache";
import { getKeywords } from "./keyword-map";
import { NewsResponse, Sentiment, NewsArticle } from "@/types";

const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const TIMEOUT_MS = 10_000;
const MARKETAUX_BASE = "https://api.marketaux.com/v1/news/all";

function clampScore(score: number): number {
  return Math.max(-1.0, Math.min(1.0, score));
}

function getSentiment(score: number): Sentiment {
  if (score >= 0.15) return "tailwind";
  if (score <= -0.15) return "headwind";
  return "crosswind";
}

interface MarketauxArticle {
  title?: string;
  url?: string;
  source?: string;
  published_at?: string;
  entities?: Array<{ sentiment_score?: number }>;
}

function getArticleSentimentScore(item: MarketauxArticle): number {
  if (item.entities && item.entities.length > 0) {
    const scores = item.entities
      .map((e) => e.sentiment_score)
      .filter((s): s is number => typeof s === "number");
    if (scores.length > 0) {
      return scores.reduce((a, b) => a + b, 0) / scores.length;
    }
  }
  return 0;
}

function parseArticles(data: MarketauxArticle[]): NewsArticle[] {
  return data
    .map((item) => {
      const score = clampScore(getArticleSentimentScore(item));
      const source = item.source ?? "Unknown";
      return {
        title: item.title ?? "",
        url: item.url ?? "#",
        source: source.toLowerCase() === "marketaux" ? "News" : source,
        publishedAt: item.published_at ?? new Date().toISOString(),
        sentiment: getSentiment(score),
        score,
      };
    })
    .filter((a) => a.title && a.url !== "#");
}

function daysAgoISO(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function queryMarketaux(
  apiKey: string,
  keywordString: string,
  publishedAfter: string,
  signal: AbortSignal
): Promise<MarketauxArticle[]> {
  const params = new URLSearchParams({
    api_token: apiKey,
    search: keywordString,
    limit: "5",
    language: "en",
    sort: "published_at",
    published_after: publishedAfter,
  });
  const res = await fetch(`${MARKETAUX_BASE}?${params}`, { signal });
  if (!res.ok) return [];
  const json = await res.json();
  return Array.isArray(json.data) ? json.data : [];
}

export async function fetchNews(sectorName: string): Promise<NewsResponse> {
  const apiKey = process.env.MARKETAUX_API_KEY;
  if (!apiKey) {
    console.warn("[news-service] MARKETAUX_API_KEY is not set");
    return makeError("no-key");
  }

  const keywords = getKeywords(sectorName);
  if (!keywords) {
    return { articles: [], count: 0, limited: false, cached: false, updatedAt: new Date().toISOString() };
  }

  const keywordString = keywords.join(" | ");
  const cacheKey = `news:${keywordString}`;

  const cached = cache.get<NewsResponse>(cacheKey);
  if (cached) return { ...cached, cached: true };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // Try last 7 days first for freshness
    let raw = await queryMarketaux(apiKey, keywordString, daysAgoISO(7), controller.signal);

    // Fall back to 30 days if not enough results
    if (raw.length < 3) {
      raw = await queryMarketaux(apiKey, keywordString, daysAgoISO(30), controller.signal);
    }

    clearTimeout(timer);

    const articles = parseArticles(raw);
    const result: NewsResponse = {
      articles,
      count: articles.length,
      limited: articles.length < 3, // reflects final article count after any fallback
      cached: false,
      updatedAt: new Date().toISOString(),
    };

    cache.set(cacheKey, result, CACHE_TTL);
    return result;

  } catch {
    clearTimeout(timer);
    const fallback = cache.get<NewsResponse>(cacheKey);
    if (fallback) return { ...fallback, cached: true };
    return makeError("unavailable");
  }
}

function makeError(error: NewsResponse["error"]): NewsResponse {
  return {
    articles: [],
    count: 0,
    limited: false,
    cached: false,
    updatedAt: new Date().toISOString(),
    error,
  };
}
