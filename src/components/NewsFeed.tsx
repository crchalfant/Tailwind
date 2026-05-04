"use client";

import { NewsResponse } from "@/types";
import NewsCard from "./NewsCard";
import SkeletonBlock from "./SkeletonBlock";
import ErrorBanner from "./ErrorBanner";

interface Props {
  data: NewsResponse | null;
  loading: boolean;
  sectorName: string;
}

export default function NewsFeed({ data, loading, sectorName }: Props) {
  if (loading || !data) {
    return (
      <section className="card" aria-label="Industry News loading">
        <h2 className="section-title">Industry News</h2>
        {[1, 2, 3].map((i) => (
          <div key={i} className="news-skeleton-row">
            <SkeletonBlock height="0.75rem" width="40%" className="mb-1" />
            <SkeletonBlock height="1rem" className="mb-1" />
            <SkeletonBlock height="1.25rem" width="5rem" />
          </div>
        ))}
      </section>
    );
  }

  if (data.error === "unavailable" || data.error === "no-key") {
    return (
      <section className="card" aria-label="Industry News">
        <h2 className="section-title">Industry News</h2>
        <ErrorBanner message="News unavailable right now." />
      </section>
    );
  }

  if (data.articles.length === 0) {
    return (
      <section className="card" aria-label="Industry News">
        <h2 className="section-title">Industry News</h2>
        <div className="empty-state">
          <p>Nothing in the news for <strong>{sectorName}</strong> right now.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="card" aria-label="Industry News">
      <h2 className="section-title">Industry News</h2>
      {data.limited && (
        <p className="notice-text">Limited news available for this sector right now.</p>
      )}
      <div className="news-feed">
        {data.articles.map((article) => (
          <NewsCard key={article.url} article={article} />
        ))}
      </div>
    </section>
  );
}
