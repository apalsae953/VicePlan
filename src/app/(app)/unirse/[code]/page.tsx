import { Suspense } from "react";
import type { Metadata } from "next";

import { JoinView } from "@/components/projects/join-project";

export const metadata: Metadata = { title: "Unirse a un proyecto" };

/**
 * `/unirse/CÓDIGO`: enlace de invitación. Requiere sesión (el AuthGate del
 * grupo manda a /login y vuelve aquí; también vale entrar como invitado).
 * El código lo lee <JoinView> en el navegador (`useParams` va en Suspense).
 */
export default function JoinPage() {
  return (
    <Suspense>
      <JoinView />
    </Suspense>
  );
}
