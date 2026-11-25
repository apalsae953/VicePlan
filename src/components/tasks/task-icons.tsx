import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

import type { MilestoneStatus, TaskPriority, TaskStatus } from "@/lib/domain";
import { findCategory, MILESTONE_STATUS_META, PRIORITY_META, STATUS_META } from "@/lib/constants";
import type { ProjectCategory } from "@/lib/types";
import { useWorkspaceStore } from "@/stores/workspace-store-provider";
import { CategoryGlyph } from "./category-glyph";

/*
 * Iconografía del dominio al estilo Linear: SVG propios de 14px para estado y
 * prioridad (comunican progreso/urgencia por forma, no solo por color) y un
 * badge tintado para la disciplina.
 */

/** Sector circular desde las 12 en punto que cubre `fraction` (0–1) del círculo. */
function piePath(fraction: number, r = 3.5, c = 7) {
  const angle = fraction * 2 * Math.PI;
  const x = c + r * Math.sin(angle);
  const y = c - r * Math.cos(angle);
  return `M${c} ${c} L${c} ${c - r} A${r} ${r} 0 ${fraction > 0.5 ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)} Z`;
}

const STATUS_FILL: Record<TaskStatus, number> = { TODO: 0, IN_PROGRESS: 0.5, TESTING: 0.75, DONE: 1 };

export function StatusIcon({ status, className }: { status: TaskStatus; className?: string }) {
  const color = STATUS_META[status].color;
  const fill = STATUS_FILL[status];
  return (
    <svg viewBox="0 0 14 14" className={cn("size-3.5 shrink-0", className)} aria-hidden>
      {fill === 1 ? (
        <>
          <circle cx="7" cy="7" r="6.25" fill={color} />
          <path d="M4.4 7.2 6.2 9l3.4-3.6" fill="none" stroke="var(--background)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <circle cx="7" cy="7" r="5.75" fill="none" stroke={color} strokeWidth="1.5" />
          {fill > 0 && <path d={piePath(fill)} fill={color} />}
        </>
      )}
    </svg>
  );
}

const PRIORITY_BARS: Record<Exclude<TaskPriority, "CRITICAL">, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };

export function PriorityIcon({ priority, className }: { priority: TaskPriority; className?: string }) {
  if (priority === "CRITICAL") {
    return (
      <svg viewBox="0 0 14 14" className={cn("size-3.5 shrink-0", className)} aria-hidden>
        <rect x="1" y="1" width="12" height="12" rx="3" fill={PRIORITY_META.CRITICAL.color} />
        <path d="M7 3.8v3.9" stroke="var(--background)" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="7" cy="10.1" r="0.95" fill="var(--background)" />
      </svg>
    );
  }
  const active = PRIORITY_BARS[priority];
  return (
    <svg viewBox="0 0 14 14" className={cn("size-3.5 shrink-0 text-muted-foreground", className)} aria-hidden>
      {[0, 1, 2].map((i) => {
        const height = 5 + i * 3.5;
        return (
          <rect
            key={i}
            x={1.5 + i * 4}
            y={12.5 - height}
            width="3"
            height={height}
            rx="0.75"
            fill="currentColor"
            opacity={i < active ? 1 : 0.28}
          />
        );
      })}
    </svg>
  );
}

export function MilestoneStatusIcon({
  status,
  className,
}: {
  status: MilestoneStatus;
  className?: string;
}) {
  const color = MILESTONE_STATUS_META[status].color;
  return (
    <svg viewBox="0 0 14 14" className={cn("size-3.5 shrink-0", className)} aria-hidden>
      {status === "COMPLETED" ? (
        <>
          <circle cx="7" cy="7" r="6.25" fill={color} />
          <path d="M4.4 7.2 6.2 9l3.4-3.6" fill="none" stroke="var(--background)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <circle
            cx="7"
            cy="7"
            r="5.75"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeDasharray={status === "PLANNED" ? "2.4 2" : undefined}
          />
          {status === "ACTIVE" && <circle cx="7" cy="7" r="2.75" fill={color} />}
        </>
      )}
    </svg>
  );
}

/** Categoría de una tarea del proyecto abierto (con respaldo si se borró). */
export function useCategory(id: string): ProjectCategory {
  const categories = useWorkspaceStore((s) => s.project.categories);
  return findCategory(categories, id);
}

/** Variable CSS con el color de la categoría para estilos tintados. */
export function categoryStyle(category: ProjectCategory) {
  return { "--cat": category.color } as CSSProperties;
}

export function CategoryIcon({ category, className }: { category: ProjectCategory; className?: string }) {
  return (
    <CategoryGlyph
      icon={category.icon}
      className={cn("size-3.5 shrink-0", className)}
      style={{ color: category.color }}
      aria-hidden
    />
  );
}

export function CategoryBadge({ category, className }: { category: ProjectCategory; className?: string }) {
  return (
    <span
      style={categoryStyle(category)}
      className={cn(
        "inline-flex h-5 min-w-0 shrink-0 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium",
        "bg-[color-mix(in_oklab,var(--cat)_14%,transparent)] text-[color-mix(in_oklab,var(--cat)_70%,white)]",
        className,
      )}
    >
      <CategoryGlyph icon={category.icon} className="size-3 shrink-0" aria-hidden />
      <span className="truncate">{category.name}</span>
    </span>
  );
}
