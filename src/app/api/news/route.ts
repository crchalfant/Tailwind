import { NextRequest, NextResponse } from "next/server";
import { fetchNews } from "@/lib/news-service";
import cache from "@/lib/cache";
import { getKeywords } from "@/lib/keyword-map";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const sector = searchParams.get("sector") ?? "";
  if (!sector) {
    return NextResponse.json({ error: "missing-sector" }, { status: 400 });
  }

  // bust param from manual refresh — invalidate this sector's news cache
  if (searchParams.get("bust")) {
    const keywords = getKeywords(sector);
    if (keywords) cache.invalidate(`news:${keywords.join(" | ")}`);
  }

  const result = await fetchNews(sector);
  return NextResponse.json(result);
}
