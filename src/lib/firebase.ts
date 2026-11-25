import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import {
  clearIndexedDbPersistence,
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  terminate,
  type Firestore,
} from "firebase/firestore";

/*
 * Configuración de Firebase (Auth + Firestore) desde variables de entorno.
 *
 * - Las NEXT_PUBLIC_* se incrustan en el build; deben leerse una a una (Next
 *   no resuelve accesos dinámicos a process.env en el cliente).
 * - La inicialización es perezosa y solo en el navegador: el build y el SSR
 *   nunca tocan Firebase, así que compila aunque falten credenciales.
 * - Con NEXT_PUBLIC_FIREBASE_USE_EMULATORS=true se conecta al Emulator Suite
 *   local (`npm run emulators`) y no necesita credenciales reales.
 */

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const usingEmulators = process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATORS === "true";

/** ¿Hay configuración suficiente para arrancar? (puro: igual en servidor y cliente). */
export function isFirebaseConfigured() {
  if (usingEmulators) return Boolean(firebaseConfig.projectId);
  return Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId);
}

type FirebaseServices = { app: FirebaseApp; auth: Auth; db: Firestore };

// En globalThis para sobrevivir al HMR: conectar dos veces al emulador falla.
const globalForFirebase = globalThis as unknown as { __controlTrabajoFirebase?: FirebaseServices };

export function getFirebase(): FirebaseServices {
  if (typeof window === "undefined") {
    throw new Error("Firebase solo se inicializa en el navegador.");
  }
  if (globalForFirebase.__controlTrabajoFirebase) return globalForFirebase.__controlTrabajoFirebase;
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase no está configurado: copia .env.example a .env.local y rellena las claves.");
  }

  const app = getApps().length
    ? getApp()
    : initializeApp(
        usingEmulators
          ? { ...firebaseConfig, apiKey: firebaseConfig.apiKey || "demo-api-key" }
          : firebaseConfig,
      );
  const auth = getAuth(app);
  // Emails de verificación y de cambio de contraseña en español.
  auth.languageCode = "es";

  let db: Firestore;
  try {
    db = initializeFirestore(app, {
      // Caché local persistente (IndexedDB, varias pestañas): recargas
      // instantáneas y escrituras que esperan si se pierde la conexión.
      // Con el emulador, caché en memoria para no mezclar datos entre reinicios.
      localCache: usingEmulators
        ? memoryLocalCache()
        : persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      ignoreUndefinedProperties: true,
    });
  } catch {
    db = getFirestore(app);
  }

  if (usingEmulators) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
  }

  globalForFirebase.__controlTrabajoFirebase = { app, auth, db };
  return globalForFirebase.__controlTrabajoFirebase;
}

/**
 * Al cerrar sesión, borra la caché local de Firestore (IndexedDB) para que
 * en un ordenador compartido no queden datos de la cuenta anterior. Si otra
 * pestaña de la app sigue abierta, la caché está en uso y se deja (se
 * sobrescribe con la siguiente cuenta y las reglas siguen protegiendo el
 * servidor).
 */
export async function clearLocalCache() {
  const services = globalForFirebase.__controlTrabajoFirebase;
  if (!services) return;
  try {
    await terminate(services.db);
    await clearIndexedDbPersistence(services.db);
  } catch (error) {
    console.warn("[caché]", error);
  }
}
