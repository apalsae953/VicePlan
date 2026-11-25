"use client";

import { useMemo } from "react";
import { toast } from "sonner";

import { gddDescendantIds } from "@/lib/board";
import { POSITION_STEP } from "@/lib/constants";
import { firestoreErrorMessage } from "@/lib/firestore/errors";
import { createGddNode, deleteGddSubtree, updateGddNode } from "@/lib/firestore/gdd";
import { useWorkspaceStoreApi } from "@/stores/workspace-store-provider";

/**
 * Mutaciones del GDD sobre Firestore. Crear y renombrar se reflejan al
 * instante (el id de la página nueva se genera en el cliente); borrar espera
 * al batch porque también desvincula tareas. El guardado del contenido lo
 * orquesta `useContentAutosave`.
 */
export function useGddActions() {
  const store = useWorkspaceStoreApi();

  return useMemo(() => {
    const get = () => store.getState();

    async function create(parentId: string | null, title = "Página sin título") {
      const { project, gddNodes } = get();
      const siblings = gddNodes.filter((node) => node.parentId === parentId);
      const position = Math.max(0, ...siblings.map((node) => node.position)) + POSITION_STEP;

      const { node, write } = createGddNode(project.id, { title, parentId, position });
      get().upsertGddNode(node, "");
      if (parentId) get().setGddCollapsed(parentId, false);
      write.catch((error) => toast.error(firestoreErrorMessage(error, "No se pudo crear la página")));
      return node;
    }

    async function rename(nodeId: string, title: string) {
      const previous = get().gddNodes.find((node) => node.id === nodeId);
      const next = title.trim();
      if (!previous || !next || next === previous.title) return false;

      get().patchGddNode(nodeId, { title: next });
      try {
        await updateGddNode(get().project.id, nodeId, { title: next });
        return true;
      } catch (error) {
        toast.error(firestoreErrorMessage(error, "No se pudo renombrar la página"));
        return false;
      }
    }

    async function saveContent(nodeId: string, content: string) {
      try {
        await updateGddNode(get().project.id, nodeId, { content });
        return true;
      } catch (error) {
        toast.error(
          error instanceof Error && !("code" in error)
            ? error.message
            : firestoreErrorMessage(error, "No se pudo guardar el documento"),
        );
        return false;
      }
    }

    async function remove(nodeId: string) {
      const { project, gddNodes } = get();
      const ids = [nodeId, ...gddDescendantIds(gddNodes, nodeId)];
      try {
        await deleteGddSubtree(project.id, ids);
      } catch (error) {
        toast.error(firestoreErrorMessage(error, "No se pudo eliminar la página"));
        return null;
      }
      get().removeGddNodes(ids);
      return ids;
    }

    return { create, rename, saveContent, remove };
  }, [store]);
}
