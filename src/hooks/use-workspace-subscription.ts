"use client";

import { useEffect, useState } from "react";
import { onSnapshot, type FirestoreError } from "firebase/firestore";

import { getFirebase } from "@/lib/firebase";
import { sortMilestones, toGddNode, toMilestone, toTask, toWorkspaceProject } from "@/lib/firestore/mappers";
import { gddCollection, milestonesCollection, projectDoc, tasksCollection } from "@/lib/firestore/refs";
import type { Workspace } from "@/lib/types";
import { createWorkspaceStore, type WorkspaceStoreApi } from "@/stores/workspace-store";

export type WorkspaceSubscription =
  | { status: "loading" }
  | { status: "ready"; store: WorkspaceStoreApi }
  | { status: "error"; reason: "denied" | "missing" | "unknown" };

/**
 * Escucha en tiempo real un proyecto completo con cuatro listeners
 * (proyecto, milestones, tareas, GDD). Cuando los cuatro han entregado su
 * primer snapshot crea el store; desde ahÃ­, cada snapshot actualiza el store
 * (las tareas, solo con los documentos que cambiaron).
 *
 * Las escrituras locales disparan el listener al instante (latency
 * compensation de Firestore) y las de otros miembros llegan en cuanto el
 * servidor las confirma: cualquier pantalla abierta se actualiza sola.
 */
export function useWorkspaceSubscription(projectId: string): WorkspaceSubscription {
  const [state, setState] = useState<WorkspaceSubscription>({ status: "loading" });

  useEffect(() => {
    const { db } = getFirebase();
    let store: WorkspaceStoreApi | null = null;
    let failed = false;
    const initial: Partial<Workspace> = {};

    const createWhenComplete = () => {
      if (store || failed) return;
      const { project, milestones, tasks, gddNodes, gddContent } = initial;
      if (!project || !milestones || !tasks || !gddNodes || !gddContent) return;
      store = createWorkspaceStore({ project, milestones, tasks, gddNodes, gddContent });
      setState({ status: "ready", store });
    };

    const fail = (reason: "denied" | "missing" | "unknown") => (error?: FirestoreError) => {
      const denied = error?.code === "permission-denied";
      // Sin acceso es un caso normal (no es miembro): se muestra en la UI, no es un error.
      if (error && !denied) console.error("[workspace]", error);
      // Los cuatro listeners fallan a la vez: basta con el primer aviso.
      if (failed) return;
      failed = true;
      setState({ status: "error", reason: denied ? "denied" : reason });
    };

    const unsubscribers = [
      onSnapshot(
        projectDoc(db, projectId),
        (snapshot) => {
          if (!snapshot.exists()) return fail("missing")();
          const project = toWorkspaceProject(snapshot);
          if (store) store.getState().syncProject(project);
          else {
            initial.project = project;
            createWhenComplete();
          }
        },
        fail("unknown"),
      ),

      onSnapshot(
        milestonesCollection(db, projectId),
        (snapshot) => {
          const milestones = sortMilestones(snapshot.docs.map(toMilestone));
          if (store) store.getState().syncMilestones(milestones);
          else {
            initial.milestones = milestones;
            createWhenComplete();
          }
        },
        fail("unknown"),
      ),

      onSnapshot(
        tasksCollection(db, projectId),
        (snapshot) => {
          if (store) {
            const upserts = [];
            const removals = [];
            for (const change of snapshot.docChanges()) {
              if (change.type === "removed") removals.push(change.doc.id);
              else upserts.push(toTask(change.doc));
            }
            store.getState().syncTasks({ upserts, removals });
          } else {
            initial.tasks = snapshot.docs.map(toTask);
            createWhenComplete();
          }
        },
        fail("unknown"),
      ),

      onSnapshot(
        gddCollection(db, projectId),
        (snapshot) => {
          const parsed = snapshot.docs.map(toGddNode);
          const nodes = parsed.map((entry) => entry.node);
          const contents = Object.fromEntries(parsed.map((entry) => [entry.node.id, entry.content]));
          if (store) store.getState().syncGdd(nodes, contents);
          else {
            initial.gddNodes = nodes;
            initial.gddContent = contents;
            createWhenComplete();
          }
        },
        fail("unknown"),
      ),
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [projectId]);

  return state;
}
