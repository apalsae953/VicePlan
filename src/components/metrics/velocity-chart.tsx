"use client";

import { useMemo } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatHours } from "@/lib/board";
import { MILESTONE_STATUS_META } from "@/lib/constants";
import { velocity } from "@/lib/metrics";
import type { BoardMilestone, BoardTask } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChartCard, DataTable } from "./chart-card";

/**
 * Velocidad: horas estimadas cerradas en cada hito en curso o completado.
 * Barras en el acento (una sola serie), base recta y extremo redondeado; la
 * media de los completados como referencia para planificar el siguiente.
 */
export function VelocityChart({ milestones, tasks }: { milestones: BoardMilestone[]; tasks: BoardTask[] }) {
  const rows = useMemo(() => velocity(milestones, tasks), [milestones, tasks]);
  const max = Math.max(1, ...rows.map((row) => row.hours));
  const completed = rows.filter((row) => row.status === "COMPLETED");
  const average = completed.length ? completed.reduce((sum, row) => sum + row.hours, 0) / completed.length : null;

  const chart =
    rows.length === 0 ? (
      <p className="py-10 text-center text-[13px] text-muted-foreground">Aparecerá cuando haya hitos en curso o completados.</p>
    ) : (
      <div className="space-y-3">
        <div className="relative flex h-44 items-end gap-3 border-b border-white/[0.08] px-1">
          {average !== null && (
            <div
              className="pointer-events-none absolute right-0 left-0 border-t border-dashed border-muted-foreground/50"
              style={{ bottom: `${(average / max) * 100}%` }}
              aria-hidden
            />
          )}
          {rows.map((row) => (
            <Tooltip key={row.milestoneId}>
              <TooltipTrigger asChild>
                <div
                  tabIndex={0}
                  aria-label={`${row.title}: ${formatHours(row.hours)} horas cerradas en ${row.tasks} tareas`}
                  className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1 outline-none"
                >
                  <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{formatHours(row.hours)}h</span>
                  <div
                    className={cn(
                      "w-full max-w-14 rounded-t-[4px] transition-opacity duration-150 group-hover:opacity-80 group-focus-visible:ring-2 group-focus-visible:ring-ring",
                      row.status === "ACTIVE" ? "bg-primary/45" : "bg-primary",
                    )}
                    style={{ height: `${Math.max((row.hours / max) * 100, row.hours > 0 ? 2 : 0)}%` }}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="block">
                <p className="mb-1 font-medium">{row.title}</p>
                <p className="text-muted-foreground tabular-nums">
                  {formatHours(row.hours)} h cerradas · {row.tasks} {row.tasks === 1 ? "tarea" : "tareas"}
                </p>
                <p className="text-muted-foreground">{MILESTONE_STATUS_META[row.status].label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        <div className="flex gap-3 px-1">
          {rows.map((row) => (
            <span key={row.milestoneId} className="min-w-0 flex-1 truncate text-center text-[11px] text-muted-foreground">
              {row.title}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-3 rounded-[2px] bg-primary" aria-hidden /> Completado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-3 rounded-[2px] bg-primary/45" aria-hidden /> En curso (parcial)
          </span>
          {average !== null && (
            <span className="flex items-center gap-1.5">
              <span className="w-4 border-t border-dashed border-muted-foreground" aria-hidden /> Media: {formatHours(average)} h
            </span>
          )}
        </div>
      </div>
    );

  const table = (
    <DataTable
      head={["Hito", "Estado", "Tareas cerradas", "Horas cerradas"]}
      rows={rows.map((row) => [row.title, MILESTONE_STATUS_META[row.status].label, row.tasks, `${formatHours(row.hours)} h`])}
    />
  );

  return (
    <ChartCard
      title="Velocidad"
      description="Horas estimadas cerradas por hito"
      chart={chart}
      table={table}
    />
  );
}
