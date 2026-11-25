import { onSnapshot, query, where, type FirestoreError } from "firebase/firestore";

import { getFirebase } from "@/lib/firebase";
import type { BoardTask } from "@/lib/types";
import { toTask } from "./mappers";
import { tasksCollection } from "./refs";

/**
 * Tareas de un proyecto asignadas a un usuario (todas; "Mi panel" separa las
 * abiertas de las cerradas). Igualdad simple: no necesita índice compuesto.
 */
export function subscribeAssignedTasks(
  projectId: string,
  uid: string,
  onChange: (tasks: BoardTask[]) => void,
  onError?: (error: FirestoreError) => void,
) {
  const { db } = getFirebase();
  return onSnapshot(
    query(tasksCollection(db, projectId), where("assigneeId", "==", uid)),
    (snapshot) => onChange(snapshot.docs.map(toTask)),
    onError,
  );
}
