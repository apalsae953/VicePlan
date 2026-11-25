import type { TaskCategory, TaskPriority, TaskStatus } from "@/lib/domain";

import { POSITION_STEP, TASK_PRIORITIES, TASK_STATUSES } from "./constants";
import type { BoardGddNode, BoardMilestone, BoardTask } from "./types";

/**
 * Lógica pura del tablero (sin React): agrupación en columnas, filtros,
 * índices fraccionales de posición, progreso y formato.
 */

export type Columns = Record<TaskStatus, string[]>;

export const STATUS_ORDER: TaskStatus[] = TASK_STATUSES.map((status) => status.value);

export function isStatus(value: unknown): value is TaskStatus {
  return typeof value === "string" && (STATUS_ORDER as string[]).includes(value);
}

export function formatTaskId(projectKey: string, number: number) {
  return `${projectKey}-${number}`;
}

export function byPosition(a: BoardTask, b: BoardTask) {
  return a.position - b.position || a.number - b.number;
}

// ─── Filtros ─────────────────────────────────────────────────────────────────

function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

/** Busca en título, identificador, descripción, categoría y sección del GDD vinculada. */
export function matchesQuery(
  task: BoardTask,
  query: string,
  projectKey: string,
  extra: { gddTitle?: string; categoryName?: string } = {},
) {
  const q = normalize(query);
  if (!q) return true;
  return [
    task.title,
    formatTaskId(projectKey, task.number),
    task.description ?? "",
    extra.categoryName ?? "",
    extra.gddTitle ?? "",
    ...task.tags,
  ].some((field) => normalize(field).includes(q));
}

/** Valor del filtro por responsable para "sin asignar". */
export const UNASSIGNED = "__unassigned__";

/** ¿La tarea pasa el filtro por responsable? (null = todas). */
export function matchesAssignee(task: Pick<BoardTask, "assigneeId">, assignee: string | null | undefined) {
  if (!assignee) return true;
  if (assignee === UNASSIGNED) return task.assigneeId === null;
  return task.assigneeId === assignee;
}

export type BoardFilter = {
  milestoneId: string | null;
  categories: TaskCategory[];
  /** null = todos; UNASSIGNED = sin responsable; uid = de esa persona. */
  assignee?: string | null;
  query: string;
  projectKey: string;
  /** Títulos de los nodos del GDD por id, para buscar por sección vinculada. */
  gddTitles?: Map<string, string>;
  /** Nombres de las categorías por id, para buscar por disciplina. */
  categoryNames?: Map<string, string>;
  priorities?: TaskPriority[];
  tags?: string[];
  due?: DueFilter;
};

/** Filtro por fecha límite del tablero. */
export type DueFilter = null | "overdue" | "week" | "none";

export const DUE_FILTERS: { value: Exclude<DueFilter, null>; label: string }[] = [
  { value: "overdue", label: "Vencidas" },
  { value: "week", label: "Vencen esta semana" },
  { value: "none", label: "Sin fecha límite" },
];

export function matchesDue(task: BoardTask, due: DueFilter | undefined, today = todayDateOnly()) {
  if (!due) return true;
  if (due === "none") return task.dueDate === null;
  if (!task.dueDate || task.status === "DONE") return false;
  if (due === "overdue") return task.dueDate < today;
  return task.dueDate >= today && task.dueDate <= addDays(today, 7);
}

/** Tareas del milestone visible que pasan los filtros de categoría y búsqueda. */
export function filterTasks(tasks: Iterable<BoardTask>, filter: BoardFilter) {
  const result: BoardTask[] = [];
  for (const task of tasks) {
    if (task.milestoneId !== filter.milestoneId) continue;
    if (filter.categories.length > 0 && !filter.categories.includes(task.category)) continue;
    if (!matchesAssignee(task, filter.assignee)) continue;
    if (filter.priorities?.length && !filter.priorities.includes(task.priority)) continue;
    if (filter.tags?.length && !filter.tags.some((tag) => task.tags.includes(tag))) continue;
    if (!matchesDue(task, filter.due)) continue;
    const gddTitle = task.gddNodeId ? filter.gddTitles?.get(task.gddNodeId) : undefined;
    const categoryName = filter.categoryNames?.get(task.category);
    if (!matchesQuery(task, filter.query, filter.projectKey, { gddTitle, categoryName })) continue;
    result.push(task);
  }
  return result;
}

export function emptyColumns(): Columns {
  return { TODO: [], IN_PROGRESS: [], TESTING: [], DONE: [] };
}

// ─── Orden ───────────────────────────────────────────────────────────────────

export type BoardSort = "manual" | "priority" | "dueDate" | "estimate" | "updated";

export const BOARD_SORTS: { value: BoardSort; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "priority", label: "Prioridad" },
  { value: "dueDate", label: "Fecha límite" },
  { value: "estimate", label: "Estimación" },
  { value: "updated", label: "Última actualización" },
];

const PRIORITY_RANK = Object.fromEntries(TASK_PRIORITIES.map((p, index) => [p.value, index])) as Record<
  TaskPriority,
  number
>;

const COMPARATORS: Record<BoardSort, (a: BoardTask, b: BoardTask) => number> = {
  manual: byPosition,
  priority: (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || byPosition(a, b),
  // Sin fecha, al final.
  dueDate: (a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || byPosition(a, b),
  estimate: (a, b) => (b.estimatedHours ?? -1) - (a.estimatedHours ?? -1) || byPosition(a, b),
  updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt) || byPosition(a, b),
};

export function buildColumns(tasks: BoardTask[], sort: BoardSort = "manual"): Columns {
  const columns = emptyColumns();
  for (const task of [...tasks].sort(COMPARATORS[sort])) columns[task.status].push(task.id);
  return columns;
}

// ─── Fechas límite y dependencias ────────────────────────────────────────────

/** Hoy como "YYYY-MM-DD" local. */
export function todayDateOnly(now = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function addDays(dateOnly: string, days: number) {
  const [year, month, day] = dateOnly.split("-").map(Number);
  return todayDateOnly(new Date(year, month - 1, day + days));
}

/** Días hasta una fecha "YYYY-MM-DD" (negativo si ya pasó). */
export function daysUntilDate(dateOnly: string, today = todayDateOnly()) {
  const toTime = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day).getTime();
  };
  return Math.round((toTime(dateOnly) - toTime(today)) / 86_400_000);
}

export type DueTone = "overdue" | "soon" | "normal" | "done";

/** "Hoy", "Mañana", "Ayer", "Vence 12 dic"… y su tono. */
export function describeDue(task: Pick<BoardTask, "dueDate" | "status">, today = todayDateOnly()) {
  if (!task.dueDate) return null;
  const days = daysUntilDate(task.dueDate, today);
  const [year, month, day] = task.dueDate.split("-").map(Number);
  const short = shortDateFormat.format(new Date(year, month - 1, day)).replace(".", "");
  const label = days === 0 ? "Hoy" : days === 1 ? "Mañana" : days === -1 ? "Ayer" : short;
  const tone: DueTone = task.status === "DONE" ? "done" : days < 0 ? "overdue" : days <= 2 ? "soon" : "normal";
  return { label, tone, days, long: short };
}

/** ¿Alguna de las tareas que la bloquean sigue abierta? */
export function openBlockers(task: BoardTask, tasks: Record<string, BoardTask>) {
  return task.blockedBy.map((id) => tasks[id]).filter((blocker): blocker is BoardTask => !!blocker && blocker.status !== "DONE");
}

export function findColumn(columns: Columns, id: string): TaskStatus | null {
  if (isStatus(id)) return id;
  return STATUS_ORDER.find((status) => columns[status].includes(id)) ?? null;
}

// ─── Posiciones (índice fraccional) ──────────────────────────────────────────

/** Posición entre dos vecinos; al principio o al final si falta uno. */
export function positionBetween(before?: number, after?: number) {
  if (before !== undefined && after !== undefined) return (before + after) / 2;
  if (before !== undefined) return before + POSITION_STEP;
  if (after !== undefined) return after - POSITION_STEP;
  return POSITION_STEP;
}

/** Posición para colocar una tarea en lo alto de una columna. */
export function topPosition(
  tasks: Iterable<BoardTask>,
  milestoneId: string | null,
  status: TaskStatus,
  excludeId?: string,
) {
  let min: number | undefined;
  for (const task of tasks) {
    if (task.id === excludeId || task.milestoneId !== milestoneId || task.status !== status) continue;
    if (min === undefined || task.position < min) min = task.position;
  }
  return positionBetween(undefined, min);
}

// ─── Progreso ────────────────────────────────────────────────────────────────

export type Progress = {
  /** Horas estimadas totales. */
  estimated: number;
  /** Horas estimadas de tareas en Done. */
  completed: number;
  /** Horas estimadas de tareas en Testing. */
  testing: number;
  /** Horas registradas totales. */
  logged: number;
  doneCount: number;
  total: number;
  /** 0–100, completadas sobre estimadas. */
  percent: number;
};

export function computeProgress(tasks: BoardTask[]): Progress {
  const progress = { estimated: 0, completed: 0, testing: 0, logged: 0, doneCount: 0, total: tasks.length };
  for (const task of tasks) {
    const estimate = task.estimatedHours ?? 0;
    progress.estimated += estimate;
    progress.logged += task.loggedHours;
    if (task.status === "DONE") {
      progress.completed += estimate;
      progress.doneCount += 1;
    }
    if (task.status === "TESTING") progress.testing += estimate;
  }
  const percent = progress.estimated > 0 ? (progress.completed / progress.estimated) * 100 : 0;
  return { ...progress, percent };
}

// ─── Milestones y GDD ────────────────────────────────────────────────────────

/** Milestone que se muestra por defecto: el activo, si no el siguiente planificado. */
export function pickDefaultMilestone(milestones: BoardMilestone[]): string | null {
  return (
    milestones.find((m) => m.status === "ACTIVE")?.id ??
    milestones.find((m) => m.status === "PLANNED")?.id ??
    milestones.at(-1)?.id ??
    null
  );
}

export type GddOption = BoardGddNode & {
  depth: number;
  /** Títulos de los ancestros, de la raíz al padre. */
  path: string[];
  /** Ids de los ancestros, de la raíz al padre. */
  ancestorIds: string[];
  /** Numeración de esquema calculada por posición: "2", "2.1"… */
  number: string;
  childCount: number;
};

/**
 * Aplana el árbol del GDD en orden de lectura, con profundidad, ruta y
 * numeración de esquema. La numeración no se guarda en los títulos: se deriva
 * del orden, así que reordenar o borrar secciones la mantiene correcta.
 */
export function flattenGddTree(nodes: BoardGddNode[]): GddOption[] {
  const children = new Map<string | null, BoardGddNode[]>();
  for (const node of nodes) {
    const siblings = children.get(node.parentId) ?? [];
    siblings.push(node);
    children.set(node.parentId, siblings);
  }

  const result: GddOption[] = [];
  const walk = (parentId: string | null, depth: number, path: string[], ancestorIds: string[], prefix: string) => {
    const siblings = [...(children.get(parentId) ?? [])].sort((a, b) => a.position - b.position);
    siblings.forEach((node, index) => {
      const number = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
      result.push({ ...node, depth, path, ancestorIds, number, childCount: children.get(node.id)?.length ?? 0 });
      walk(node.id, depth + 1, [...path, node.title], [...ancestorIds, node.id], number);
    });
  };
  walk(null, 0, [], [], "");
  return result;
}

/** Ids de todos los descendientes de un nodo (sin incluirlo). */
export function gddDescendantIds(nodes: BoardGddNode[], nodeId: string) {
  const ids: string[] = [];
  const queue = [nodeId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const node of nodes) {
      if (node.parentId === current) {
        ids.push(node.id);
        queue.push(node.id);
      }
    }
  }
  return ids;
}

// ─── Formato ─────────────────────────────────────────────────────────────────

const hoursFormat = new Intl.NumberFormat("es", { maximumFractionDigits: 1 });
const shortDateFormat = new Intl.DateTimeFormat("es", { day: "numeric", month: "short" });
const relativeFormat = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
const DAY_MS = 86_400_000;

export function formatHours(hours: number) {
  return hoursFormat.format(hours);
}

export function formatShortDate(iso: string) {
  return shortDateFormat.format(new Date(iso)).replace(".", "");
}

/** Días naturales que faltan hasta `iso` (negativo si ya pasó). */
export function daysUntil(iso: string, now = new Date()) {
  const end = new Date(iso);
  end.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - today.getTime()) / DAY_MS);
}

/** "6 nov – 6 dic", o null si al milestone le falta alguna fecha. */
export function milestoneDateRange(milestone: BoardMilestone) {
  if (!milestone.startDate || !milestone.endDate) return null;
  return `${formatShortDate(milestone.startDate)} – ${formatShortDate(milestone.endDate)}`;
}

/** "12 días restantes", "Empieza en 3 días", "Vencido hace 5 días"… */
export function milestoneTimeline(milestone: BoardMilestone) {
  if (milestone.status === "COMPLETED") return "Completado";
  if (!milestone.endDate) return null;
  if (milestone.startDate && daysUntil(milestone.startDate) > 0) {
    const days = daysUntil(milestone.startDate);
    return `Empieza en ${days} ${days === 1 ? "día" : "días"}`;
  }
  const left = daysUntil(milestone.endDate);
  if (left < 0) return `Vencido hace ${-left} ${left === -1 ? "día" : "días"}`;
  if (left === 0) return "Termina hoy";
  return `${left} ${left === 1 ? "día restante" : "días restantes"}`;
}

export function formatRelative(iso: string, now = Date.now()) {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return relativeFormat.format(Math.round(seconds / size), unit);
  }
  return "ahora mismo";
}
