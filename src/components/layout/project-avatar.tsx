"use client";

import type { CSSProperties } from "react";

import { useStoredImage } from "@/hooks/use-stored-image";
import { CATEGORY_COLORS } from "@/lib/constants";
import { projectLogoPath } from "@/lib/firestore/stored-images";
import { cn } from "@/lib/utils";

/** Color estable por proyecto (derivado de su key), tomado de la paleta del dominio. */
function projectColor(key: string) {
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  // Sin el gris (último): los proyectos siempre llevan un color reconocible.
  return CATEGORY_COLORS[hash % (CATEGORY_COLORS.length - 1)].value;
}

/**
 * Avatar cuadrado del proyecto: su imagen (opcional, subida en Configuración)
 * o la inicial de la clave sobre su color.
 */
export function ProjectAvatar({
  projectKey,
  projectId,
  logo,
  className,
}: {
  projectKey: string;
  /** Con `logo` (versión de la imagen), se muestra la imagen del proyecto. */
  projectId?: string;
  logo?: number | null;
  className?: string;
}) {
  const url = useStoredImage(projectId && logo ? projectLogoPath(projectId) : null, logo);
  const base = cn("flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-md", className);

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- imagen pequeña ya en memoria (blob:)
      <img src={url} alt="" aria-hidden className={cn(base, "object-cover ring-1 ring-border")} />
    );
  }
  return (
    <span
      aria-hidden
      style={{ "--avatar": projectColor(projectKey) } as CSSProperties}
      className={cn(
        base,
        "text-[11px] font-semibold",
        "bg-[color-mix(in_oklab,var(--avatar)_22%,transparent)] text-[color-mix(in_oklab,var(--avatar)_75%,white)]",
        "ring-1 ring-[color-mix(in_oklab,var(--avatar)_30%,transparent)] ring-inset",
      )}
    >
      {projectKey.slice(0, 1)}
    </span>
  );
}
