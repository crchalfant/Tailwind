import { SectorName } from "@/types";

interface Props {
  name: SectorName;
  selected: boolean;
  onClick: (name: SectorName) => void;
}

const SECTOR_ICONS: Record<SectorName, string> = {
  "Trades and Construction": "🏗️",
  "Retail": "🛍️",
  "Restaurants and Food Service": "🍽️",
  "Healthcare and Wellness": "🏥",
  "Real Estate": "🏠",
  "Financial Services": "💼",
  "Energy and Utilities": "⚡",
  "Tech and Software": "💻",
};

export default function SectorTile({ name, selected, onClick }: Props) {
  return (
    <button
      className={`sector-tile ${selected ? "sector-tile-selected" : ""}`}
      onClick={() => onClick(name)}
      aria-pressed={selected}
      aria-label={`Select ${name}`}
    >
      <span className="sector-tile-icon" aria-hidden="true">{SECTOR_ICONS[name]}</span>
      <span className="sector-tile-name">{name}</span>
    </button>
  );
}
