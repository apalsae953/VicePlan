"use client";

import { UserRound } from "lucide-react";

import { useStoredImage } from "@/hooks/use-stored-image";
import { parseAvatarMarker } from "@/lib/firestore/stored-images";
import { cn } from "@/lib/utils";

const SIZES = {
  xs: "size-4 text-[8px]",
  sm: "size-5 text-[9px]",
  md: "size-6 text-[10px]",
  lg: "size-8 text-xs",
  xl: "size-14 text-base",
} as const;

export type AvatarSize = keyof typeof SIZES;

/** Iniciales a partir del nombre o, si no hay, del email ("ana.ruiz@…" → "AR"). */
export function initialsOf(name: string | null | undefined, email?: string | null) {
  const source = name?.trim() || email?.split("@")[0] || "";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0][0], parts[1][0]] : [...(parts[0] ?? "").slice(0, 2)];
  return letters.join("").toUpperCase() || "?";
}

/**
 * Avatar circular de una persona: la foto que subió a VicePlan
 * (`avatar:<uid>?v=…`, guardada en Firestore), la de Google o sus iniciales.
 * Sin datos (invitado o miembro que ya no está) muestra un icono neutro.
 */
export function MemberAvatar({
  name,
  email,
  photoURL,
  size = "md",
  className,
  title,
}: {
  name?: string | null;
  email?: string | null;
  photoURL?: string | null;
  size?: AvatarSize;
  className?: string;
  /** Texto del tooltip nativo (p. ej. "Responsable: Ana"). */
  title?: string;
}) {
  const stored = photoURL ? parseAvatarMarker(photoURL) : null;
  const storedUrl = useStoredImage(stored?.path ?? null, stored?.version);
  const src = stored ? storedUrl : photoURL;
  const base = cn(
    "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-border",
    SIZES[size],
    className,
  );

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatar pequeño (Google o blob:), sin optimización necesaria
      <img src={src} alt="" title={title} referrerPolicy="no-referrer" className={cn(base, "object-cover")} />
    );
  }
  if (!name && !email) {
    return (
      <span title={title} aria-hidden className={cn(base, "bg-muted text-muted-foreground")}>
        <UserRound className="size-[65%]" />
      </span>
    );
  }
  // También mientras carga una foto subida: las iniciales evitan el hueco.
  return (
    <span title={title} aria-hidden className={cn(base, "bg-accent font-semibold text-foreground/80")}>
      {initialsOf(name, email)}
    </span>
  );
}
