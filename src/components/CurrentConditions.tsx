"use client";

import { SectorPerformanceResponse } from "@/types";
import SkeletonBlock from "./SkeletonBlock";
import ErrorBanner from "./ErrorBanner";

interface Props {
  data: SectorPerformanceResponse | null;
  loading: boolean;
  sectorName: string;
}

function DirectionBadge({ direction }: { direction: string }) {
  const config = {
    tailwind: { emoji: "🟢", label: "Tailwind" },
    crosswind: { emoji: "🟡", label: "Crosswind" },
    headwind: { emoji: "🔴", label: "Headwind" },
  }[direction] ?? { emoji: "🟡", label: "Crosswind" };

  return (
    <span className={`direction-badge direction-${direction}`} aria-label={config.label}>
      <span aria-hidden="true">{config.emoji}</span> {config.label}
    </span>
  );
}

function PerformanceGauge({ data }: { data: SectorPerformanceResponse }) {
  const { sectorPerformance, marketBenchmark, allSectorValues } = data;
  const min = Math.min(...allSectorValues);
  const max = Math.max(...allSectorValues);
  const range = max - min || 1;

  const sectorPct = Math.min(100, Math.max(2, ((sectorPerformance - min) / range) * 100));
  const benchmarkPct = Math.min(98, Math.max(2, ((marketBenchmark - min) / range) * 100));

  return (
    <div className="gauge-container" aria-label={`Performance gauge: ${sectorPerformance.toFixed(2)}% vs market average ${marketBenchmark.toFixed(2)}%`}>
      <div className="gauge-track">
        <div className="gauge-fill" style={{ width: `${sectorPct}%` }} />
        <div
          className="gauge-benchmark"
          style={{ left: `${benchmarkPct}%` }}
          title={`Market avg: ${marketBenchmark.toFixed(2)}%`}
        />
      </div>
      <div className="gauge-labels">
        <span className="gauge-label-min">{min.toFixed(1)}%</span>
        <span className="gauge-label-benchmark" style={{ left: `${benchmarkPct}%` }}>
          avg {marketBenchmark.toFixed(1)}%
        </span>
        <span className="gauge-label-max">{max.toFixed(1)}%</span>
      </div>
    </div>
  );
}

export default function CurrentConditions({ data, loading, sectorName }: Props) {
  if (loading || !data) {
    return (
      <section className="card" aria-label="Current Conditions loading">
        <h2 className="section-title">Current Conditions</h2>
        <SkeletonBlock height="3rem" className="mb-3" />
        <SkeletonBlock height="1.5rem" className="mb-2" />
        <SkeletonBlock rows={2} height="0.875rem" />
      </section>
    );
  }

  if (data.error === "unavailable") {
    return (
      <section className="card" aria-label="Current Conditions">
        <h2 className="section-title">Current Conditions</h2>
        <ErrorBanner message="Sector data is unavailable right now." />
      </section>
    );
  }

  if (data.error === "unmapped") {
    return (
      <section className="card" aria-label="Current Conditions">
        <h2 className="section-title">Current Conditions</h2>
        <div className="empty-state">
          <p>No sector performance data is available for <strong>{sectorName}</strong> right now.</p>
        </div>
      </section>
    );
  }

  const diff = data.sectorPerformance - data.marketBenchmark;
  const relWord = diff >= 1.0 ? "outperforming" : diff <= -1.0 ? "underperforming" : "tracking inline with";
  const sign = data.sectorPerformance >= 0 ? "+" : "";
  const benchSign = data.marketBenchmark >= 0 ? "+" : "";

  return (
    <section className="card" aria-label="Current Conditions">
      <h2 className="section-title">Current Conditions</h2>

      <div className="conditions-hero">
        <div className="conditions-perf">
          <span className="perf-number">{sign}{data.sectorPerformance.toFixed(2)}%</span>
          <span className="perf-label">{data.lastTradingDate ? `As of ${data.lastTradingDate} market close` : "Last trading day"}</span>
        </div>
        <DirectionBadge direction={data.direction} />
      </div>

      <PerformanceGauge data={data} />

      <p className="conditions-description">
        <strong>{sectorName}</strong> is {relWord} the broader market —{" "}
        {sign}{data.sectorPerformance.toFixed(2)}% vs. the market average of {benchSign}{data.marketBenchmark.toFixed(2)}% last trading day.
      </p>

      {data.fundName && (
        <p className="conditions-fund-name">
          Tracking: {data.fundName}
        </p>
      )}

      <p className="conditions-explainer">
        Market average = mean of all S&amp;P 500 sector ETFs{" "}
        <span className="tooltip-trigger" title="A measure of how the overall US stock market is doing">
          <span aria-hidden="true">ⓘ</span>
          <span className="sr-only">A measure of how the overall US stock market is doing</span>
        </span>
      </p>
    </section>
  );
}
