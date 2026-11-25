import type { Metadata } from "next";

import { MetricsView } from "@/components/metrics/metrics-view";

export const metadata: Metadata = { title: "Métricas" };

export default function MetricsPage() {
  return <MetricsView />;
}
