import {
  arrayRemove,
  arrayUnion,
  deleteField,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type FirestoreError,
} from "firebase/firestore";
import type { User } from "firebase/auth";

import { getFirebase } from "@/lib/firebase";
import type { MemberProfile, ProjectSummary } from "@/lib/types";
import { addActivityToBatch } from "./activity";
import { toProjectSummary } from "./mappers";
import { projectDoc, projectsCollection, tasksCollection } from "./refs";

/*
 * Miembros e invitaciones.
 *
 * Invitar no necesita saber el uid de nadie: se guarda el email (en
 * minúsculas) en `invitedEmails`. Cuando esa persona inicia sesión con ese
 * email verificado, ve la invitación y al aceptarla se añade a `memberIds` y
 * escribe su propio perfil en `members`. Las reglas garantizan cada paso.
 */

export const MAX_MEMBERS = 50;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  return EMAIL.test(normalizeEmail(email));
}

/**
 * Foto efectiva del usuario actual (la subida en VicePlan o la de Google), que
 * mantiene al día `AuthProvider`. Así `profileOf` sirve en cualquier sitio
 * sin pasar la foto por todas las llamadas.
 */
let ownPhoto: { uid: string; photoURL: string | null } | null = null;

export function setOwnPhoto(uid: string, photoURL: string | null) {
  ownPhoto = { uid, photoURL };
}

/** Perfil público mínimo del usuario para `projects/{id}.members`. */
export function profileOf(user: User): MemberProfile {
  const photoURL = ownPhoto && ownPhoto.uid === user.uid ? ownPhoto.photoURL : user.photoURL;
  return {
    name: user.displayName?.trim().slice(0, 200) || null,
    email: user.email ? normalizeEmail(user.email) : null,
    photoURL: photoURL?.slice(0, 2048) || null,
  };
}

/** Cualquier miembro puede invitar por email. */
export function inviteByEmail(projectId: string, email: string) {
  const { db } = getFirebase();
  return updateDoc(projectDoc(db, projectId), {
    invitedEmails: arrayUnion(normalizeEmail(email)),
    updatedAt: serverTimestamp(),
  });
}

export function cancelInvitation(projectId: string, email: string) {
  const { db } = getFirebase();
  return updateDoc(projectDoc(db, projectId), {
    invitedEmails: arrayRemove(normalizeEmail(email)),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Quita a un miembro (el propietario a cualquiera; cada miembro a sí mismo
 * para salir). Sus tareas quedan sin responsable en el mismo batch, para que
 * nadie quede asignado a alguien que ya no está en el equipo.
 */
export async function removeMember(projectId: string, uid: string) {
  const { db } = getFirebase();
  const batch = writeBatch(db);
  batch.update(projectDoc(db, projectId), {
    memberIds: arrayRemove(uid),
    [`members.${uid}`]: deleteField(),
    updatedAt: serverTimestamp(),
  });
  const assigned = await getDocs(query(tasksCollection(db, projectId), where("assigneeId", "==", uid)));
  assigned.forEach((task) => batch.update(task.ref, { assigneeId: null, updatedAt: serverTimestamp() }));
  await batch.commit();
}

/** Aceptar una invitación: entrar en memberIds y publicar el propio perfil. */
export function acceptInvitation(projectId: string, user: User) {
  const { db } = getFirebase();
  if (!user.email) return Promise.reject(new Error("Tu cuenta no tiene email"));
  const batch = writeBatch(db);
  batch.update(projectDoc(db, projectId), {
    memberIds: arrayUnion(user.uid),
    invitedEmails: arrayRemove(normalizeEmail(user.email)),
    [`members.${user.uid}`]: profileOf(user),
    updatedAt: serverTimestamp(),
  });
  addActivityToBatch(batch, projectId, user.uid, { type: "member.joined", data: { via: "email" } });
  return batch.commit();
}

/** Rechazar: quitar el propio email de la lista de invitados. */
export function declineInvitation(projectId: string, user: User) {
  const { db } = getFirebase();
  if (!user.email) return Promise.reject(new Error("Tu cuenta no tiene email"));
  return updateDoc(projectDoc(db, projectId), {
    invitedEmails: arrayRemove(normalizeEmail(user.email)),
    updatedAt: serverTimestamp(),
  });
}

/** Mantiene al día el propio nombre/avatar en un proyecto (p. ej. tras cambiarlo en Google). */
export function syncOwnProfile(projectId: string, user: User) {
  const { db } = getFirebase();
  return updateDoc(projectDoc(db, projectId), {
    [`members.${user.uid}`]: profileOf(user),
    updatedAt: serverTimestamp(),
  });
}

/** Invitaciones pendientes para el email (verificado) del usuario, en tiempo real. */
export function subscribeInvitations(
  email: string,
  onChange: (projects: ProjectSummary[]) => void,
  onError: (error: FirestoreError) => void,
) {
  const { db } = getFirebase();
  return onSnapshot(
    query(projectsCollection(db), where("invitedEmails", "array-contains", normalizeEmail(email))),
    (snapshot) => onChange(snapshot.docs.map(toProjectSummary)),
    onError,
  );
}
