import {
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type FirestoreError,
} from "firebase/firestore";
import type { User } from "firebase/auth";

import { DEFAULT_CATEGORIES, MAX_CATEGORIES } from "@/lib/constants";
import { getFirebase } from "@/lib/firebase";
import type { ProjectCategory, ProjectSummary } from "@/lib/types";
import { toProjectSummary } from "./mappers";
import { profileOf } from "./members";
import { projectDoc, projectsCollection, tasksCollection } from "./refs";

/**
 * Proyectos en los que el usuario es miembro, en tiempo real, del más
 * reciente al más antiguo. Se ordena en cliente para no necesitar un índice
 * compuesto (array-contains + orderBy).
 */
export function subscribeMyProjects(
  uid: string,
  onChange: (projects: ProjectSummary[]) => void,
  onError: (error: FirestoreError) => void,
) {
  const { db } = getFirebase();
  return onSnapshot(
    query(projectsCollection(db), where("memberIds", "array-contains", uid)),
    (snapshot) => {
      const projects = snapshot.docs.map(toProjectSummary).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      onChange(projects);
    },
    onError,
  );
}

/** "Project: Aethelgard" → "AET"; "Ember Run" → "ER". */
export function suggestProjectKey(name: string) {
  const words = name
    .replace(/^project:\s*/i, "")
    .normalize("NFD")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const key =
    words.length > 1 ? words.map((w) => w[0]).join("") : (words[0] ?? "").slice(0, 3);
  return key.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5) || "PRJ";
}

export async function createProject(user: User, input: { name: string; key: string; description: string | null }) {
  const name = input.name.trim().slice(0, 100);
  const key = input.key.trim().toUpperCase();
  if (!name) throw new Error("El proyecto necesita un nombre");
  if (!/^[A-Z0-9]{2,5}$/.test(key)) throw new Error("La clave debe tener de 2 a 5 letras o números");

  const { db } = getFirebase();
  const ref = doc(projectsCollection(db));
  await setDoc(ref, {
    ...newProjectFields(user),
    name,
    key,
    description: input.description?.trim() || null,
  });
  return ref.id;
}

/** Campos comunes de un proyecto nuevo: el creador es propietario y único miembro. */
export function newProjectFields(user: User) {
  return {
    ownerId: user.uid,
    memberIds: [user.uid],
    members: { [user.uid]: profileOf(user) },
    invitedEmails: [] as string[],
    categories: DEFAULT_CATEGORIES,
    inviteCode: null,
    taskCounter: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

/** Datos básicos del proyecto (la clave no cambia: numera las tareas). */
export function updateProjectDetails(projectId: string, input: { name: string; description: string | null }) {
  const name = input.name.trim().slice(0, 100);
  if (!name) return Promise.reject(new Error("El proyecto necesita un nombre"));
  const { db } = getFirebase();
  return updateDoc(doc(projectsCollection(db), projectId), {
    name,
    description: input.description?.trim().slice(0, 2000) || null,
    updatedAt: serverTimestamp(),
  });
}

function cleanCategories(categories: ProjectCategory[]) {
  return categories.slice(0, MAX_CATEGORIES).map((category) => ({
    id: category.id,
    name: category.name.trim().slice(0, 40) || "Categoría",
    color: category.color,
    icon: category.icon,
  }));
}

/** Guarda la lista completa de categorías (orden incluido). */
export function updateProjectCategories(projectId: string, categories: ProjectCategory[]) {
  const { db } = getFirebase();
  return updateDoc(projectDoc(db, projectId), { categories: cleanCategories(categories), updatedAt: serverTimestamp() });
}

/**
 * Borra una categoría y pasa sus tareas a otra, todo en un batch: ninguna
 * tarea se queda apuntando a una categoría que ya no existe.
 */
export async function deleteCategory(projectId: string, categories: ProjectCategory[], removedId: string, targetId: string) {
  const { db } = getFirebase();
  const batch = writeBatch(db);
  batch.update(projectDoc(db, projectId), {
    categories: cleanCategories(categories.filter((category) => category.id !== removedId)),
    updatedAt: serverTimestamp(),
  });
  const affected = await getDocs(query(tasksCollection(db, projectId), where("category", "==", removedId)));
  affected.forEach((task) => batch.update(task.ref, { category: targetId, updatedAt: serverTimestamp() }));
  await batch.commit();
  return affected.size;
}
