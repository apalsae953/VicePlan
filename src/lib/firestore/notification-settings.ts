import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";

import { getFirebase } from "@/lib/firebase";

/** Qué avisos por email quiere recibir cada persona (`notificationSettings/{uid}`). */
export type NotificationSettings = {
  /** Le asignan una tarea. */
  assigned: boolean;
  /** Comentan en una tarea suya (responsable o autor). */
  comments: boolean;
  /** Proyectos: le transfieren la propiedad. */
  projects: boolean;
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = { assigned: true, comments: true, projects: true };

export function subscribeNotificationSettings(uid: string, onChange: (settings: NotificationSettings) => void) {
  const { db } = getFirebase();
  return onSnapshot(
    doc(db, "notificationSettings", uid),
    (snapshot) => {
      const data = snapshot.data() ?? {};
      onChange({
        assigned: data.assigned !== false,
        comments: data.comments !== false,
        projects: data.projects !== false,
      });
    },
    () => onChange(DEFAULT_NOTIFICATION_SETTINGS),
  );
}

export function saveNotificationSettings(uid: string, settings: NotificationSettings) {
  const { db } = getFirebase();
  return setDoc(doc(db, "notificationSettings", uid), { ...settings, updatedAt: serverTimestamp() });
}
