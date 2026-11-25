"use client";

import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { onIdTokenChanged, signOut as firebaseSignOut, type User } from "firebase/auth";

import { clearLocalCache, getFirebase, isFirebaseConfigured } from "@/lib/firebase";
import { setOwnPhoto } from "@/lib/firestore/members";
import { avatarMarker } from "@/lib/firestore/stored-images";
import { subscribeOwnAvatar, upsertUserProfile } from "@/lib/firestore/users";

export type AuthStatus = "loading" | "signed-in" | "signed-out" | "unconfigured";

type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  /** Sesión de invitado (Firebase Anonymous Auth): sin email ni contraseña. */
  isGuest: boolean;
  /**
   * Cambia cada vez que Firebase emite un token nuevo (inicio de sesión,
   * email verificado, cuenta de invitado guardada…). El objeto `User` es el
   * mismo y muta por dentro: depender de `version` fuerza el re-render.
   */
  version: number;
  /**
   * Foto de perfil efectiva: la subida en VicePlan (`avatar:<uid>?v=…`), la
   * de Google o null. Es la que ven los demás miembros.
   */
  photoURL: string | null;
  /** Versión de la foto subida (null si no hay): para "Quitar foto". */
  customPhoto: number | null;
  signOut: () => Promise<void>;
  /** Recarga el usuario y fuerza un token nuevo (p. ej. tras verificar el email). */
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Estado de sesión de Firebase Auth para toda la app. Arranca en "loading"
 * (igual en servidor y cliente: sin desajustes de hidratación) y se resuelve
 * en el navegador con onIdTokenChanged. Sin variables de entorno, queda en
 * "unconfigured" y la UI explica cómo configurarlo.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ status: AuthStatus; user: User | null; version: number }>(() => ({
    status: isFirebaseConfigured() ? "loading" : "unconfigured",
    user: null,
    version: 0,
  }));

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    const { auth } = getFirebase();
    let profileSavedFor: string | null = null;
    return onIdTokenChanged(auth, (user) => {
      setState((current) => ({ status: user ? "signed-in" : "signed-out", user, version: current.version + 1 }));
      // El perfil se guarda una vez por sesión, no en cada renovación horaria del token.
      if (user && user.uid !== profileSavedFor) {
        profileSavedFor = user.uid;
        void upsertUserProfile(user).catch((error) => console.warn("[perfil]", error));
      }
      if (!user) profileSavedFor = null;
    });
  }, []);

  // Foto subida por el usuario (`users/{uid}.avatar`), en tiempo real.
  const uid = state.user?.uid ?? null;
  const [avatar, setAvatar] = useState<{ uid: string; version: number | null } | null>(null);
  useEffect(() => {
    if (!uid) return;
    return subscribeOwnAvatar(uid, (version) => setAvatar({ uid, version }));
  }, [uid]);
  const customPhoto = avatar && avatar.uid === uid ? avatar.version : null;
  const photoURL = uid && customPhoto ? avatarMarker(uid, customPhoto) : (state.user?.photoURL ?? null);
  // Los perfiles que se publican en los proyectos (profileOf) usan esta foto.
  useEffect(() => {
    if (uid) setOwnPhoto(uid, photoURL);
  }, [uid, photoURL]);

  const signOut = useCallback(async () => {
    if (!isFirebaseConfigured()) return;
    await firebaseSignOut(getFirebase().auth);
    await clearLocalCache();
    // Recarga completa a /login (sin `?next=`): descarta stores, listeners y la
    // ruta del proyecto anterior, que la siguiente cuenta quizá no pueda abrir.
    window.location.replace("/login");
  }, []);

  const refresh = useCallback(async () => {
    const current = getFirebase().auth.currentUser;
    if (!current) return;
    await current.reload();
    await current.getIdToken(true);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, isGuest: state.user?.isAnonymous ?? false, photoURL, customPhoto, signOut, refresh }),
    [state, photoURL, customPhoto, signOut, refresh],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const value = use(AuthContext);
  if (!value) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return value;
}

/** Usuario actual en zonas protegidas por <AuthGate> (siempre existe). */
export function useCurrentUser(): User {
  const { user } = useAuth();
  if (!user) throw new Error("useCurrentUser solo funciona dentro de <AuthGate>");
  return user;
}

/** Nombre visible del usuario actual ("Invitado" en sesiones anónimas). */
export function displayNameOf(user: User) {
  if (user.isAnonymous) return "Invitado";
  return user.displayName || user.email?.split("@")[0] || "Usuario";
}
