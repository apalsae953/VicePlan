"use client";

import { useMemo, useState } from "react";
import { ChartColumn, Layers } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { MilestoneStatusIcon } from "@/components/tasks/task-icons";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { pickDefaultMilestone } from "@/lib/board";
import { elapsedRatio } from "@/lib/metrics";
import { useWorkspaceStore } from "@/stores/workspace-store-provider";
import { BurndownChart } from "./burndown-chart";
import { CategoryHoursChart } from "./category-hours-chart";
import { CriticalTasks } from "./critical-tasks";
import { KpiTiles } from "./kpi-tiles";
import { StatusCard } from "./status-card";
import { VelocityChart } from "./velocity-chart";

const PROJECT_SCOPE = "__project__";

/**
 * Métricas de producción. Un único filtro de ámbito (hito o proyecto
 * completo) arriba gobierna todas las tarjetas. Todo se deriva del store, así
 * que mover tareas o registrar horas actualiza las cifras sin recargar.
 */
export function MetricsView() {
  const milestones = useWorkspaceStore((s) => s.milestones);
  const allTasks = useWorkspaceStore((s) => s.tasks);
  const [scope, setScope] = useState<string | null>(null);

  // Ámbito por defecto: el hito en curso; si se borró, el proyecto.
  const defaultScope = pickDefaultMilestone(milestones) ?? PROJECT_SCOPE;
  const scopeId = scope && (scope === PROJECT_SCOPE || milestones.some((m) => m.id === scope)) ? scope : defaultScope;
  const milestone = milestones.find((m) => m.id === scopeId) ?? null;

  const projectTasks = useMemo(() => Object.values(allTasks), [allTasks]);
  const tasks = useMemo(
    () => (milestone ? projectTasks.filter((task) => task.milestoneId === milestone.id) : projectTasks),
    [projectTasks, milestone],
  );

  const scopeLabel = milestone?.title ?? "Todo el proyecto";
  const elapsed = milestone?.status === "ACTIVE" ? elapsedRatio(milestone) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader>
        <ChartColumn className="size-4 text-muted-foreground" aria-hidden />
        <h1 className="text-[13px] font-medium">Métricas</h1>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:inline">Ámbito</span>
          <Select value={scopeId} onValueChange={setScope}>
            <SelectTrigger size="sm" aria-label="Ámbito de las métricas" className="w-48 text-[13px] sm:w-56">
              {/* Contenido explícito: Radix solo rellena el valor tras montar, y así llega ya en el HTML del servidor. */}
              <SelectValue>
                {milestone ? (
                  <MilestoneStatusIcon status={milestone.status} />
                ) : (
                  <Layers className="text-muted-foreground" aria-hidden />
                )}
                <span className="truncate">{scopeLabel}</span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              {milestones.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <MilestoneStatusIcon status={m.status} />
                  {m.title}
                </SelectItem>
              ))}
              {milestones.length > 0 && <SelectSeparator />}
              <SelectItem value={PROJECT_SCOPE}>
                <Layers className="text-muted-foreground" />
                Todo el proyecto
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PageHeader>

      <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl space-y-3 px-4 py-6 sm:px-6">
          <KpiTiles tasks={tasks} projectTasks={projectTasks} scopeLabel={scopeLabel} isProject={milestone === null} />

          <div className="grid gap-3 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <CategoryHoursChart tasks={tasks} scopeLabel={scopeLabel} />
            </div>
            <div className="lg:col-span-2">
              <StatusCard
                tasks={tasks}
                title={milestone ? `Estado de ${milestone.title}` : "Estado del proyecto"}
                marker={
                  elapsed !== null
                    ? { at: elapsed, label: `Ha transcurrido el ${Math.round(elapsed * 100)} % del plazo` }
                    : null
                }
              />
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-5">
            {milestone && (
              <div className="lg:col-span-3">
                <BurndownChart milestone={milestone} tasks={projectTasks} />
              </div>
            )}
            <div className={milestone ? "lg:col-span-2" : "lg:col-span-5"}>
              <VelocityChart milestones={milestones} tasks={projectTasks} />
            </div>
          </div>

          <CriticalTasks tasks={tasks} />
        </div>
      </div>
    </div>
  );
}
