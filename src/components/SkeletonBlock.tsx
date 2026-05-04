interface Props {
  width?: string;
  height?: string;
  rows?: number;
  className?: string;
}

export default function SkeletonBlock({ width = "100%", height = "1rem", rows, className = "" }: Props) {
  if (rows) {
    return (
      <div className={`skeleton-container ${className}`} aria-hidden="true">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="skeleton-row"
            style={{ width: i === rows - 1 ? "70%" : "100%", height }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`skeleton-block ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}
