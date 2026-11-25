"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { firestoreErrorMessage } from "@/lib/firestore/errors";
import {
  saveNotificationSettings,
  subscribeNotificationSettings,
  type NotificationSettings,
} from "@/lib/firestore/notification-settings";
import { useAuth, useCurrentUser } from "./auth-provider";

const OPTIONS: { key: keyof NotificationSettings; label: string; hint: string }[] = [
  { key: "assigned", label: "Me asignan una tarea", hint: "Cuando alguien te pone como responsable." },
  {
    key: "comments",
    label: "Comentan en mis tareas",
    hint: "En las tareas de las que eres responsable o que creaste.",
  },
  { key: "projects", label: "Cambios en mis proyectos", hint: "Por ejemplo, si te transfieren la propiedad." },
];

/** Mi cuenta → Notificaciones: qué avisos llegan por email. */
export function NotificationsTab() {
  const user = useCurrentUser();
  const { isGuest } = useAuth();
  const [settings, setSettings] = useState<{ uid: string; value: NotificationSettings } | null>(null);

  useEffect(
    () => subscribeNotificationSettings(user.uid, (value) => setSettings({ uid: user.uid, value })),
    [user.uid],
  );

  if (isGuest || !user.email) {
    return (
      <p className="text-[13px] text-muted-foreground">
        Los avisos llegan al email de tu cuenta. Guarda tu cuenta con Google o con email (en Perfil) para recibirlos.
      </p>
    );
  }

  const current = settings?.uid === user.uid ? settings.value : null;

  function toggle(key: keyof NotificationSettings, checked: boolean) {
    if (!current) return;
    const next = { ...current, [key]: checked };
    setSettings({ uid: user.uid, value: next });
    saveNotificationSettings(user.uid, next).catch((error) =>
      toast.error(firestoreErrorMessage(error, "No se pudo guardar")),
    );
  }

  return (
    <div className="grid gap-5">
      <div className="space-y-1">
        <h3 className="text-[13px] font-medium">Avisos por email</h3>
        <p className="text-xs text-muted-foreground">
          Se envían a <span className="text-foreground">{user.email}</span>. Nunca te avisamos de lo que haces tú.
        </p>
      </div>
      <ul className="grid divide-y rounded-lg border">
        {OPTIONS.map((option) => (
          <li key={option.key}>
            <label htmlFor={`notify-${option.key}`} className="flex cursor-pointer items-start gap-3 px-3 py-2.5">
              {current ? (
                <Checkbox
                  id={`notify-${option.key}`}
                  checked={current[option.key]}
                  onCheckedChange={(value) => toggle(option.key, value === true)}
                  className="mt-0.5"
                />
              ) : (
                <Skeleton className="mt-0.5 size-4 rounded-[4px]" />
              )}
              <span className="grid gap-0.5">
                <span className="text-[13px]">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.hint}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <p className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-px size-3.5 shrink-0" aria-hidden />
        Los avisos de seguridad (cambio de contraseña) se envían siempre. Las invitaciones a proyectos llegan al email
        invitado.
      </p>
    </div>
  );
}
