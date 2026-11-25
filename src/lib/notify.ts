import { getFirebase } from "@/lib/firebase";

/*
 * Avisos por email: se piden al servidor (`/api/notify`) después de que el
 * cambio esté guardado. Son "dispara y olvida": si fallan, la acción ya está
 * hecha y no se molesta al usuario. El servidor decide a quién avisar y lo
 * comprueba todo con los permisos de quien llama.
 */

export type NotifyEvent =
  | { type: "assigned"; projectId: string; taskId: string }
  | { type: "comment"; projectId: string; taskId: string; commentId: string }
  | { type: "invited"; projectId: string; email: string }
  | { type: "owner"; projectId: string }
  | { type: "password" };

export function notify(event: NotifyEvent) {
  void (async () => {
    const user = getFirebase().auth.currentUser;
    if (!user) return;
    const token = await user.getIdToken();
    await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(event),
      keepalive: true,
    });
  })().catch((error) => console.warn("[avisos]", error));
}
