import { NextRequest, NextResponse } from "next/server";
import { fetchSectorPerformance } from "@/lib/sector-service";
import cache from "@/lib/cache";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const sector = searchParams.get("sector") ?? "";
  if (!sector) {
    return NextResponse.json({ error: "missing-sector" }, { status: 400 });
  }

  // bust param from manual refresh — invalidate the shared cache
  if (searchParams.get("bust")) {
    cache.invalidate("sector-performance-raw");
  }

  const result = await fetchSectorPerformance(sector);
  return NextResponse.json(result);
}
