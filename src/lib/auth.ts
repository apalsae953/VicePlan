import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  linkWithPopup,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  updatePassword,
  updateProfile,
  type ActionCodeSettings,
  type User,
} from "firebase/auth";

import { getFirebase } from "@/lib/firebase";
import { upsertUserProfile } from "@/lib/firestore/users";

/*
 * Operaciones de Firebase Authentication. Los componentes llaman a estas
 * funciones (nunca al SDK directamente) y muestran `authErrorMessage(error)`.
 *
 * Los emails (verificar cuenta, restablecer contraseña) los envía Firebase
 * Authentication gratis en el plan Spark, en español (`auth.languageCode`).
 */

const PASSWORD_RULES_TEXT = "al menos 8 caracteres, con una letra minúscula y un número";

const AUTH_ERRORS: Record<string, string> = {
  "auth/invalid-credential": "Email o contraseña incorrectos.",
  "auth/invalid-login-credentials": "Email o contraseña incorrectos.",
  "auth/user-not-found": "Email o contraseña incorrectos.",
  "auth/wrong-password": "Email o contraseña incorrectos.",
  "auth/invalid-email": "Ese email no parece válido.",
  "auth/missing-email": "Escribe tu email.",
  "auth/missing-password": "Escribe tu contraseña.",
  "auth/email-already-in-use": "Ya existe una cuenta con ese email. Inicia sesión o recupera la contraseña.",
  "auth/credential-already-in-use": "Esa cuenta ya está registrada en ControlTrabajo.",
  "auth/account-exists-with-different-credential":
    "Ya hay una cuenta con ese email. Entra con el método que usaste al crearla.",
  "auth/provider-already-linked": "Ese método de acceso ya está en tu cuenta.",
  "auth/weak-password": `La contraseña debe tener ${PASSWORD_RULES_TEXT}.`,
  "auth/password-does-not-meet-requirements": `La contraseña debe tener ${PASSWORD_RULES_TEXT}.`,
  "auth/user-disabled": "Esta cuenta está desactivada.",
  "auth/user-mismatch": "Esa no es la cuenta con la que has iniciado sesión.",
  "auth/user-token-expired": "Tu sesión ha caducado. Vuelve a iniciar sesión.",
  "auth/requires-recent-login": "Por seguridad, confirma tu identidad e inténtalo de nuevo.",
  "auth/too-many-requests": "Demasiados intentos. Espera unos minutos y vuelve a probar.",
  "auth/quota-exceeded": "Se ha alcanzado el límite diario de emails del plan gratuito. Inténtalo mañana.",
  "auth/network-request-failed": "Sin conexión. Revisa tu red.",
  "auth/invalid-action-code": "El enlace ya se usó o no es válido. Pide uno nuevo.",
  "auth/expired-action-code": "El enlace ha caducado. Pide uno nuevo.",
  "auth/operation-not-allowed": "Este método de acceso no está activado en Firebase Authentication.",
  "auth/admin-restricted-operation": "El acceso como invitado no está activado en Firebase Authentication.",
  "auth/popup-blocked":
    "El navegador ha bloqueado la ventana de Google. Permite las ventanas emergentes de este sitio y vuelve a probar.",
  "auth/web-storage-unsupported":
    "Tu navegador bloquea el almacenamiento que necesita el inicio de sesión. Prueba fuera del modo privado.",
  "auth/operation-not-supported-in-this-environment": "Este navegador no permite iniciar sesión con Google aquí.",
  "auth/internal-error": "Firebase no ha podido completar la operación. Inténtalo de nuevo.",
};

/** El usuario cerró la ventana de Google: no es un error que mostrar. */
export function isAuthCancel(error: unknown) {
  return (
    error instanceof FirebaseError &&
    (error.code === "auth/popup-closed-by-user" ||
      error.code === "auth/cancelled-popup-request" ||
      error.code === "auth/user-cancelled")
  );
}

export function authErrorMessage(error: unknown, fallback = "No se pudo iniciar sesión.") {
  if (!(error instanceof FirebaseError)) return fallback;
  if (error.code === "auth/unauthorized-domain") {
    const host = typeof window === "undefined" ? "este dominio" : window.location.hostname;
    return `El dominio ${host} no está autorizado para iniciar sesión. Añádelo en Firebase → Authentication → Configuración → Dominios autorizados.`;
  }
  return AUTH_ERRORS[error.code] ?? `${fallback} (${error.code})`;
}

function googleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

/**
 * A dónde vuelve la persona desde el enlace del email ("Continuar"). El
 * dominio tiene que estar autorizado en Firebase; si no, se envía sin él.
 */
function actionSettings(): ActionCodeSettings | undefined {
  if (typeof window === "undefined") return undefined;
  return { url: `${window.location.origin}/login` };
}

async function withActionSettings(send: (settings?: ActionCodeSettings) => Promise<void>) {
  try {
    await send(actionSettings());
  } catch (error) {
    if (error instanceof FirebaseError && error.code === "auth/unauthorized-continue-uri") return send(undefined);
    throw error;
  }
}

// ─── Acceso ──────────────────────────────────────────────────────────────────

export function signInWithGoogle() {
  return signInWithPopup(getFirebase().auth, googleProvider());
}

export function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(getFirebase().auth, email.trim(), password);
}

/**
 * Crea la cuenta, guarda el nombre y envía el email de verificación (las
 * invitaciones a proyectos solo llegan a emails verificados).
 */
export async function signUpWithEmail(name: string, email: string, password: string) {
  const { user } = await createUserWithEmailAndPassword(getFirebase().auth, email.trim(), password);
  await finishEmailAccount(user, name);
}

/** Sesión de invitado: sin registro; los datos quedan ligados a este navegador. */
export function signInAsGuest() {
  return signInAnonymously(getFirebase().auth);
}

/**
 * Email para elegir una contraseña nueva. Con la protección contra la
 * enumeración de emails activa, Firebase no dice si la cuenta existe.
 */
export async function sendPasswordReset(email: string) {
  try {
    await withActionSettings((settings) => sendPasswordResetEmail(getFirebase().auth, email.trim(), settings));
  } catch (error) {
    // Igual que en producción: no revelar qué emails tienen cuenta.
    if (error instanceof FirebaseError && error.code === "auth/user-not-found") return;
    throw error;
  }
}

export function resendVerification(user: User) {
  return withActionSettings((settings) => sendEmailVerification(user, settings));
}

// ─── Cuenta de invitado → cuenta guardada ────────────────────────────────────

/**
 * Convierte la sesión de invitado en una cuenta de Google conservando el uid:
 * todos sus proyectos y tareas siguen siendo suyos.
 */
export async function saveGuestWithGoogle(user: User) {
  const { user: linked } = await linkWithPopup(user, googleProvider());
  await upsertUserProfile(linked);
  return linked;
}

/** Igual que `saveGuestWithGoogle`, con email y contraseña. */
export async function saveGuestWithEmail(user: User, name: string, email: string, password: string) {
  const { user: linked } = await linkWithCredential(user, EmailAuthProvider.credential(email.trim(), password));
  await finishEmailAccount(linked, name);
  return linked;
}

async function finishEmailAccount(user: User, name: string) {
  if (name.trim()) await updateProfile(user, { displayName: name.trim().slice(0, 80) });
  await upsertUserProfile(user);
  // Si falla el envío (cuota, red), la cuenta ya existe: se puede reenviar luego.
  await resendVerification(user).catch((error) => console.warn("[verificación]", error));
}

// ─── Mi cuenta ───────────────────────────────────────────────────────────────

/** Métodos de acceso vinculados a la cuenta. */
export function signInMethods(user: User) {
  const ids = user.providerData.map((provider) => provider.providerId);
  return {
    google: ids.includes("google.com"),
    password: ids.includes("password"),
    guest: user.isAnonymous,
  };
}

/**
 * Confirma la identidad antes de una operación sensible (cambiar la
 * contraseña, borrar la cuenta): con la contraseña actual o con Google.
 */
export async function reauthenticate(user: User, password?: string) {
  const methods = signInMethods(user);
  if (methods.password && password !== undefined) {
    if (!user.email) throw new FirebaseError("auth/missing-email", "Sin email");
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
    return;
  }
  if (methods.google) {
    await reauthenticateWithPopup(user, googleProvider());
    return;
  }
  if (methods.password) throw new FirebaseError("auth/missing-password", "Falta la contraseña");
  // Invitado: no hay credenciales que pedir.
}

/** Cambia la contraseña (pide la actual) o, en cuentas de Google, añade una. */
export async function setAccountPassword(user: User, next: string, current?: string) {
  if (signInMethods(user).password) {
    await reauthenticate(user, current ?? "");
    await updatePassword(user, next);
    return;
  }
  if (!user.email) throw new FirebaseError("auth/missing-email", "Sin email");
  try {
    await linkWithCredential(user, EmailAuthProvider.credential(user.email, next));
  } catch (error) {
    if (!(error instanceof FirebaseError) || error.code !== "auth/requires-recent-login") throw error;
    await reauthenticate(user);
    await linkWithCredential(user, EmailAuthProvider.credential(user.email, next));
  }
}

export async function updateDisplayName(user: User, name: string) {
  await updateProfile(user, { displayName: name.trim().slice(0, 80) || null });
  await upsertUserProfile(user);
}

/**
 * Borra la cuenta de Firebase Authentication. Los datos de Firestore se
 * borran antes (`deleteMyData`), mientras la sesión aún da permiso.
 */
export async function deleteAuthAccount(user: User) {
  try {
    await deleteUser(user);
  } catch (error) {
    // Una sesión de invitado antigua no puede volver a autenticarse: sus datos
    // ya se han borrado, así que basta con cerrar la sesión.
    if (user.isAnonymous && error instanceof FirebaseError && error.code === "auth/requires-recent-login") return;
    throw error;
  }
}
