"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import SectorTile from "@/components/SectorTile";
import { SectorName } from "@/types";

const SECTORS: SectorName[] = [
  "Trades and Construction",
  "Retail",
  "Restaurants and Food Service",
  "Healthcare and Wellness",
  "Real Estate",
  "Financial Services",
  "Energy and Utilities",
  "Tech and Software",
];

const STORAGE_KEY = "tailwind_sector";

function readStoredSector(): SectorName | null {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val && SECTORS.includes(val as SectorName)) return val as SectorName;
  } catch {
    // localStorage unavailable — silent fallback
  }
  return null;
}

function writeStoredSector(sector: SectorName): void {
  try {
    localStorage.setItem(STORAGE_KEY, sector);
  } catch {
    // silent fallback
  }
}

function SectorSelectionContent() {
  const router = useRouter();
  const [previousSector, setPreviousSector] = useState<SectorName | null>(null);

  // Always show the grid on load — highlight the previously selected sector if one exists
  useEffect(() => {
    setPreviousSector(readStoredSector());
  }, []);

  function handleSelect(sector: SectorName) {
    writeStoredSector(sector);
    router.push(`/dashboard?sector=${encodeURIComponent(sector)}`);
  }

  return (
    <main className="sector-selection-page">
      <div className="sector-selection-header">
        <div className="app-logo">
          <span className="app-logo-icon" aria-hidden="true">🌬️</span>
          <span className="app-logo-name">Tailwind</span>
        </div>
        <p className="sector-selection-subtitle">
          Pick your sector to get a two-minute economic briefing for your business.
        </p>
      </div>

      <div className="sector-grid" role="list" aria-label="Select your business sector">
        {SECTORS.map((sector) => (
          <div key={sector} role="listitem">
            <SectorTile
              name={sector}
              selected={previousSector === sector}
              onClick={handleSelect}
            />
          </div>
        ))}
      </div>
    </main>
  );
}

export default function SectorSelectionPage() {
  return (
    <Suspense fallback={<div className="loading-redirect"><div className="spinner" aria-label="Loading…" /></div>}>
      <SectorSelectionContent />
    </Suspense>
  );
}
