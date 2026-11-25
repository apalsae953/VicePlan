"use client";

import { useTransition } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useCurrentUser } from "@/components/auth/auth-provider";
import { ImagePickButton } from "@/components/images/image-pick-button";
import { ProjectAvatar } from "@/components/layout/project-avatar";
import { Button } from "@/components/ui/button";
import { firestoreErrorMessage } from "@/lib/firestore/errors";
import { imageErrorMessage } from "@/lib/firestore/gdd-assets";
import { removeProjectLogo, uploadProjectLogo } from "@/lib/firestore/stored-images";
import { useWorkspaceStore } from "@/stores/workspace-store-provider";

/**
 * Imagen opcional del proyecto (logo, key art…). Se recorta en cuadrado y
 * aparece en el selector de proyectos, Mi panel y la paleta. Cualquier
 * miembro puede cambiarla, igual que el nombre.
 */
export function ProjectImageField() {
  const user = useCurrentUser();
  const project = useWorkspaceStore((s) => s.project);
  const [busy, startBusy] = useTransition();

  function upload(files: File[]) {
    startBusy(async () => {
      try {
        await uploadProjectLogo(project.id, user.uid, files[0]);
        toast.success("Imagen del proyecto actualizada");
      } catch (error) {
        toast.error(imageErrorMessage(error));
      }
    });
  }

  function remove() {
    startBusy(async () => {
      try {
        await removeProjectLogo(project.id);
        toast("Imagen del proyecto quitada");
      } catch (error) {
        toast.error(firestoreErrorMessage(error, "No se pudo quitar la imagen"));
      }
    });
  }

  return (
    <div className="flex items-center gap-4">
      <ProjectAvatar
        projectKey={project.key}
        projectId={project.id}
        logo={project.logo}
        className="size-14 rounded-xl text-xl"
      />
      <div className="grid gap-1.5">
        <p className="text-xs text-muted-foreground">Imagen del proyecto</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <ImagePickButton variant="outline" size="xs" className="gap-1.5" disabled={busy} onFiles={upload}>
            {busy ? <Loader2 className="animate-spin" /> : <ImagePlus />}
            {project.logo ? "Cambiar imagen" : "Subir imagen"}
          </ImagePickButton>
          {project.logo && (
            <Button type="button" variant="ghost" size="xs" disabled={busy} onClick={remove}>
              Quitar
            </Button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Opcional. Si no hay, se muestra la inicial de la clave sobre su color.
        </p>
      </div>
    </div>
  );
}
