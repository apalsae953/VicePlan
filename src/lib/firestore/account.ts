import {
  Bytes,
  collectionGroup,
  deleteDoc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentReference,
  type Firestore,
} from "firebase/firestore";
import type { User } from "firebase/auth";

import { getFirebase } from "@/lib/firebase";
import { declineInvitation, normalizeEmail, removeMember } from "./members";
import {
  activityCollection,
  commentsCollection,
  gddAssetsCollection,
  gddCollection,
  inviteCodeDoc,
  joinDoc,
  joinsCollection,
  milestonesCollection,
  projectDoc,
  projectsCollection,
  tasksCollection,
} from "./refs";
import { deleteUserProfile, readUserProfile } from "./users";

/*
 * Derechos sobre los datos personales (RGPD arts. 15, 17 y 20): descargar
 * una copia y borrar la cuenta. Todo se hace desde el navegador con los
 * permisos del propio usuario (plan Spark: sin Cloud Functions).
 */

// ─── Utilidades ──────────────────────────────────────────────────────────────

/** Convierte un documento de Firestore en JSON (fechas ISO, sin binarios). */
function plain(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Bytes) return `[${value.toUint8Array().byteLength} bytes]`;
  if (Array.isArray(value)) return value.map(plain);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, plain(inner)]));
  }
  return value;
}

/** Borra referencias en lotes (límite de 500 escrituras por batch). */
async function deleteInBatches(db: Firestore, refs: DocumentReference[]) {
  for (let i = 0; i < refs.length; i += 400) {
    const batch = writeBatch(db);
    refs.slice(i, i + 400).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}

function myProjects(db: Firestore, uid: string) {
  return getDocs(query(projectsCollection(db), where("memberIds", "array-contains", uid)));
}

function myComments(db: Firestore, uid: string) {
  return getDocs(query(collectionGroup(db, "comments"), where("authorId", "==", uid)));
}

// ─── Descargar mis datos ─────────────────────────────────────────────────────

/**
 * Copia de los datos personales del usuario: cuenta, perfil, proyectos de
 * los que es miembro, tareas que creó o tiene asignadas, sus comentarios y
 * su actividad. Devuelve el JSON listo para descargar.
 */
export async function exportMyData(user: User) {
  const { db } = getFirebase();
  const [profile, projects, comments] = await Promise.all([
    readUserProfile(user.uid),
    myProjects(db, user.uid),
    myComments(db, user.uid).catch(() => null),
  ]);

  const projectData = await Promise.all(
    projects.docs.map(async (project) => {
      const tasks = tasksCollection(db, project.id);
      const [created, assigned, activity] = await Promise.all([
        getDocs(query(tasks, where("createdBy", "==", user.uid))),
        getDocs(query(tasks, where("assigneeId", "==", user.uid))),
        getDocs(query(activityCollection(db, project.id), where("actorId", "==", user.uid))),
      ]);
      const taskMap = new Map([...created.docs, ...assigned.docs].map((task) => [task.id, { id: task.id, ...task.data() }]));
      const data = project.data();
      return {
        id: project.id,
        name: data.name,
        key: data.key,
        role: data.ownerId === user.uid ? "propietario" : "miembro",
        myProfileInProject: plain(data.members?.[user.uid] ?? null),
        tasksCreatedOrAssigned: plain([...taskMap.values()]),
        myActivity: plain(activity.docs.map((event) => ({ id: event.id, ...event.data() }))),
      };
    }),
  );

  return {
    exportedAt: new Date().toISOString(),
    app: "ControlTrabajo",
    account: {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      emailVerified: user.emailVerified,
      photoURL: user.photoURL,
      guest: user.isAnonymous,
      signInMethods: user.providerData.map((provider) => provider.providerId),
      createdAt: user.metadata.creationTime ?? null,
      lastSignInAt: user.metadata.lastSignInTime ?? null,
    },
    profile: plain(profile),
    projects: projectData,
    comments: comments
      ? plain(
          comments.docs.map((comment) => ({
            path: comment.ref.path,
            ...comment.data(),
          })),
        )
      : "No se pudieron leer los comentarios.",
  };
}

// ─── Proyectos: transferir y eliminar ────────────────────────────────────────

/** El propietario cede el proyecto a otro miembro (que pasa a poder borrarlo). */
export function transferOwnership(projectId: string, newOwnerId: string) {
  const { db } = getFirebase();
  return updateDoc(projectDoc(db, projectId), { ownerId: newOwnerId, updatedAt: serverTimestamp() });
}

/**
 * Elimina un proyecto con todo su contenido (tareas y comentarios, hitos,
 * documento de diseño, imágenes, actividad y código de invitación). Solo el
 * propietario. El documento del proyecto se borra al final: las reglas
 * comprueban la pertenencia contra él.
 */
export async function deleteProjectCompletely(projectId: string, inviteCode: string | null) {
  const { db } = getFirebase();
  const tasks = await getDocs(tasksCollection(db, projectId));
  const [comments, milestones, gdd, assets, activity, joins] = await Promise.all([
    Promise.all(tasks.docs.map((task) => getDocs(commentsCollection(db, projectId, task.id)))),
    getDocs(milestonesCollection(db, projectId)),
    getDocs(gddCollection(db, projectId)),
    getDocs(gddAssetsCollection(db, projectId)),
    getDocs(activityCollection(db, projectId)),
    getDocs(joinsCollection(db, projectId)),
  ]);

  await deleteInBatches(db, [
    ...comments.flatMap((snapshot) => snapshot.docs.map((comment) => comment.ref)),
    ...[tasks, milestones, gdd, assets, activity, joins].flatMap((snapshot) => snapshot.docs.map((item) => item.ref)),
  ]);
  if (inviteCode) await deleteDoc(inviteCodeDoc(db, inviteCode)).catch(() => undefined);
  await deleteDoc(projectDoc(db, projectId));
}

// ─── Borrar mi cuenta ────────────────────────────────────────────────────────

/** Qué hacer con cada proyecto propio que tiene más miembros. */
export type OwnedProjectPlan = Record<string, { action: "transfer"; to: string } | { action: "delete" }>;

/**
 * Borra los datos personales del usuario antes de eliminar su cuenta:
 * - sus comentarios en cualquier proyecto;
 * - sus proyectos propios sin más miembros (enteros) y, en los compartidos,
 *   lo que haya elegido (transferir o eliminar);
 * - su pertenencia al resto (sale y sus tareas quedan sin responsable);
 * - sus invitaciones pendientes y su perfil (`users/{uid}`).
 * Las tareas que creó en proyectos compartidos son del equipo y se quedan,
 * sin datos suyos (solo su id interno, que ya no lleva a ningún perfil).
 */
export async function deleteMyData(user: User, plan: OwnedProjectPlan, onProgress?: (step: string) => void) {
  const { db } = getFirebase();

  onProgress?.("Borrando tus comentarios…");
  const comments = await myComments(db, user.uid);
  await deleteInBatches(
    db,
    comments.docs.map((comment) => comment.ref),
  );

  onProgress?.("Revisando tus proyectos…");
  const projects = await myProjects(db, user.uid);
  for (const project of projects.docs) {
    const data = project.data();
    const memberIds: string[] = Array.isArray(data.memberIds) ? data.memberIds : [];
    const inviteCode = typeof data.inviteCode === "string" ? data.inviteCode : null;
    const owner = data.ownerId === user.uid;
    const others = memberIds.filter((id) => id !== user.uid);

    const leave = async () => {
      await removeMember(project.id, user.uid);
      // La prueba del código con el que entró (si la hay) ya no sirve.
      await deleteDoc(joinDoc(db, project.id, user.uid)).catch(() => undefined);
    };

    if (!owner) {
      await leave();
      continue;
    }
    const choice = plan[project.id];
    if (others.length > 0 && choice?.action === "transfer" && others.includes(choice.to)) {
      onProgress?.(`Transfiriendo «${data.name}»…`);
      await transferOwnership(project.id, choice.to);
      await leave();
    } else {
      onProgress?.(`Eliminando «${data.name}»…`);
      await deleteProjectCompletely(project.id, inviteCode);
    }
  }

  if (user.email && user.emailVerified) {
    const invited = await getDocs(
      query(projectsCollection(db), where("invitedEmails", "array-contains", normalizeEmail(user.email))),
    ).catch(() => null);
    for (const project of invited?.docs ?? []) await declineInvitation(project.id, user).catch(() => undefined);
  }

  onProgress?.("Borrando tu perfil…");
  await deleteUserProfile(user.uid);
}
