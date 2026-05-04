"use client";

import { NewsArticle } from "@/types";
import SentimentTag from "./SentimentTag";
import { formatRelativeTime } from "@/lib/format-time";

interface Props {
  article: NewsArticle;
}

export default function NewsCard({ article }: Props) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="news-card"
      aria-label={`${article.title} — ${article.sentiment} — opens in new tab`}
    >
      <div className="news-card-content">
        <div className="news-card-meta">
          <span className="news-source">{article.source}</span>
          <span className="news-time">{formatRelativeTime(article.publishedAt)}</span>
        </div>
        <p className="news-headline">{article.title}</p>
        <SentimentTag sentiment={article.sentiment} size="sm" />
      </div>
      <span className="news-external-icon" aria-hidden="true">↗</span>
    </a>
  );
}
