"use client";

import type { ReactNode } from "react";
import { Clock, Gauge, Target, TriangleAlert, type LucideIcon } from "lucide-react";

import { Meter } from "@/components/charts/meter";
import { computeProgress, formatHours } from "@/lib/board";
import { estimationRatio } from "@/lib/metrics";
import type { BoardTask } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * KPIs rápidos (stat tiles): etiqueta, valor en cifras proporcionales
 * (sin tabular-nums, como pide dataviz para cifras grandes) y una línea de
 * contexto. Los avisos llevan icono + texto, nunca solo color.
 */
export function KpiTiles({
  tasks,
  projectTasks,
  scopeLabel,
  isProject,
}: {
  tasks: BoardTask[];
  projectTasks: BoardTask[];
  scopeLabel: string;
  /** El ámbito es el proyecto completo (no un milestone). */
  isProject: boolean;
}) {
  const progress = computeProgress(tasks);
  const projectLogged = projectTasks.reduce((sum, task) => sum + task.loggedHours, 0);
  const critical = tasks.filter((task) => task.priority === "CRITICAL" && task.status !== "DONE");
  const high = tasks.filter((task) => task.priority === "HIGH" && task.status !== "DONE").length;
  const accuracy = estimationRatio(tasks);
  const deviation = accuracy ? Math.round((accuracy.ratio - 1) * 100) : null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile
        icon={Clock}
        label="Horas invertidas"
        value={`${formatHours(progress.logged)} h`}
        caption={
          isProject
            ? `de ${formatHours(progress.estimated)} h estimadas en el proyecto`
            : `de ${formatHours(progress.estimated)} h estimadas · ${formatHours(projectLogged)} h en todo el proyecto`
        }
      >
        <Meter
          value={progress.logged}
          max={progress.estimated}
          label={`${formatHours(progress.logged)} de ${formatHours(progress.estimated)} horas registradas`}
        />
      </StatTile>

      <StatTile
        icon={Target}
        label={`Avance · ${scopeLabel}`}
        value={`${Math.round(progress.percent)} %`}
        caption={`${progress.doneCount} de ${progress.total} tareas cerradas · ${formatHours(progress.completed)}/${formatHours(progress.estimated)} h`}
      >
        <Meter
          value={progress.completed}
          max={progress.estimated}
          label={`Avance ${Math.round(progress.percent)} %`}
        />
      </StatTile>

      <StatTile
        icon={TriangleAlert}
        label="Críticas pendientes"
        value={String(critical.length)}
        tone={critical.length > 0 ? "warning" : undefined}
        caption={
          critical.length > 0
            ? `Prioridad crítica sin cerrar · ${high} más de prioridad alta`
            : `Nada crítico pendiente · ${high} de prioridad alta`
        }
      />

      <StatTile
        icon={Gauge}
        label="Desviación de estimación"
        value={deviation === null ? "—" : `${deviation > 0 ? "+" : deviation < 0 ? "−" : ""}${Math.abs(deviation)} %`}
        tone={deviation !== null && deviation > 15 ? "warning" : undefined}
        caption={
          accuracy
            ? `Registradas frente a estimadas en ${accuracy.sample} ${accuracy.sample === 1 ? "tarea cerrada" : "tareas cerradas"}`
            : "Sin tareas cerradas con estimación"
        }
      />
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  caption,
  tone,
  children,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  caption: string;
  tone?: "warning";
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <p className={cn("flex items-center gap-1.5 text-xs", tone === "warning" ? "text-warning" : "text-muted-foreground")}>
        <Icon className="size-3.5" aria-hidden />
        <span className="truncate">{label}</span>
      </p>
      <div className="space-y-1">
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        <p className="text-xs text-pretty text-muted-foreground">{caption}</p>
      </div>
      {children && <div className="mt-auto">{children}</div>}
    </div>
  );
}
