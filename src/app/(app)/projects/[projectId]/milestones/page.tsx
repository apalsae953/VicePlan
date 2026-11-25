import type { Metadata } from "next";

import { MilestonesView } from "@/components/milestones/milestones-view";

export const metadata: Metadata = { title: "Hitos" };

export default function MilestonesPage() {
  return <MilestonesView />;
}
