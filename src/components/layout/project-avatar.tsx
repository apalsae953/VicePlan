import type { CSSProperties } from "react";

import { CATEGORY_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Color estable por proyecto (derivado de su key), tomado de la paleta del dominio. */
function projectColor(key: string) {
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  // Sin el gris (último): los proyectos siempre llevan un color reconocible.
  return CATEGORY_COLORS[hash % (CATEGORY_COLORS.length - 1)].value;
}

export function ProjectAvatar({
  projectKey,
  className,
}: {
  projectKey: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      style={{ "--avatar": projectColor(projectKey) } as CSSProperties}
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold",
        "bg-[color-mix(in_oklab,var(--avatar)_22%,transparent)] text-[color-mix(in_oklab,var(--avatar)_75%,white)]",
        "ring-1 ring-[color-mix(in_oklab,var(--avatar)_30%,transparent)] ring-inset",
        className,
      )}
    >
      {projectKey.slice(0, 1)}
    </span>
  );
}
