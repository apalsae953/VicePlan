import type { TaskCategory, TaskStatus } from "@/lib/domain";

import { STATUS_ORDER } from "./board";
import type { BoardMilestone, BoardTask, ProjectCategory } from "./types";

/*
 * Cálculos puros para las vistas de Milestones y Métricas. Todo se deriva del
 * store en el cliente, así que cualquier cambio (mover una tarea, registrar
 * horas) se refleja al instante en las cifras y los gráficos.
 */

export type StatusSlice = { status: TaskStatus; count: number; estimated: number; logged: number };

export function statusBreakdown(tasks: BoardTask[]): StatusSlice[] {
  return STATUS_ORDER.map((status) => {
    const inStatus = tasks.filter((task) => task.status === status);
    return {
      status,
      count: inStatus.length,
      estimated: sum(inStatus, (task) => task.estimatedHours ?? 0),
      logged: sum(inStatus, (task) => task.loggedHours),
    };
  });
}

export type CategoryHours = {
  category: TaskCategory;
  count: number;
  estimated: number;
  logged: number;
};

/** Horas estimadas frente a registradas por disciplina, en el orden de las categorías del proyecto. */
export function categoryHours(tasks: BoardTask[], categories: ProjectCategory[]): CategoryHours[] {
  return categories.map(({ id }) => {
    const inCategory = tasks.filter((task) => task.category === id);
    return {
      category: id,
      count: inCategory.length,
      estimated: sum(inCategory, (task) => task.estimatedHours ?? 0),
      logged: sum(inCategory, (task) => task.loggedHours),
    };
  });
}

/**
 * Precisión de las estimaciones en tareas cerradas: horas registradas / horas
 * estimadas (1 = exacto, 1.2 = un 20 % por encima). `null` sin datos.
 */
export function estimationRatio(tasks: BoardTask[]) {
  const closed = tasks.filter((task) => task.status === "DONE" && task.estimatedHours);
  const estimated = sum(closed, (task) => task.estimatedHours ?? 0);
  if (estimated === 0) return null;
  return { ratio: sum(closed, (task) => task.loggedHours) / estimated, sample: closed.length };
}

const DAY_MS = 86_400_000;

/**
 * Fracción (0–1) del plazo del milestone ya transcurrida; null sin fechas.
 * Se calcula por días (hoy cuenta como medio día transcurrido), no por
 * milisegundos: así el servidor y el cliente obtienen el mismo valor durante
 * todo el día y no hay desajustes de hidratación.
 */
export function elapsedRatio(milestone: BoardMilestone, now = new Date()) {
  if (!milestone.startDate || !milestone.endDate) return null;
  const start = startOfDay(new Date(milestone.startDate));
  const totalDays = Math.round((startOfDay(new Date(milestone.endDate)) - start) / DAY_MS) + 1;
  if (totalDays <= 0) return null;
  const elapsedDays = Math.round((startOfDay(now) - start) / DAY_MS) + 0.5;
  return Math.min(1, Math.max(0, elapsedDays / totalDays));
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
}

/** ISO → "YYYY-MM-DD" local, para inputs type=date. */
export function isoToDateInput(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function sum<T>(items: T[], pick: (item: T) => number) {
  return items.reduce((total, item) => total + pick(item), 0);
}

// ─── Burndown y velocidad ────────────────────────────────────────────────────

export type BurndownPoint = {
  /** "YYYY-MM-DD" */
  date: string;
  /** Horas estimadas pendientes al final del día (null en días futuros). */
  remaining: number | null;
  /** Línea ideal: de todo el alcance a cero el último día. */
  ideal: number;
};

function dayKey(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Burndown del hito por horas estimadas, a partir de la fecha de cierre de
 * cada tarea (`completedAt`). El alcance es el actual (las tareas que hoy
 * pertenecen al hito), como hace HacknPlan con "Estimated (current)".
 */
export function burndown(milestone: BoardMilestone, tasks: BoardTask[], now = new Date()): BurndownPoint[] | null {
  if (!milestone.startDate || !milestone.endDate) return null;
  const start = new Date(milestone.startDate);
  const end = new Date(milestone.endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const days = Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1;
  if (days <= 0 || days > 400) return null;

  const scope = tasks.filter((task) => task.milestoneId === milestone.id);
  const total = sum(scope, (task) => task.estimatedHours ?? 0);
  const todayKey = dayKey(now);
  const points: BurndownPoint[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const key = dayKey(date);
    const closed = scope.filter((task) => task.completedAt && dayKey(new Date(task.completedAt)) <= key);
    const remaining = key > todayKey ? null : total - sum(closed, (task) => task.estimatedHours ?? 0);
    const ideal = days === 1 ? 0 : total * (1 - i / (days - 1));
    points.push({ date: key, remaining, ideal: Math.round(ideal * 10) / 10 });
  }
  return points;
}

export type VelocityPoint = { milestoneId: string; title: string; status: BoardMilestone["status"]; hours: number; tasks: number };

/** Horas estimadas cerradas por hito (velocidad), en orden cronológico. */
export function velocity(milestones: BoardMilestone[], tasks: BoardTask[]): VelocityPoint[] {
  return milestones
    .filter((milestone) => milestone.status !== "PLANNED")
    .map((milestone) => {
      const done = tasks.filter((task) => task.milestoneId === milestone.id && task.status === "DONE");
      return {
        milestoneId: milestone.id,
        title: milestone.title,
        status: milestone.status,
        hours: sum(done, (task) => task.estimatedHours ?? 0),
        tasks: done.length,
      };
    });
}
