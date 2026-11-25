"use client";

import { useMemo } from "react";

import { StatusIcon } from "@/components/tasks/task-icons";
import { formatHours } from "@/lib/board";
import { STATUS_META } from "@/lib/constants";
import { statusBreakdown } from "@/lib/metrics";
import type { BoardTask } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SegmentedBar, type BarPart } from "./segmented-bar";

/** Orden de lectura: lo cerrado a la izquierda, lo pendiente (carril) a la derecha. */
const ORDER = ["DONE", "TESTING", "IN_PROGRESS", "TODO"] as const;

/**
 * Reparto de tareas por columna como barra segmentada. To Do es el carril
 * neutro; In Progress / Testing / Done usan la paleta de estados validada.
 * La leyenda lleva el icono de estado (forma + color), así la identidad nunca
 * depende solo del color.
 */
export function StatusBar({
  tasks,
  size = "thin",
  marker,
  legend = false,
  className,
}: {
  tasks: BoardTask[];
  size?: "thin" | "tall";
  marker?: { at: number; label: string } | null;
  legend?: boolean;
  className?: string;
}) {
  const breakdown = useMemo(() => statusBreakdown(tasks), [tasks]);
  const total = tasks.length;

  const parts: BarPart[] = ORDER.map((status) => {
    const slice = breakdown.find((s) => s.status === status)!;
    const share = total > 0 ? Math.round((slice.count / total) * 100) : 0;
    return {
      key: status,
      value: slice.count,
      color: status === "TODO" ? null : STATUS_META[status].color,
      label: STATUS_META[status].label,
      detail: (
        <span className="flex items-center gap-1.5">
          <StatusIcon status={status} />
          <span className="font-medium">{STATUS_META[status].label}</span>
          <span className="text-muted-foreground tabular-nums">
            {slice.count} {slice.count === 1 ? "tarea" : "tareas"} · {share} % · {formatHours(slice.estimated)} h
          </span>
        </span>
      ),
    };
  });

  const summary = parts.map((part) => `${part.label} ${part.value}`).join(", ");

  return (
    <div className={cn("space-y-2", className)}>
      <SegmentedBar parts={parts} size={size} marker={marker} label={`Tareas por estado: ${summary}`} />
      {legend && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {ORDER.map((status) => {
            const count = breakdown.find((s) => s.status === status)!.count;
            return (
              <li key={status} className="flex items-center gap-1.5">
                <StatusIcon status={status} className="size-3" />
                {STATUS_META[status].label}
                {/* La barra alta ya imprime la cifra dentro de cada bloque. */}
                {size === "thin" && <span className="text-foreground/80 tabular-nums">{count}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
