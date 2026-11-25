import { doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from "firebase/firestore";

import { POSITION_STEP } from "@/lib/constants";
import { getFirebase } from "@/lib/firebase";
import type { BoardMilestone, MilestoneDraft, OpenTasksTarget } from "@/lib/types";
import { dateInputToIso } from "./mappers";
import { milestoneDoc, milestonesCollection, tasksCollection } from "./refs";

/*
 * Milestones. Las fechas se guardan como "YYYY-MM-DD" (fecha de calendario,
 * sin zona horaria): un hito que termina el 6 de diciembre termina ese día
 * para todo el equipo, esté donde esté.
 */

const MAX_TITLE = 120;
const MAX_DESCRIPTION = 2_000;

function cleanDraft(draft: Partial<MilestoneDraft>) {
  const data: Record<string, unknown> = {};
  if (draft.title !== undefined) data.title = draft.title.trim().slice(0, MAX_TITLE);
  if (draft.description !== undefined) {
    const description = draft.description?.trim() ?? "";
    data.description = description ? description.slice(0, MAX_DESCRIPTION) : null;
  }
  if (draft.status !== undefined) data.status = draft.status;
  if (draft.startDate !== undefined) data.startDate = draft.startDate || null;
  if (draft.endDate !== undefined) data.endDate = draft.endDate || null;
  return data;
}

function validate(draft: Partial<MilestoneDraft>) {
  if (draft.title !== undefined && !draft.title.trim()) throw new Error("El hito necesita un título");
  if (draft.startDate && draft.endDate && draft.endDate < draft.startDate) {
    throw new Error("La fecha de fin no puede ser anterior a la de inicio");
  }
}

export function createMilestone(projectId: string, draft: MilestoneDraft) {
  validate(draft);
  const { db } = getFirebase();
  const ref = doc(milestonesCollection(db, projectId));
  const data = cleanDraft(draft);
  const write = setDoc(ref, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  const milestone: BoardMilestone = {
    id: ref.id,
    title: data.title as string,
    description: (data.description as string | null) ?? null,
    status: draft.status,
    startDate: dateInputToIso(draft.startDate),
    endDate: dateInputToIso(draft.endDate),
  };
  return { milestone, write };
}

export function updateMilestone(projectId: string, milestoneId: string, patch: Partial<MilestoneDraft>) {
  validate(patch);
  const { db } = getFirebase();
  return updateDoc(milestoneDoc(db, projectId, milestoneId), { ...cleanDraft(patch), updatedAt: serverTimestamp() });
}

/**
 * Completa el milestone y, si se pide, mueve sus tareas sin terminar al
 * backlog (null) o a otro milestone, al final de su columna. Un solo batch:
 * o se aplica todo o nada. Devuelve cuántas tareas se movieron.
 */
export async function completeMilestone(projectId: string, milestoneId: string, target: OpenTasksTarget) {
  const { db } = getFirebase();
  const batch = writeBatch(db);
  const tasks = tasksCollection(db, projectId);
  let moved = 0;

  if (target !== "keep") {
    const own = await getDocs(query(tasks, where("milestoneId", "==", milestoneId)));
    const open = own.docs
      .filter((task) => task.data().status !== "DONE")
      .sort((a, b) => (a.data().position ?? 0) - (b.data().position ?? 0));

    if (open.length > 0) {
      const destination = await getDocs(query(tasks, where("milestoneId", "==", target)));
      const lastPosition = new Map<string, number>();
      destination.forEach((task) => {
        const { status, position } = task.data();
        if (typeof position === "number") lastPosition.set(status, Math.max(lastPosition.get(status) ?? 0, position));
      });
      for (const task of open) {
        const status = task.data().status as string;
        const position = (lastPosition.get(status) ?? 0) + POSITION_STEP;
        lastPosition.set(status, position);
        batch.update(task.ref, { milestoneId: target, position, updatedAt: serverTimestamp() });
      }
      moved = open.length;
    }
  }

  batch.update(milestoneDoc(db, projectId, milestoneId), { status: "COMPLETED", updatedAt: serverTimestamp() });
  await batch.commit();
  return moved;
}

/** Borra el milestone; sus tareas vuelven al backlog (en el mismo batch). */
export async function deleteMilestone(projectId: string, milestoneId: string) {
  const { db } = getFirebase();
  const batch = writeBatch(db);
  const linked = await getDocs(query(tasksCollection(db, projectId), where("milestoneId", "==", milestoneId)));
  linked.forEach((task) => batch.update(task.ref, { milestoneId: null, updatedAt: serverTimestamp() }));
  batch.delete(milestoneDoc(db, projectId, milestoneId));
  await batch.commit();
}
