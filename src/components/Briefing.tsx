"use client";

import { SummaryResponse } from "@/types";
import SkeletonBlock from "./SkeletonBlock";
import { useEffect, useRef, useState } from "react";

interface Props {
  data: SummaryResponse | null;
  loading: boolean;
  onRetry: () => void;
}

const BRIEFING_TIMEOUT_MS = 10_000;

export default function Briefing({ data, loading, onRetry }: Props) {
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (loading) {
      setTimedOut(false);
      timerRef.current = setTimeout(() => setTimedOut(true), BRIEFING_TIMEOUT_MS);
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      setTimedOut(false);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [loading]);

  if (loading && timedOut) {
    return (
      <section className="card briefing-card" aria-label="Your Briefing">
        <h2 className="section-title">Your Briefing</h2>
        <p className="notice-text">Your briefing is taking a moment.</p>
        <button className="btn-retry" onClick={onRetry}>
          Try again
        </button>
      </section>
    );
  }

  if (loading || !data) {
    return (
      <section className="card briefing-card" aria-label="Your Briefing loading">
        <h2 className="section-title">Your Briefing</h2>
        <SkeletonBlock rows={5} height="0.875rem" className="mb-4" />
        <SkeletonBlock height="0.75rem" width="80%" />
      </section>
    );
  }

  if (data.error === "no-key") {
    return (
      <section className="card briefing-card" aria-label="Your Briefing">
        <h2 className="section-title">Your Briefing</h2>
        <p className="notice-text">
          AI summary unavailable — add your Anthropic API key to enable live briefings.
        </p>
      </section>
    );
  }

  if (data.error === "unavailable" || data.error === "no-data") {
    return (
      <section className="card briefing-card" aria-label="Your Briefing">
        <h2 className="section-title">Your Briefing</h2>
        <p className="notice-text">Briefing unavailable right now.</p>
        <button className="btn-retry" onClick={onRetry}>
          Try again
        </button>
      </section>
    );
  }

  return (
    <section className="card briefing-card" aria-label="Your Briefing">
      <h2 className="section-title">Your Briefing</h2>
      <p className="briefing-text">{data.summary}</p>
      <p className="briefing-disclaimer">
        This is not financial advice. Tailwind provides economic context, not recommendations.
      </p>
    </section>
  );
}
