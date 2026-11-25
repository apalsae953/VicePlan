import { Suspense } from "react";

import { AppShellSkeleton } from "@/components/layout/app-shell-skeleton";
import { ProjectWorkspace } from "@/components/layout/project-workspace";

/**
 * Layout de un proyecto. No lee `params` en el servidor: el id lo resuelve
 * <ProjectWorkspace> en el navegador con `useParams()`. Así toda la ruta es
 * estática y Next la precarga entera: cambiar de vista (Kanban, GDD,
 * Milestones, Métricas) es instantáneo y el workspace (suscripciones en
 * tiempo real incluidas) persiste entre vistas.
 *
 * `useParams()` suspende al prerenderizar (el id no se conoce en el build):
 * el <Suspense> pinta el esqueleto en esa carga inicial.
 */
export default function ProjectLayout({ children }: LayoutProps<"/projects/[projectId]">) {
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <ProjectWorkspace>{children}</ProjectWorkspace>
    </Suspense>
  );
}
