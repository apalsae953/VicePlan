"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { AppShellSkeleton } from "@/components/layout/app-shell-skeleton";
import { useAuth } from "./auth-provider";
import { FirebaseSetupNotice } from "./firebase-setup-notice";

/**
 * Protege las rutas de la app: sin sesión redirige a /login (recordando a
 * dónde iba). La seguridad real de los datos la imponen las reglas de
 * Firestore; esto es la experiencia de navegación.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status !== "signed-out") return;
    const next = window.location.pathname + window.location.search;
    router.replace(next && next !== "/" ? `/login?next=${encodeURIComponent(next)}` : "/login");
  }, [status, router]);

  if (status === "unconfigured") return <FirebaseSetupNotice />;
  if (status !== "signed-in") return <AppShellSkeleton />;
  return children;
}
