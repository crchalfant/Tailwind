interface Props {
  message: string;
  variant?: "error" | "warning" | "info";
}

export default function ErrorBanner({ message, variant = "error" }: Props) {
  return (
    <div className={`error-banner error-banner-${variant}`} role="alert">
      <span className="error-banner-icon" aria-hidden="true">
        {variant === "error" ? "⚠️" : variant === "warning" ? "⚡" : "ℹ️"}
      </span>
      <span>{message}</span>
    </div>
  );
}
