"use client";

import { Suspense } from "react";
import DashboardContent from "./DashboardContent";

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="loading-redirect"><div className="spinner" aria-label="Loading…" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}
