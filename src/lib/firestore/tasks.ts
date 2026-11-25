import { deleteDoc, doc, runTransaction, serverTimestamp, setDoc, Timestamp, updateDoc } from "firebase/firestore";

import { getFirebase } from "@/lib/firebase";
import type { BoardTask, Subtask, TaskDraft, TaskPatch } from "@/lib/types";
import { projectDoc, taskDoc, tasksCollection } from "./refs";

/*
 * Escrituras de tareas. Firestore aplica cada escritura a su caché local al
 * instante y los listeners (onSnapshot) la reflejan antes de que responda el
 * servidor: la UI ya es optimista por diseño. Si el servidor la rechaza
 * (reglas), la caché se revierte y el listener devuelve el estado real.
 */

const MAX_TITLE = 200;
const MAX_DESCRIPTION = 10_000;
const MAX_HOURS = 10_000;
export const MAX_TAGS = 10;
export const MAX_TAG_LENGTH = 32;
export const MAX_SUBTASKS = 50;
export const MAX_DEPENDENCIES = 20;

const hours = (value: number) => Math.round(Math.min(Math.max(value, 0), MAX_HOURS) * 100) / 100;
const dateOnly = (value: string | null) => (value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null);

/** "Boss Fight " → "boss fight"; sin duplicados ni vacías. */
export function normalizeTags(tags: string[]) {
  const clean = tags.map((tag) => tag.trim().toLowerCase().replace(/\s+/g, " ").slice(0, MAX_TAG_LENGTH)).filter(Boolean);
  return [...new Set(clean)].slice(0, MAX_TAGS);
}

function cleanSubtasks(subtasks: Subtask[]) {
  return subtasks
    .filter((subtask) => subtask.id && subtask.title.trim())
    .slice(0, MAX_SUBTASKS)
    .map((subtask) => ({ id: subtask.id, title: subtask.title.trim().slice(0, MAX_TITLE), done: subtask.done }));
}

/** Normaliza un parche antes de escribirlo (las reglas validan igualmente). */
function cleanPatch(patch: TaskPatch, taskId?: string) {
  const data: Record<string, unknown> = {};
  if (patch.title !== undefined) data.title = patch.title.trim().slice(0, MAX_TITLE);
  if (patch.description !== undefined) {
    const description = patch.description?.trim() ?? "";
    data.description = description ? description.slice(0, MAX_DESCRIPTION) : null;
  }
  if (patch.status !== undefined) {
    data.status = patch.status;
    // Fecha de cierre: base del burndown y de "completadas esta semana".
    data.completedAt = patch.status === "DONE" ? serverTimestamp() : null;
  }
  if (patch.category !== undefined) data.category = patch.category;
  if (patch.priority !== undefined) data.priority = patch.priority;
  if (patch.estimatedHours !== undefined) {
    data.estimatedHours = patch.estimatedHours === null ? null : hours(patch.estimatedHours);
  }
  if (patch.loggedHours !== undefined) data.loggedHours = hours(patch.loggedHours);
  if (patch.milestoneId !== undefined) data.milestoneId = patch.milestoneId;
  if (patch.gddNodeId !== undefined) data.gddNodeId = patch.gddNodeId;
  if (patch.assigneeId !== undefined) data.assigneeId = patch.assigneeId;
  if (patch.startDate !== undefined) data.startDate = dateOnly(patch.startDate);
  if (patch.dueDate !== undefined) data.dueDate = dateOnly(patch.dueDate);
  if (patch.tags !== undefined) data.tags = normalizeTags(patch.tags);
  if (patch.subtasks !== undefined) data.subtasks = cleanSubtasks(patch.subtasks);
  if (patch.blockedBy !== undefined) {
    data.blockedBy = [...new Set(patch.blockedBy.filter((id) => id && id !== taskId))].slice(0, MAX_DEPENDENCIES);
  }
  if (patch.position !== undefined) data.position = patch.position;
  return data;
}

/** Todos los campos de una tarea, con valores por defecto donde falten. */
function taskFields(draft: TaskDraft) {
  return {
    title: draft.title,
    description: null,
    status: draft.status,
    category: draft.category,
    priority: draft.priority,
    estimatedHours: null,
    loggedHours: 0,
    milestoneId: draft.milestoneId,
    gddNodeId: draft.gddNodeId,
    assigneeId: draft.assigneeId ?? null,
    startDate: null,
    dueDate: null,
    tags: [] as string[],
    subtasks: [] as Subtask[],
    blockedBy: [] as string[],
    completedAt: null,
    ...cleanPatch(draft),
  };
}

/**
 * Crea una tarea con el siguiente número del proyecto (AET-12). La
 * numeración usa una transacción sobre `taskCounter` para que dos personas
 * creando tareas a la vez nunca obtengan el mismo número.
 */
export async function createTask(projectId: string, uid: string, draft: TaskDraft & { position: number }) {
  if (!draft.title.trim()) throw new Error("El título es obligatorio");
  const { db } = getFirebase();
  const projectRef = projectDoc(db, projectId);
  const taskRef = doc(tasksCollection(db, projectId));

  const number = await runTransaction(db, async (tx) => {
    const project = await tx.get(projectRef);
    if (!project.exists()) throw new Error("El proyecto ya no existe");
    const counter = project.data().taskCounter;
    const next = (typeof counter === "number" ? counter : 0) + 1;
    tx.set(taskRef, {
      ...taskFields(draft),
      images: [],
      number: next,
      position: draft.position,
      createdBy: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    tx.update(projectRef, { taskCounter: next, updatedAt: serverTimestamp() });
    return next;
  });

  return { id: taskRef.id, number };
}

export function updateTask(projectId: string, taskId: string, patch: TaskPatch) {
  const { db } = getFirebase();
  return updateDoc(taskDoc(db, projectId, taskId), { ...cleanPatch(patch, taskId), updatedAt: serverTimestamp() });
}

export function deleteTask(projectId: string, taskId: string) {
  const { db } = getFirebase();
  return deleteDoc(taskDoc(db, projectId, taskId));
}

/** Deshacer un borrado: recrea la tarea con su id, número y posición. */
export function restoreTask(projectId: string, uid: string, task: BoardTask) {
  const { db } = getFirebase();
  return setDoc(taskDoc(db, projectId, task.id), {
    ...taskFields(task),
    // Sus imágenes siguen guardadas: se borran solo si no se deshace el borrado.
    images: task.images,
    number: task.number,
    position: task.position,
    completedAt: task.completedAt ? Timestamp.fromDate(new Date(task.completedAt)) : null,
    createdBy: uid,
    createdAt: Timestamp.fromDate(new Date(task.createdAt)),
    updatedAt: serverTimestamp(),
  });
}
