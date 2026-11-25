"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Lock, SearchX } from "lucide-react";

import { CommandPalette } from "@/components/command/command-palette";
import { JoinProjectDialog } from "@/components/projects/join-project";
import { ProjectSettingsDialog } from "@/components/projects/project-settings-dialog";
import { TaskPanel } from "@/components/tasks/task-panel";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useWorkspaceSubscription } from "@/hooks/use-workspace-subscription";
import { setLastProjectId } from "@/lib/preferences";
import { useWorkspaceStore, WorkspaceStoreProvider } from "@/stores/workspace-store-provider";
import { AppShellSkeleton } from "./app-shell-skeleton";
import { AppSidebar } from "./app-sidebar";

/**
 * Shell de un proyecto: lee el id de la URL en el navegador (el layout del
 * servidor no toca `params`, así la ruta se precarga entera) y monta un
 * workspace por proyecto. Cambiar de proyecto crea uno nuevo (`key`);
 * cambiar de vista dentro del proyecto lo conserva.
 */
export function ProjectWorkspace({ children }: { children: ReactNode }) {
  const { projectId } = useParams<{ projectId: string }>();
  return (
    <ProjectWorkspaceContent key={projectId} projectId={projectId}>
      {children}
    </ProjectWorkspaceContent>
  );
}

/**
 * Se suscribe en tiempo real a los datos del proyecto en Firestore, muestra el
 * esqueleto mientras llega el primer snapshot y monta sidebar, vista y panel
 * de tarea sobre el store sincronizado.
 */
function ProjectWorkspaceContent({ projectId, children }: { projectId: string; children: ReactNode }) {
  const subscription = useWorkspaceSubscription(projectId);

  useEffect(() => {
    if (subscription.status === "ready") setLastProjectId(projectId);
  }, [subscription.status, projectId]);

  if (subscription.status === "loading") return <AppShellSkeleton />;
  if (subscription.status === "error") return <ProjectUnavailable reason={subscription.reason} />;

  return (
    <WorkspaceStoreProvider store={subscription.store}>
      <SidebarProvider className="h-svh overflow-hidden">
        <AppSidebar />
        <SidebarInset className="min-w-0 overflow-hidden">{children}</SidebarInset>
      </SidebarProvider>
      {/* Compartido por todas las vistas: el tablero, el GDD y métricas abren y crean tareas aquí. */}
      <TaskPanel />
      <ProjectSettingsDialog />
      <CommandPalette />
      <WorkspaceJoinDialog />
    </WorkspaceStoreProvider>
  );
}

function WorkspaceJoinDialog() {
  const open = useWorkspaceStore((s) => s.joinOpen);
  const setOpen = useWorkspaceStore((s) => s.setJoinOpen);
  return <JoinProjectDialog open={open} onOpenChange={setOpen} />;
}

function ProjectUnavailable({ reason }: { reason: "denied" | "missing" | "unknown" }) {
  const copy = {
    denied: {
      icon: Lock,
      title: "No tienes acceso a este proyecto",
      text: "Puede que no exista o que no seas miembro. Pide a quien lo creó que te invite.",
    },
    missing: {
      icon: SearchX,
      title: "Este proyecto ya no existe",
      text: "Puede que lo hayan eliminado.",
    },
    unknown: {
      icon: SearchX,
      title: "No se pudo cargar el proyecto",
      text: "Revisa tu conexión y que las reglas de Firestore estén publicadas.",
    },
  }[reason];
  const Icon = copy.icon;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <div className="flex size-10 items-center justify-center rounded-xl border bg-card">
        <Icon className="size-4 text-muted-foreground" aria-hidden />
      </div>
      <h1 className="text-sm font-medium">{copy.title}</h1>
      <p className="max-w-sm text-[13px] text-muted-foreground">{copy.text}</p>
      <Button asChild size="sm" variant="secondary" className="mt-1">
        <Link href="/">Ir a mis proyectos</Link>
      </Button>
    </main>
  );
}
