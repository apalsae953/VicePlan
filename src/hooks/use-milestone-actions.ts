"use client";

import { useMemo } from "react";
import { FirebaseError } from "firebase/app";
import { toast } from "sonner";

import { firestoreErrorMessage } from "@/lib/firestore/errors";
import { dateInputToIso } from "@/lib/firestore/mappers";
import { completeMilestone, createMilestone, deleteMilestone, updateMilestone } from "@/lib/firestore/milestones";
import type { BoardMilestone, MilestoneDraft, OpenTasksTarget } from "@/lib/types";
import { useWorkspaceStoreApi } from "@/stores/workspace-store-provider";

/** Validaciones propias (Error) se muestran tal cual; las de Firebase, traducidas. */
function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && !(error instanceof FirebaseError)
    ? error.message
    : firestoreErrorMessage(error, fallback);
}

/**
 * Mutaciones de milestones sobre Firestore. Crear y editar se reflejan al
 * instante; completar y borrar esperan al batch (mueven tareas) y el
 * listener trae el resultado.
 */
export function useMilestoneActions() {
  const store = useWorkspaceStoreApi();

  return useMemo(() => {
    const get = () => store.getState();

    async function create(draft: MilestoneDraft) {
      try {
        const { milestone, write } = createMilestone(get().project.id, draft);
        get().upsertMilestone(milestone);
        await write;
        toast.success(`Hito «${milestone.title}» creado`);
        return milestone;
      } catch (error) {
        toast.error(errorMessage(error, "No se pudo crear el hito"));
        return null;
      }
    }

    async function update(milestoneId: string, patch: Partial<MilestoneDraft>) {
      const previous = get().milestones.find((m) => m.id === milestoneId);
      if (!previous) return null;
      try {
        const write = updateMilestone(get().project.id, milestoneId, patch);
        const next: BoardMilestone = {
          ...previous,
          ...(patch.title !== undefined && { title: patch.title.trim() }),
          ...(patch.description !== undefined && { description: patch.description?.trim() || null }),
          ...(patch.status !== undefined && { status: patch.status }),
          ...(patch.startDate !== undefined && { startDate: dateInputToIso(patch.startDate) }),
          ...(patch.endDate !== undefined && { endDate: dateInputToIso(patch.endDate) }),
        };
        get().upsertMilestone(next);
        await write;
        return next;
      } catch (error) {
        toast.error(errorMessage(error, "No se pudo guardar el hito"));
        return null;
      }
    }

    async function complete(milestoneId: string, target: OpenTasksTarget) {
      const milestone = get().milestones.find((m) => m.id === milestoneId);
      try {
        const moved = await completeMilestone(get().project.id, milestoneId, target);
        toast.success(`«${milestone?.title ?? "Hito"}» completado`, {
          description: moved > 0 ? `${moved} ${moved === 1 ? "tarea movida" : "tareas movidas"}` : undefined,
        });
        return true;
      } catch (error) {
        toast.error(errorMessage(error, "No se pudo completar el hito"));
        return false;
      }
    }

    async function remove(milestoneId: string) {
      const title = get().milestones.find((m) => m.id === milestoneId)?.title;
      try {
        await deleteMilestone(get().project.id, milestoneId);
      } catch (error) {
        toast.error(errorMessage(error, "No se pudo eliminar el hito"));
        return false;
      }
      get().removeMilestone(milestoneId);
      toast(`Hito «${title}» eliminado`, { description: "Sus tareas están ahora en trabajo pendiente." });
      return true;
    }

    return { create, update, complete, remove };
  }, [store]);
}
