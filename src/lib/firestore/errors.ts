import { FirebaseError } from "firebase/app";

const MESSAGES: Record<string, string> = {
  "permission-denied": "No tienes permiso para hacer esto en este proyecto.",
  unavailable: "Sin conexión con Firestore. Los cambios se enviarán al reconectar.",
  "not-found": "El elemento ya no existe.",
  "failed-precondition": "No se pudo completar la operación. Inténtalo de nuevo.",
  aborted: "Otro cambio se cruzó con este. Inténtalo de nuevo.",
  "resource-exhausted": "Se ha alcanzado el límite de uso de Firestore.",
  unauthenticated: "Tu sesión ha caducado. Vuelve a iniciar sesión.",
};

/** Error de Firebase → mensaje en español para un toast. */
export function firestoreErrorMessage(error: unknown, fallback: string) {
  if (error instanceof FirebaseError) {
    const code = error.code.replace(/^firestore\//, "");
    if (MESSAGES[code]) return MESSAGES[code];
  }
  console.error(error);
  return fallback;
}
