"use client";

import { useMemo } from "react";

import { CategoryIcon } from "@/components/tasks/task-icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatHours } from "@/lib/board";
import { findCategory } from "@/lib/constants";
import { useWorkspaceStore } from "@/stores/workspace-store-provider";
import { categoryHours, type CategoryHours } from "@/lib/metrics";
import type { BoardTask } from "@/lib/types";
import { ChartCard, DataTable } from "./chart-card";

/** Escala "bonita": tope y marcas redondas (0, 10, 20…) para el eje. */
function niceScale(max: number, targetTicks = 4) {
  if (max <= 0) return { top: 10, ticks: [0, 5, 10] };
  const rough = max / targetTicks;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? rough;
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => Math.round(i * step * 100) / 100);
  return { top, ticks };
}

/**
 * Horas por disciplina como bullet chart: el carril es lo estimado y el
 * relleno lo registrado (una sola serie de acento); lo que excede la
 * estimación se pinta en `warning` a continuación. Barras de 20 px, extremo
 * de datos redondeado y base recta; rejilla en líneas finas y recesivas.
 */
export function CategoryHoursChart({ tasks, scopeLabel }: { tasks: BoardTask[]; scopeLabel: string }) {
  const categories = useWorkspaceStore((s) => s.project.categories);
  // Solo las disciplinas con trabajo en el ámbito: con muchas categorías, las vacías solo añaden ruido.
  const rows = useMemo(
    () => categoryHours(tasks, categories).filter((row) => row.count > 0 || row.logged > 0),
    [tasks, categories],
  );
  const { top, ticks } = niceScale(Math.max(...rows.map((r) => Math.max(r.estimated, r.logged))));
  const pct = (hours: number) => (hours / top) * 100;

  const chart = (
    <div className="space-y-4">
      <div className="relative">
        {/* Rejilla: líneas verticales finas en cada marca del eje. */}
        <div className="pointer-events-none absolute inset-y-0 right-14 left-[7.5rem] sm:left-36" aria-hidden>
          {ticks.map((tick) => (
            <div key={tick} className="absolute inset-y-0 w-px bg-white/[0.06]" style={{ left: `${pct(tick)}%` }} />
          ))}
        </div>

        <ul className="relative space-y-2.5">
          {rows.map((row) => (
            <CategoryRow key={row.category} row={row} pct={pct} />
          ))}
        </ul>

        {/* Eje X */}
        <div className="relative mt-2 mr-14 ml-[7.5rem] h-4 sm:ml-36" aria-hidden>
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute -translate-x-1/2 font-mono text-[11px] text-muted-foreground tabular-nums"
              style={{ left: `${pct(tick)}%` }}
            >
              {formatHours(tick)}
            </span>
          ))}
        </div>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Leyenda">
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-3 rounded-[2px] bg-primary" aria-hidden /> Registradas
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-3 rounded-[2px] bg-primary/20" aria-hidden /> Estimadas
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-3 rounded-[2px] bg-warning" aria-hidden /> Exceso sobre lo estimado
        </li>
      </ul>
    </div>
  );

  const table = (
    <DataTable
      head={["Disciplina", "Tareas", "Estimadas", "Registradas", "Diferencia"]}
      rows={rows.map((row) => [
        <span key="c" className="flex items-center gap-2">
          <CategoryIcon category={findCategory(categories, row.category)} />
          {findCategory(categories, row.category).name}
        </span>,
        row.count,
        `${formatHours(row.estimated)} h`,
        `${formatHours(row.logged)} h`,
        `${row.logged - row.estimated > 0 ? "+" : ""}${formatHours(row.logged - row.estimated)} h`,
      ])}
    />
  );

  return (
    <ChartCard
      title="Horas por disciplina"
      description={`Estimadas frente a registradas · ${scopeLabel}`}
      chart={chart}
      table={table}
    />
  );
}

function CategoryRow({ row, pct }: { row: CategoryHours; pct: (hours: number) => number }) {
  const categories = useWorkspaceStore((s) => s.project.categories);
  const meta = findCategory(categories, row.category);
  // Sin estimación, todo lo registrado cuenta como exceso (trabajo no planificado).
  const within = row.estimated > 0 ? Math.min(row.logged, row.estimated) : 0;
  const excess = row.logged - within;
  const diff = row.logged - row.estimated;

  return (
    <li className="flex items-center">
      <span className="flex w-[7.5rem] shrink-0 items-center gap-2 pr-3 text-xs sm:w-36 sm:text-[13px]">
        <CategoryIcon category={meta} />
        <span className="truncate">{meta.name}</span>
      </span>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            tabIndex={0}
            aria-label={`${meta.name}: ${formatHours(row.logged)} de ${formatHours(row.estimated)} horas`}
            className="group relative mr-14 flex h-7 min-w-0 flex-1 items-center rounded outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {/* Carril = estimado */}
            <div
              className="absolute inset-y-1 left-0 rounded-r-[4px] bg-primary/20 transition-[width] duration-300"
              style={{ width: `${pct(row.estimated)}%` }}
            />
            {/* Relleno = registrado dentro de la estimación */}
            {within > 0 && (
              <div
                className="absolute inset-y-1 left-0 rounded-r-[4px] bg-primary transition-[width] duration-300 group-hover:brightness-110"
                style={{ width: `${pct(within)}%` }}
              />
            )}
            {/* Exceso (o trabajo sin estimar), separado 2 px del relleno */}
            {excess > 0 && (
              <div
                className="absolute inset-y-1 rounded-r-[4px] bg-warning transition-[width] duration-300"
                style={
                  within > 0
                    ? { left: `calc(${pct(within)}% + 2px)`, width: `calc(${pct(excess)}% - 2px)` }
                    : { left: 0, width: `${pct(excess)}%` }
                }
              />
            )}
            <span
              className="absolute font-mono text-[11px] whitespace-nowrap text-muted-foreground tabular-nums"
              style={{ left: `calc(${pct(Math.max(row.estimated, row.logged))}% + 8px)` }}
            >
              {formatHours(row.logged)}/{formatHours(row.estimated)}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="block">
          <p className="mb-1 flex items-center gap-1.5 font-medium">
            <CategoryIcon category={meta} className="size-3" /> {meta.name}
          </p>
          <p className="text-muted-foreground tabular-nums">
            {formatHours(row.logged)} h registradas de {formatHours(row.estimated)} h estimadas
          </p>
          <p className="text-muted-foreground tabular-nums">
            {row.count} {row.count === 1 ? "tarea" : "tareas"} ·{" "}
            {diff > 0 ? `+${formatHours(diff)} h de exceso` : `${formatHours(-diff)} h por registrar`}
          </p>
        </TooltipContent>
      </Tooltip>
    </li>
  );
}
