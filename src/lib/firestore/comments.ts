import {
  addDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type FirestoreError,
} from "firebase/firestore";

import { getFirebase } from "@/lib/firebase";
import type { TaskComment } from "@/lib/types";
import { toComment } from "./mappers";
import { commentDoc, commentsCollection } from "./refs";

export const MAX_COMMENT = 5_000;

/** Comentarios de una tarea en tiempo real, del más antiguo al más nuevo. */
export function subscribeComments(
  projectId: string,
  taskId: string,
  onChange: (comments: TaskComment[]) => void,
  onError?: (error: FirestoreError) => void,
) {
  const { db } = getFirebase();
  return onSnapshot(
    query(commentsCollection(db, projectId, taskId), orderBy("createdAt", "asc")),
    (snapshot) => onChange(snapshot.docs.map(toComment)),
    onError,
  );
}

export function addComment(projectId: string, taskId: string, uid: string, body: string) {
  const text = body.trim().slice(0, MAX_COMMENT);
  if (!text) return Promise.reject(new Error("El comentario está vacío"));
  const { db } = getFirebase();
  return addDoc(commentsCollection(db, projectId, taskId), {
    authorId: uid,
    body: text,
    createdAt: serverTimestamp(),
    editedAt: null,
  });
}

export function editComment(projectId: string, taskId: string, commentId: string, body: string) {
  const text = body.trim().slice(0, MAX_COMMENT);
  if (!text) return Promise.reject(new Error("El comentario está vacío"));
  const { db } = getFirebase();
  return updateDoc(commentDoc(db, projectId, taskId, commentId), { body: text, editedAt: serverTimestamp() });
}

export function deleteComment(projectId: string, taskId: string, commentId: string) {
  const { db } = getFirebase();
  return deleteDoc(commentDoc(db, projectId, taskId, commentId));
}
