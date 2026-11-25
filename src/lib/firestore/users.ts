import { deleteDoc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";

import { getFirebase } from "@/lib/firebase";
import { TERMS_VERSION } from "@/lib/legal";
import { userDoc } from "./refs";

/**
 * Guarda/actualiza el perfil básico del usuario en `users/{uid}` al iniciar
 * sesión. Es privado: solo lo lee y escribe su dueño.
 */
export async function upsertUserProfile(user: User) {
  const { db } = getFirebase();
  const ref = userDoc(db, user.uid);
  const existing = await getDoc(ref);
  await setDoc(
    ref,
    {
      displayName: user.displayName ?? null,
      email: user.email ?? null,
      photoURL: user.photoURL ?? null,
      lastSeenAt: serverTimestamp(),
      ...(existing.get("createdAt") ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true },
  );
}

/** Versión de la foto de perfil subida (`users/{uid}.avatar`), en tiempo real. */
export function subscribeOwnAvatar(uid: string, onChange: (version: number | null) => void) {
  const { db } = getFirebase();
  return onSnapshot(
    userDoc(db, uid),
    (snapshot) => {
      const version = snapshot.get("avatar");
      onChange(typeof version === "number" ? version : null);
    },
    // Sin permiso o sin conexión: se usa la foto de Google.
    () => onChange(null),
  );
}

/** Versión de los términos que aceptó (null si nunca, o si no se puede leer). */
export async function acceptedTermsVersion(uid: string) {
  const { db } = getFirebase();
  const snapshot = await getDoc(userDoc(db, uid));
  const version = snapshot.get("termsVersion");
  return typeof version === "string" ? version : null;
}

/** Deja constancia de que acepta los términos y la política de privacidad vigentes. */
export function acceptTerms(uid: string) {
  const { db } = getFirebase();
  return setDoc(
    userDoc(db, uid),
    { termsVersion: TERMS_VERSION, acceptedTermsAt: serverTimestamp() },
    { merge: true },
  );
}

export async function readUserProfile(uid: string) {
  const { db } = getFirebase();
  const snapshot = await getDoc(userDoc(db, uid));
  return snapshot.exists() ? snapshot.data() : null;
}

export function deleteUserProfile(uid: string) {
  const { db } = getFirebase();
  return deleteDoc(userDoc(db, uid));
}
