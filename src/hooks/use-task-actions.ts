"use client";

import { useMemo } from "react";
import { toast } from "sonner";

import { useCurrentUser } from "@/components/auth/auth-provider";
import { formatHours, formatTaskId, topPosition } from "@/lib/board";
import { STATUS_META } from "@/lib/constants";
import { logActivity, type ActivityInput } from "@/lib/firestore/activity";
import { firestoreErrorMessage } from "@/lib/firestore/errors";
import { createTask, deleteTask, restoreTask, updateTask } from "@/lib/firestore/tasks";
import type { BoardTask, TaskDraft, TaskPatch } from "@/lib/types";
import { useWorkspaceStoreApi } from "@/stores/workspace-store-provider";

/** Campos editables de una tarea existente (para duplicarla). */
function draftOf(task: BoardTask): TaskDraft {
  return {
    title: task.title,
    description: task.description,
    status: task.status,
    category: task.category,
    priority: task.priority,
    estimatedHours: task.estimatedHours,
    loggedHours: task.loggedHours,
    milestoneId: task.milestoneId,
    gddNodeId: task.gddNodeId,
    assigneeId: task.assigneeId,
    startDate: task.startDate,
    dueDate: task.dueDate,
    tags: task.tags,
    subtasks: task.subtasks,
    blockedBy: task.blockedBy,
  };
}

/**
 * Mutaciones de tareas:
 * 1. se aplica el cambio en el store (la UI responde en el mismo frame),
 * 2. se escribe en Firestore (su caché local lo aplica al instante y el
 *    listener lo confirma; otros miembros lo reciben en tiempo real),
 * 3. si las reglas lo rechazan, Firestore revierte su caché, el listener
 *    devuelve el estado real al store y se avisa con un toast,
 * 4. los cambios relevantes quedan en el registro de actividad.
 */
export function useTaskActions() {
  const store = useWorkspaceStoreApi();
  const user = useCurrentUser();

  return useMemo(() => {
    const get = () => store.getState();
    const log = (event: ActivityInput) => logActivity(get().project.id, user.uid, event);

    async function update(taskId: string, patch: TaskPatch) {
      const previous = get().tasks[taskId];
      if (!previous) return false;

      const next: TaskPatch = { ...patch };
      // Reescribir el mismo estado reiniciaría la fecha de cierre.
      if (next.status === previous.status) delete next.status;
      const milestoneId = "milestoneId" in patch ? (patch.milestoneId ?? null) : previous.milestoneId;
      const status = next.status ?? previous.status;
      const changesColumn = milestoneId !== previous.milestoneId || status !== previous.status;
      // Cambiar de columna desde el panel la coloca arriba del todo.
      if (changesColumn && next.position === undefined) {
        next.position = topPosition(Object.values(get().tasks), milestoneId, status, taskId);
      }

      get().patchTask(taskId, {
        ...next,
        ...(next.status !== undefined && { completedAt: next.status === "DONE" ? new Date().toISOString() : null }),
      });
      try {
        await updateTask(get().project.id, taskId, next);
      } catch (error) {
        toast.error(firestoreErrorMessage(error, "No se pudieron guardar los cambios"));
        return false;
      }

      const base = { number: previous.number, title: previous.title.slice(0, 120) };
      if (next.status !== undefined) {
        log({ type: "task.status", taskId, data: { ...base, from: previous.status, to: next.status } });
      }
      if (patch.assigneeId !== undefined && patch.assigneeId !== previous.assigneeId) {
        log({ type: "task.assigned", taskId, data: { ...base, to: patch.assigneeId } });
      }
      if (patch.milestoneId !== undefined && patch.milestoneId !== previous.milestoneId) {
        const milestone = get().milestones.find((m) => m.id === patch.milestoneId);
        log({ type: "task.milestone", taskId, data: { ...base, to: milestone?.title ?? null } });
      }
      return true;
    }

    async function create(draft: TaskDraft) {
      const { project, tasks } = get();
      try {
        const position = topPosition(Object.values(tasks), draft.milestoneId, draft.status);
        const created = await createTask(project.id, user.uid, { ...draft, position });
        toast.success(`${formatTaskId(project.key, created.number)} creada`, { description: draft.title.trim() });
        log({ type: "task.created", taskId: created.id, data: { number: created.number, title: draft.title.trim().slice(0, 120) } });
        return created;
      } catch (error) {
        toast.error(
          error instanceof Error && !("code" in error)
            ? error.message
            : firestoreErrorMessage(error, "No se pudo crear la tarea"),
        );
        return null;
      }
    }

    /** Copia la tarea (sin horas registradas ni subtareas hechas) en Por hacer. */
    async function duplicate(taskId: string) {
      const source = get().tasks[taskId];
      if (!source) return null;
      return create({
        ...draftOf(source),
        title: `${source.title} (copia)`.slice(0, 200),
        status: "TODO",
        loggedHours: 0,
        subtasks: source.subtasks.map((subtask) => ({ ...subtask, id: crypto.randomUUID().slice(0, 8), done: false })),
      });
    }

    /** Suma horas registradas, con deshacer. */
    async function logHours(taskId: string, hours: number) {
      const task = get().tasks[taskId];
      if (!task || hours <= 0) return;
      const previous = task.loggedHours;
      const total = Math.round((previous + hours) * 100) / 100;
      const ok = await update(taskId, { loggedHours: total });
      if (!ok) return;
      log({ type: "task.logged", taskId, data: { number: task.number, title: task.title.slice(0, 120), hours } });
      toast(`+${formatHours(hours)} h en ${formatTaskId(get().project.key, task.number)}`, {
        description: `Total registrado: ${formatHours(total)} h`,
        action: { label: "Deshacer", onClick: () => void update(taskId, { loggedHours: previous }) },
      });
    }

    async function remove(taskId: string) {
      const { project, tasks, panel } = get();
      const snapshot = tasks[taskId];
      if (!snapshot) return;

      if (panel?.mode === "edit" && panel.taskId === taskId) get().closePanel();
      get().removeTask(taskId);

      try {
        await deleteTask(project.id, taskId);
      } catch (error) {
        toast.error(firestoreErrorMessage(error, "No se pudo eliminar la tarea"));
        return;
      }
      log({ type: "task.deleted", taskId, data: { number: snapshot.number, title: snapshot.title.slice(0, 120) } });

      toast(`${formatTaskId(project.key, snapshot.number)} eliminada`, {
        description: snapshot.title,
        // Margen cómodo para arrepentirse (el valor por defecto, 4 s, se queda corto).
        duration: 8000,
        action: {
          label: "Deshacer",
          onClick: async () => {
            // Si su hito o su sección del GDD desaparecieron entretanto, se desvincula.
            const { milestones, gddNodes } = get();
            const restored = {
              ...snapshot,
              milestoneId: milestones.some((m) => m.id === snapshot.milestoneId) ? snapshot.milestoneId : null,
              gddNodeId: gddNodes.some((n) => n.id === snapshot.gddNodeId) ? snapshot.gddNodeId : null,
            };
            get().upsertTask(restored);
            try {
              await restoreTask(project.id, user.uid, restored);
            } catch (error) {
              toast.error(firestoreErrorMessage(error, "No se pudo restaurar la tarea"));
            }
          },
        },
      });
    }

    /** Mover a la siguiente/anterior columna (menú contextual). */
    function shiftStatus(taskId: string, direction: 1 | -1) {
      const task = get().tasks[taskId];
      if (!task) return;
      const order = Object.keys(STATUS_META) as BoardTask["status"][];
      const next = order[order.indexOf(task.status) + direction];
      if (next) void update(taskId, { status: next });
    }

    return { update, create, duplicate, logHours, remove, shiftStatus };
  }, [store, user.uid]);
}
