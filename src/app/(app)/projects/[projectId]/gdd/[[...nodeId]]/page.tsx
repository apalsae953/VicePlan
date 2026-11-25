import type { Metadata } from "next";

import { GddView } from "@/components/gdd/gdd-view";

export const metadata: Metadata = { title: "Documento de diseño" };

/**
 * `/gdd` y `/gdd/<nodeId>` (catch-all opcional). La sección se resuelve en
 * cliente desde la URL: los datos ya están en el store del workspace y la
 * navegación entre secciones usa history.pushState.
 */
export default function GddPage() {
  return <GddView />;
}
