"use client";

import { useMemo } from "react";

import { StatusBar } from "@/components/charts/status-bar";
import { StatusIcon } from "@/components/tasks/task-icons";
import { formatHours } from "@/lib/board";
import { STATUS_META } from "@/lib/constants";
import { statusBreakdown } from "@/lib/metrics";
import type { BoardTask } from "@/lib/types";
import { ChartCard, DataTable } from "./chart-card";

/**
 * Desglose por columna del tablero como barra segmentada alta (un todo en
 * partes, ≤ 6 segmentos: la forma que dataviz prefiere al donut), con
 * leyenda, cifras dentro de cada bloque y su tabla equivalente.
 */
export function StatusCard({
  tasks,
  title,
  marker,
}: {
  tasks: BoardTask[];
  title: string;
  marker?: { at: number; label: string } | null;
}) {
  const breakdown = useMemo(() => statusBreakdown(tasks), [tasks]);
  const total = tasks.length;

  // Leyenda en el orden de los bloques; la cifra de tareas ya va dentro de
  // cada bloque, así que aquí solo se añaden las horas (sin repetir números).
  const legendOrder = (["DONE", "TESTING", "IN_PROGRESS", "TODO"] as const).map(
    (status) => breakdown.find((slice) => slice.status === status)!,
  );

  const chart = (
    <div className="space-y-4">
      <StatusBar tasks={tasks} size="tall" marker={marker} />
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5">
        {legendOrder.map((slice) => (
          <div key={slice.status} className="flex items-center justify-between gap-3 text-xs">
            <dt className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
              <StatusIcon status={slice.status} className="size-3 shrink-0" />
              <span className="truncate">{STATUS_META[slice.status].label}</span>
            </dt>
            <dd className="font-mono text-[11px] whitespace-nowrap text-foreground/80 tabular-nums">
              {formatHours(slice.estimated)} h
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );

  const table = (
    <DataTable
      head={["Estado", "Tareas", "% tareas", "Estimadas", "Registradas"]}
      rows={breakdown.map((slice) => [
        <span key="s" className="flex items-center gap-2">
          <StatusIcon status={slice.status} />
          {STATUS_META[slice.status].label}
        </span>,
        slice.count,
        `${total > 0 ? Math.round((slice.count / total) * 100) : 0} %`,
        `${formatHours(slice.estimated)} h`,
        `${formatHours(slice.logged)} h`,
      ])}
    />
  );

  return (
    <ChartCard
      title={title}
      description={`${total} ${total === 1 ? "tarea" : "tareas"} por columna · horas estimadas por estado`}
      chart={chart}
      table={table}
    />
  );
}
