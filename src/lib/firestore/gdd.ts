import { doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from "firebase/firestore";

import { getFirebase } from "@/lib/firebase";
import type { BoardGddNode, GddNodePatch } from "@/lib/types";
import { gddAssetsCollection, gddCollection, gddDoc, tasksCollection } from "./refs";

const MAX_TITLE = 160;
/** Margen bajo el límite de 1 MiB por documento de Firestore. */
export const MAX_GDD_CONTENT = 200_000;

/**
 * Crea una página. El id se genera en el cliente, así que el nodo puede
 * entrar en el store y abrirse al instante; `write` termina cuando el
 * servidor confirma.
 */
export function createGddNode(
  projectId: string,
  input: { title: string; parentId: string | null; position: number },
) {
  const { db } = getFirebase();
  const ref = doc(gddCollection(db, projectId));
  const title = input.title.trim().slice(0, MAX_TITLE) || "Página sin título";
  const write = setDoc(ref, {
    title,
    parentId: input.parentId,
    position: input.position,
    content: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const node: BoardGddNode = {
    id: ref.id,
    title,
    parentId: input.parentId,
    position: input.position,
    updatedAt: new Date().toISOString(),
  };
  return { node, write };
}

export function updateGddNode(projectId: string, nodeId: string, patch: GddNodePatch) {
  const { db } = getFirebase();
  const data: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (patch.title !== undefined) data.title = patch.title.trim().slice(0, MAX_TITLE);
  if (patch.content !== undefined) {
    if (patch.content.length > MAX_GDD_CONTENT) {
      return Promise.reject(new Error("El documento es demasiado largo"));
    }
    data.content = patch.content;
  }
  return updateDoc(gddDoc(db, projectId, nodeId), data);
}

/**
 * Borra una página y su subárbol, sus imágenes, y desvincula las tareas que
 * apuntaban a ellos. Firestore no tiene borrado en cascada: se hace en un
 * único batch atómico.
 */
export async function deleteGddSubtree(projectId: string, nodeIds: string[]) {
  const { db } = getFirebase();
  const batch = writeBatch(db);
  for (const id of nodeIds) batch.delete(gddDoc(db, projectId, id));

  // `in` admite hasta 30 valores por consulta.
  for (let i = 0; i < nodeIds.length; i += 30) {
    const chunk = nodeIds.slice(i, i + 30);
    const linked = await getDocs(query(tasksCollection(db, projectId), where("gddNodeId", "in", chunk)));
    linked.forEach((task) => batch.update(task.ref, { gddNodeId: null, updatedAt: serverTimestamp() }));
    const images = await getDocs(query(gddAssetsCollection(db, projectId), where("nodeId", "in", chunk)));
    images.forEach((image) => batch.delete(image.ref));
  }

  await batch.commit();
}
