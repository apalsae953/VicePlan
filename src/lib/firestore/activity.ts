import {
  addDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  type FirestoreError,
  type WriteBatch,
} from "firebase/firestore";

import { getFirebase } from "@/lib/firebase";
import type { ActivityEvent, ActivityType } from "@/lib/types";
import { toActivity } from "./mappers";
import { activityCollection } from "./refs";

/*
 * Registro de actividad del proyecto (como el "Activity" de HacknPlan): cada
 * mutación relevante deja un evento inmutable con quién, qué y cuándo. Se
 * escribe en segundo plano; si falla, la acción principal no se deshace.
 */

export type ActivityInput = {
  type: ActivityType;
  taskId?: string | null;
  data?: Record<string, string | number | null>;
};

function eventFields(uid: string, event: ActivityInput) {
  return {
    actorId: uid,
    type: event.type,
    taskId: event.taskId ?? null,
    data: event.data ?? {},
    createdAt: serverTimestamp(),
  };
}

export function logActivity(projectId: string, uid: string, event: ActivityInput) {
  const { db } = getFirebase();
  void addDoc(activityCollection(db, projectId), eventFields(uid, event)).catch((error: FirestoreError) =>
    console.warn("[actividad]", error.code),
  );
}

/** Añade el evento a un batch existente (p. ej. al unirse a un proyecto). */
export function addActivityToBatch(batch: WriteBatch, projectId: string, uid: string, event: ActivityInput) {
  const { db } = getFirebase();
  batch.set(doc(activityCollection(db, projectId)), eventFields(uid, event));
}

/** Últimos eventos del proyecto, en tiempo real. */
export function subscribeProjectActivity(
  projectId: string,
  count: number,
  onChange: (events: ActivityEvent[]) => void,
  onError?: (error: FirestoreError) => void,
) {
  const { db } = getFirebase();
  return onSnapshot(
    query(activityCollection(db, projectId), orderBy("createdAt", "desc"), limit(count)),
    (snapshot) => onChange(snapshot.docs.map(toActivity).filter((event): event is ActivityEvent => event !== null)),
    onError,
  );
}

/**
 * Historial de una tarea. Sin orderBy en la consulta (evita un índice
 * compuesto): una tarea tiene pocos eventos y se ordenan aquí.
 */
export function subscribeTaskActivity(
  projectId: string,
  taskId: string,
  onChange: (events: ActivityEvent[]) => void,
  onError?: (error: FirestoreError) => void,
) {
  const { db } = getFirebase();
  return onSnapshot(
    query(activityCollection(db, projectId), where("taskId", "==", taskId), limit(200)),
    (snapshot) =>
      onChange(
        snapshot.docs
          .map(toActivity)
          .filter((event): event is ActivityEvent => event !== null)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      ),
    onError,
  );
}
