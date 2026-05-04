"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CurrentConditions from "@/components/CurrentConditions";
import NewsFeed from "@/components/NewsFeed";
import Briefing from "@/components/Briefing";
import { SectorPerformanceResponse, NewsResponse, SummaryResponse } from "@/types";
import { formatUpdatedAt } from "@/lib/format-time";

const STORAGE_KEY = "tailwind_sector";
const SLOW_RENDER_MS = 8_000;

function readStoredSector(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredSector(sector: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, sector);
  } catch {
    // silent
  }
}

export default function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sectorParam = searchParams.get("sector");
  const isEmbedded = searchParams.get("embedded") === "true";

  const [sector, setSector] = useState<string>("");
  const [sectorResolved, setSectorResolved] = useState(false);
  const [perfData, setPerfData] = useState<SectorPerformanceResponse | null>(null);
  const [newsData, setNewsData] = useState<NewsResponse | null>(null);
  const [summaryData, setSummaryData] = useState<SummaryResponse | null>(null);
  const [perfLoading, setPerfLoading] = useState(true);
  const [newsLoading, setNewsLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [updatedAtDisplay, setUpdatedAtDisplay] = useState<string>("");
  const [showSlowNotice, setShowSlowNotice] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [refreshConfirm, setRefreshConfirm] = useState(false);
  const [refreshConfirmFading, setRefreshConfirmFading] = useState(false);

  const abortRefs = useRef<AbortController[]>([]);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshConfirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isOfflineRef = useRef(false);

  // Resolve sector from URL param or localStorage
  useEffect(() => {
    if (sectorParam) {
      setSector(sectorParam);
      if (!isEmbedded) writeStoredSector(sectorParam);
      setSectorResolved(true);
    } else if (!isEmbedded) {
      const stored = readStoredSector();
      if (stored) {
        setSector(stored);
        setSectorResolved(true);
      } else {
        router.replace("/");
      }
    }
  }, [sectorParam, isEmbedded, router]);

  // Offline detection
  useEffect(() => {
    const initial = !navigator.onLine;
    setIsOffline(initial);
    isOfflineRef.current = initial;
    const handleOffline = () => { setIsOffline(true); isOfflineRef.current = true; };
    const handleOnline = () => { setIsOffline(false); isOfflineRef.current = false; };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  // Live timestamp ticker — re-evaluates "Updated X min ago" every 30s
  useEffect(() => {
    if (!updatedAt) return;
    setUpdatedAtDisplay(formatUpdatedAt(updatedAt));
    if (tickerRef.current) clearInterval(tickerRef.current);
    tickerRef.current = setInterval(() => {
      setUpdatedAtDisplay(formatUpdatedAt(updatedAt));
    }, 30_000);
    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
    };
  }, [updatedAt]);

  const cancelInFlight = useCallback(() => {
    abortRefs.current.forEach((c) => c.abort());
    abortRefs.current = [];
    if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
  }, []);

  const fetchAll = useCallback(
    async (sectorName: string, bust = false) => {
      cancelInFlight();
      setPerfLoading(true);
      setNewsLoading(true);
      setSummaryLoading(true);
      setPerfData(null);
      setNewsData(null);
      setSummaryData(null);
      setShowSlowNotice(false);

      if (isOfflineRef.current) return;

      const perfCtrl = new AbortController();
      const newsCtrl = new AbortController();
      const summaryCtrl = new AbortController();
      abortRefs.current = [perfCtrl, newsCtrl, summaryCtrl];

      slowTimerRef.current = setTimeout(() => setShowSlowNotice(true), SLOW_RENDER_MS);

      const bustParam = bust ? `&bust=${Date.now()}` : "";

      const [perfRes, newsRes] = await Promise.allSettled([
        fetch(`/api/sector-performance?sector=${encodeURIComponent(sectorName)}${bustParam}`, { signal: perfCtrl.signal })
          .then((r) => r.json() as Promise<SectorPerformanceResponse>)
          .finally(() => setPerfLoading(false)),
        fetch(`/api/news?sector=${encodeURIComponent(sectorName)}${bustParam}`, { signal: newsCtrl.signal })
          .then((r) => r.json() as Promise<NewsResponse>)
          .finally(() => setNewsLoading(false)),
      ]);

      const perf = perfRes.status === "fulfilled" ? perfRes.value : null;
      const news = newsRes.status === "fulfilled" ? newsRes.value : null;

      if (perf) setPerfData(perf);
      if (news) setNewsData(news);

      // Use the timestamp from the API response so cached data shows when it was
      // originally fetched, not when this request was made.
      const responseTime = perf?.updatedAt ?? news?.updatedAt ?? new Date().toISOString();
      setUpdatedAt(responseTime);

      fetch(`/api/summary?sector=${encodeURIComponent(sectorName)}${bustParam}`, { signal: summaryCtrl.signal })
        .then((r) => r.json() as Promise<SummaryResponse>)
        .then((d) => setSummaryData(d))
        .catch(() =>
          setSummaryData({
            summary: "",
            cached: false,
            personalized: false,
            updatedAt: new Date().toISOString(),
            error: "unavailable",
          })
        )
        .finally(() => {
          setSummaryLoading(false);
          if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
          setShowSlowNotice(false);
        });
    },
    [cancelInFlight]
  );

  const handleRefresh = useCallback(() => {
    if (!sector) return;
    fetchAll(sector, true);
    if (refreshConfirmTimerRef.current) clearTimeout(refreshConfirmTimerRef.current);
    setRefreshConfirm(true);
    setRefreshConfirmFading(false);
    refreshConfirmTimerRef.current = setTimeout(() => {
      setRefreshConfirmFading(true);
      setTimeout(() => setRefreshConfirm(false), 500);
    }, 3000);
  }, [sector, fetchAll]);

  const handleRetrySummary = useCallback(() => {
    if (!sector) return;
    setSummaryLoading(true);
    setSummaryData(null);
    const ctrl = new AbortController();
    abortRefs.current.push(ctrl);
    fetch(`/api/summary?sector=${encodeURIComponent(sector)}`, { signal: ctrl.signal })
      .then((r) => r.json() as Promise<SummaryResponse>)
      .then((d) => setSummaryData(d))
      .catch(() =>
        setSummaryData({
          summary: "",
          cached: false,
          personalized: false,
          updatedAt: new Date().toISOString(),
          error: "unavailable",
        })
      )
      .finally(() => setSummaryLoading(false));
  }, [sector]);

  useEffect(() => {
    if (sector) fetchAll(sector);
    return () => cancelInFlight();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sector]);

  const allFailed =
    !perfLoading &&
    !newsLoading &&
    !summaryLoading &&
    (perfData === null || !!perfData?.error) &&
    (newsData === null || !!newsData?.error) &&
    (summaryData === null || !!summaryData?.error);

  const anyCached =
    (perfData?.cached || newsData?.cached || summaryData?.cached) &&
    !summaryData?.personalized;

  const isRefreshing = perfLoading || newsLoading || summaryLoading;
  const displaySector = sector || "your industry";

  return (
    <div className="dashboard-wrapper">
      {!isEmbedded && (
        <header className="dashboard-header">
          <div className="header-left">
            <div className="app-logo">
              <span className="app-logo-icon" aria-hidden="true">🌬️</span>
              <span className="app-logo-name">Tailwind</span>
            </div>
            {sector && (
              <h1 className="dashboard-sector-title" aria-label={`Current sector: ${sector}`}>
                {sector}
              </h1>
            )}
          </div>
          <div className="header-right">
            <div className="header-meta">
              {updatedAt && (
                <span className="updated-at">
                  {refreshConfirm ? (
                    <span className={`refresh-confirm ${refreshConfirmFading ? "fading" : ""}`}>
                      ✓ Updated just now
                    </span>
                  ) : (
                    updatedAtDisplay
                  )}
                </span>
              )}
              {anyCached && !refreshConfirm && updatedAtDisplay.includes("min") && (
                <span className="cached-label">Showing saved data</span>
              )}
            </div>
            <button
              className="btn-refresh"
              onClick={handleRefresh}
              disabled={isRefreshing}
              aria-label="Refresh all sections"
            >
              {isRefreshing ? "Loading…" : "Refresh all"}
            </button>
            <button
              className="btn-change-sector"
              onClick={() => {
                cancelInFlight();
                router.push("/");
              }}
              aria-label="Change sector"
            >
              Change sector
            </button>
          </div>
        </header>
      )}

      {isOffline && (
        <div className="notice-banner" role="alert">
          You appear to be offline. Showing saved data if available.
        </div>
      )}
      {showSlowNotice && (
        <div className="notice-banner" role="status">
          This is taking longer than usual.
        </div>
      )}

      {allFailed ? (
        <main className="dashboard-error-page">
          <p>Something went wrong loading your data. Try refreshing in a moment.</p>
          <button className="btn-refresh" onClick={handleRefresh}>Try again</button>
        </main>
      ) : !sectorResolved ? (
        <main className="dashboard-main">
          <div className="dashboard-left">
            <CurrentConditions data={null} loading={true} sectorName="" />
            <NewsFeed data={null} loading={true} sectorName="" />
          </div>
          <div className="dashboard-right">
            <Briefing data={null} loading={true} onRetry={() => {}} />
          </div>
        </main>
      ) : (
        <main className="dashboard-main">
          <div className="dashboard-left">
            <CurrentConditions data={perfData} loading={perfLoading} sectorName={displaySector} />
            <NewsFeed data={newsData} loading={newsLoading} sectorName={displaySector} />
          </div>
          <div className="dashboard-right">
            <Briefing data={summaryData} loading={summaryLoading} onRetry={handleRetrySummary} />
          </div>
        </main>
      )}
    </div>
  );
}
