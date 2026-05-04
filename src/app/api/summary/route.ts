import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import cache from "@/lib/cache";
import { fetchSectorPerformance } from "@/lib/sector-service";
import { fetchNews } from "@/lib/news-service";
import { SummaryResponse } from "@/types";

const CACHE_TTL = 60 * 60 * 1000; // 60 minutes
const TIMEOUT_MS = 10_000;

const SYSTEM_PROMPT = `You are a plain-English economic briefing tool for small business owners.
Rules:
- Describe conditions; never prescribe actions or give financial advice.
- Use plain, everyday language. Write like a knowledgeable friend, not a financial advisor.
- No buzzwords, jargon, acronyms, or financial terminology. If a term needs explaining, use simpler words instead.
- Do not reference data sources by name.
- Do not use the phrase "based on the data provided".
- Keep your response to 3–5 sentences.
- If signals are mixed, say so honestly rather than manufacturing a clear verdict.
- Speak directly to a small business owner. Reference the sector by name.
- Your reader is a small business owner who runs a local service business or trades operation — they don't read the Wall Street Journal and they don't follow financial markets. Write for them, not for a financial analyst.`;

function buildUserPrompt(
  sectorName: string,
  perfData: Awaited<ReturnType<typeof fetchSectorPerformance>> | null,
  newsData: Awaited<ReturnType<typeof fetchNews>> | null,
  customerName?: string,
  businessName?: string,
  businessType?: string
): string {
  const lines: string[] = [`Sector: ${sectorName}`, ""];

  if (perfData && !perfData.error) {
    const rel = perfData.sectorPerformance > perfData.marketBenchmark ? "above" : perfData.sectorPerformance < perfData.marketBenchmark ? "below" : "inline with";
    lines.push(`Performance: ${sectorName} is ${rel} the broader market today (${perfData.sectorPerformance}% vs market average ${perfData.marketBenchmark}%).`);
  } else {
    lines.push("No sector performance data available this session.");
  }

  lines.push("");

  if (newsData && !newsData.error && newsData.articles.length > 0) {
    const tailwinds = newsData.articles.filter((a) => a.sentiment === "tailwind").length;
    const headwinds = newsData.articles.filter((a) => a.sentiment === "headwind").length;
    const crosswinds = newsData.articles.filter((a) => a.sentiment === "crosswind").length;
    lines.push(`News sentiment: ${tailwinds} tailwind, ${crosswinds} crosswind, ${headwinds} headwind articles.`);
    lines.push("Headlines:");
    newsData.articles.forEach((a) => lines.push(`- "${a.title}" (${a.sentiment})`));
  } else {
    lines.push("No news data available for this sector this session.");
  }

  lines.push("");

  if (customerName) lines.push(`You are speaking directly to ${customerName}.`);
  if (businessName) lines.push(`Their business is called ${businessName}.`);
  if (businessType) lines.push(`They describe their work as: ${businessType}.`);

  lines.push(`Write a 3–5 sentence briefing for a small business owner in this sector.`);
  if (customerName) lines.push("Address them by first name in your opening sentence.");
  if (businessName) lines.push("Reference their business name naturally if it fits.");

  return lines.join("\n");
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const sector = searchParams.get("sector") ?? "";
  const customerName = searchParams.get("customerName") ?? undefined;
  const businessName = searchParams.get("businessName") ?? undefined;
  const businessType = searchParams.get("businessType") ?? undefined;

  if (!sector) {
    return NextResponse.json({ error: "missing-sector" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[summary-route] ANTHROPIC_API_KEY is not set");
    return NextResponse.json<SummaryResponse>({
      summary: "",
      cached: false,
      personalized: false,
      updatedAt: new Date().toISOString(),
      error: "no-key",
    });
  }

  const isPersonalized = !!(customerName || businessName || businessType);
  const cacheKey = `summary:${sector}`;

  // bust param from manual refresh — invalidate summary cache
  if (searchParams.get("bust") && !isPersonalized) {
    cache.invalidate(cacheKey);
  }

  // Check cache (only for non-personalized)
  if (!isPersonalized) {
    const cached = cache.get<SummaryResponse>(cacheKey);
    if (cached) return NextResponse.json({ ...cached, cached: true });
  }

  // Fetch upstream data
  const [perfResult, newsResult] = await Promise.allSettled([
    fetchSectorPerformance(sector),
    fetchNews(sector),
  ]);

  const perfData = perfResult.status === "fulfilled" && !perfResult.value.error ? perfResult.value : null;
  const newsData = newsResult.status === "fulfilled" && !newsResult.value.error ? newsResult.value : null;

  // Don't call Claude if both sources failed
  if (!perfData && !newsData) {
    const fallback = !isPersonalized ? cache.get<SummaryResponse>(cacheKey) : null;
    if (fallback) return NextResponse.json({ ...fallback, cached: true });
    return NextResponse.json<SummaryResponse>({
      summary: "",
      cached: false,
      personalized: isPersonalized,
      updatedAt: new Date().toISOString(),
      error: "no-data",
    });
  }

  const userPrompt = buildUserPrompt(sector, perfData, newsData, customerName, businessName, businessType);

  try {
    const client = new Anthropic({ apiKey, timeout: TIMEOUT_MS });
    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 250,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") throw new Error("Unexpected response type");

    const result: SummaryResponse = {
      summary: content.text,
      cached: false,
      personalized: isPersonalized,
      updatedAt: new Date().toISOString(),
    };

    if (!isPersonalized) {
      cache.set(cacheKey, result, CACHE_TTL);
    }

    return NextResponse.json(result);

  } catch {
    const fallback = !isPersonalized ? cache.get<SummaryResponse>(cacheKey) : null;
    if (fallback) return NextResponse.json({ ...fallback, cached: true });
    return NextResponse.json<SummaryResponse>({
      summary: "",
      cached: false,
      personalized: isPersonalized,
      updatedAt: new Date().toISOString(),
      error: "unavailable",
    });
  }
}
