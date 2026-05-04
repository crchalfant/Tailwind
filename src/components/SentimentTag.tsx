import { Sentiment } from "@/types";

interface Props {
  sentiment: Sentiment;
  size?: "sm" | "md";
}

const CONFIG = {
  tailwind: { emoji: "🟢", label: "Tailwind", className: "sentiment-tailwind" },
  crosswind: { emoji: "🟡", label: "Crosswind", className: "sentiment-crosswind" },
  headwind: { emoji: "🔴", label: "Headwind", className: "sentiment-headwind" },
};

export default function SentimentTag({ sentiment, size = "md" }: Props) {
  const { emoji, label, className } = CONFIG[sentiment];
  return (
    <span
      className={`sentiment-tag ${className} ${size === "sm" ? "sentiment-tag-sm" : ""}`}
      aria-label={label}
    >
      <span aria-hidden="true">{emoji}</span>
      <span>{label}</span>
    </span>
  );
}
