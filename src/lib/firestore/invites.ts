import { arrayUnion, getDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import type { User } from "firebase/auth";

import { getFirebase } from "@/lib/firebase";
import { addActivityToBatch } from "./activity";
import { profileOf } from "./members";
import { inviteCodeDoc, joinDoc, projectDoc } from "./refs";

/*
 * Unirse con código (o enlace /unirse/CÓDIGO), además de la invitación por
 * email. El código vive en dos sitios:
 *   - `projects/{id}.inviteCode`: el que vale ahora (null = desactivado),
 *   - `inviteCodes/{código}`: a qué proyecto lleva y su nombre, para que quien
 *     aún no es miembro pueda verlo antes de unirse (lectura por id, sin listar).
 * Para unirse, el usuario escribe `projects/{id}/joins/{uid}` con el código en
 * el mismo batch que se añade a `memberIds`; las reglas comparan ese código con
 * el del proyecto (getAfter), así que solo entra quien lo conoce.
 */

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O ni 1/I
const CODE_LENGTH = 8;

function randomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
}

/** "K7QX3MPA" → "K7QX-3MPA" */
export function formatInviteCode(code: string) {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/** Acepta "k7qx-3mpa", "K7QX3MPA" o un enlace …/unirse/K7QX-3MPA. */
export function parseInviteCode(input: string) {
  const fromLink = input.match(/unirse\/([A-Za-z0-9-]+)/)?.[1] ?? input;
  const code = fromLink.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return code.length === CODE_LENGTH && [...code].every((char) => ALPHABET.includes(char)) ? code : null;
}

export function inviteLink(code: string) {
  return `${window.location.origin}/unirse/${formatInviteCode(code)}`;
}

/** Crea (o renueva) el código del proyecto; el anterior deja de funcionar. */
export async function createInviteCode(projectId: string, projectName: string, uid: string, previous: string | null) {
  const { db } = getFirebase();
  const code = randomCode();
  const batch = writeBatch(db);
  if (previous) batch.delete(inviteCodeDoc(db, previous));
  batch.set(inviteCodeDoc(db, code), {
    projectId,
    projectName: projectName.slice(0, 100),
    createdBy: uid,
    createdAt: serverTimestamp(),
  });
  batch.update(projectDoc(db, projectId), { inviteCode: code, updatedAt: serverTimestamp() });
  await batch.commit();
  return code;
}

export async function disableInviteCode(projectId: string, code: string) {
  const { db } = getFirebase();
  const batch = writeBatch(db);
  batch.delete(inviteCodeDoc(db, code));
  batch.update(projectDoc(db, projectId), { inviteCode: null, updatedAt: serverTimestamp() });
  await batch.commit();
}

/** A qué proyecto lleva un código (null si no existe o se desactivó). */
export async function resolveInviteCode(code: string) {
  const { db } = getFirebase();
  const snapshot = await getDoc(inviteCodeDoc(db, code));
  const data = snapshot.data();
  if (!data || typeof data.projectId !== "string") return null;
  return { projectId: data.projectId, projectName: typeof data.projectName === "string" ? data.projectName : "Proyecto" };
}

/** Une al usuario al proyecto del código. Devuelve el id del proyecto. */
export async function joinWithCode(code: string, user: User, projectId: string) {
  const { db } = getFirebase();
  const batch = writeBatch(db);
  batch.set(joinDoc(db, projectId, user.uid), { code, createdAt: serverTimestamp() });
  batch.update(projectDoc(db, projectId), {
    memberIds: arrayUnion(user.uid),
    [`members.${user.uid}`]: profileOf(user),
    updatedAt: serverTimestamp(),
  });
  addActivityToBatch(batch, projectId, user.uid, { type: "member.joined", data: { via: "code" } });
  await batch.commit();
  return projectId;
}
