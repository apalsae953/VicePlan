import type {
  MilestoneStatus,
  TaskCategory,
  TaskPriority,
  TaskStatus,
} from "@/lib/domain";

/**
 * Formato declarativo de los datos de demo. Las relaciones se expresan con
 * `ref` (claves legibles) y el seed las resuelve a IDs reales.
 */

export type SeedGddNode = {
  ref: string;
  title: string;
  content?: string;
  children?: SeedGddNode[];
};

export type SeedMilestone = {
  ref: string;
  title: string;
  description?: string;
  status: MilestoneStatus;
  /** Días relativos a hoy (negativo = pasado). */
  startInDays: number;
  endInDays: number;
};

export type SeedTask = {
  title: string;
  description?: string;
  status: TaskStatus;
  category: TaskCategory;
  priority: TaskPriority;
  estimatedHours?: number;
  loggedHours?: number;
  /** `ref` del milestone; sin milestone = backlog. */
  milestone?: string;
  /** `ref` del nodo GDD vinculado. */
  gdd?: string;
  /** "me" = se asigna a quien carga el proyecto de ejemplo. */
  assignee?: "me";
  /** Clave legible para que otras tareas la usen en `blockedBy`. */
  ref?: string;
  /** Fecha límite relativa a hoy (negativo = vencida). */
  dueInDays?: number;
  /** Para tareas en Hecho: cuándo se cerraron, relativo a hoy. */
  completedInDays?: number;
  tags?: string[];
  /** [título, hecha] */
  subtasks?: [string, boolean][];
  /** `ref` de las tareas que la bloquean. */
  blockedBy?: string[];
};

/**
 * Plantilla para escribir Markdown indentado dentro del código: elimina la
 * indentación común y las líneas en blanco de los extremos.
 */
export function md(strings: TemplateStringsArray, ...values: unknown[]) {
  const text = String.raw({ raw: strings }, ...values);
  const lines = text.replace(/^\n/, "").trimEnd().split("\n");
  const indent = Math.min(
    ...lines.filter((line) => line.trim()).map((line) => line.length - line.trimStart().length),
  );
  return lines.map((line) => line.slice(indent)).join("\n");
}

export type SeedProject = {
  key: string;
  name: string;
  description: string;
  milestones: SeedMilestone[];
  gdd: SeedGddNode[];
  tasks: SeedTask[];
};
