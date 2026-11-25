import { collection, doc, type Firestore } from "firebase/firestore";

/*
 * Estructura de Firestore:
 *
 *   users/{uid}                          perfil básico (nombre, email, foto)
 *   projects/{projectId}                 name, key, description, ownerId,
 *                                        memberIds[], taskCounter, timestamps
 *   projects/{projectId}/milestones/{id} hitos del proyecto
 *   projects/{projectId}/tasks/{id}      tareas (milestoneId/gddNodeId = refs)
 *   projects/{projectId}/gddNodes/{id}   árbol del GDD (parentId) + contenido
 *
 * Subcolecciones por proyecto: un listener por colección trae todo el
 * workspace, las reglas comprueban la pertenencia con un solo `get()` del
 * proyecto, y un proyecto grande no penaliza a los demás.
 */

export const usersCollection = (db: Firestore) => collection(db, "users");
export const userDoc = (db: Firestore, uid: string) => doc(db, "users", uid);

export const projectsCollection = (db: Firestore) => collection(db, "projects");
export const projectDoc = (db: Firestore, projectId: string) => doc(db, "projects", projectId);

export const milestonesCollection = (db: Firestore, projectId: string) =>
  collection(db, "projects", projectId, "milestones");
export const milestoneDoc = (db: Firestore, projectId: string, milestoneId: string) =>
  doc(db, "projects", projectId, "milestones", milestoneId);

export const tasksCollection = (db: Firestore, projectId: string) => collection(db, "projects", projectId, "tasks");
export const taskDoc = (db: Firestore, projectId: string, taskId: string) =>
  doc(db, "projects", projectId, "tasks", taskId);

export const gddCollection = (db: Firestore, projectId: string) => collection(db, "projects", projectId, "gddNodes");
export const gddDoc = (db: Firestore, projectId: string, nodeId: string) =>
  doc(db, "projects", projectId, "gddNodes", nodeId);

export const commentsCollection = (db: Firestore, projectId: string, taskId: string) =>
  collection(db, "projects", projectId, "tasks", taskId, "comments");
export const commentDoc = (db: Firestore, projectId: string, taskId: string, commentId: string) =>
  doc(db, "projects", projectId, "tasks", taskId, "comments", commentId);

/** Registro de actividad del proyecto (inmutable). */
export const activityCollection = (db: Firestore, projectId: string) =>
  collection(db, "projects", projectId, "activity");

/** Prueba de que un usuario conocía el código al unirse (las reglas la comprueban). */
export const joinDoc = (db: Firestore, projectId: string, uid: string) => doc(db, "projects", projectId, "joins", uid);
export const joinsCollection = (db: Firestore, projectId: string) => collection(db, "projects", projectId, "joins");

/** `inviteCodes/{código}` → proyecto al que da acceso (legible por cualquiera con sesión, sin listar). */
export const inviteCodeDoc = (db: Firestore, code: string) => doc(db, "inviteCodes", code);

/** Imágenes del GDD (comprimidas, en bytes): se leen bajo demanda, sin listener. */
export const gddAssetsCollection = (db: Firestore, projectId: string) =>
  collection(db, "projects", projectId, "gddAssets");
export const gddAssetDoc = (db: Firestore, projectId: string, assetId: string) =>
  doc(db, "projects", projectId, "gddAssets", assetId);
