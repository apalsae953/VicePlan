"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useStoredImage } from "@/hooks/use-stored-image";
import { taskImagePath, taskThumbPath } from "@/lib/firestore/stored-images";
import { useWorkspaceStore } from "@/stores/workspace-store-provider";

/**
 * Portada de la tarjeta: miniatura de la primera imagen de la tarea (unos
 * 50 KB). Al abrir la tarea se ven todas y se pueden ampliar.
 */
export function TaskCover({ imageId }: { imageId: string }) {
  const projectId = useWorkspaceStore((s) => s.project.id);
  const url = useStoredImage(taskThumbPath(projectId, imageId), null, taskImagePath(projectId, imageId));

  return (
    <div className="-mx-3 -mt-3 overflow-hidden rounded-t-[7px] border-b bg-muted/40">
      {url ? (
        // Entera (sin recortar) dentro del mismo alto: personajes y verticales no pierden la cabeza.
        // eslint-disable-next-line @next/next/no-img-element -- miniatura ya en memoria (blob:)
        <img src={url} alt="" draggable={false} className="h-28 w-full object-contain" />
      ) : (
        <Skeleton className="h-28 w-full rounded-none" />
      )}
    </div>
  );
}
