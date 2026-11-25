import type {
  MilestoneStatus,
  TaskCategory,
  TaskPriority,
  TaskStatus,
} from "@/lib/domain";

/**
 * Modelos de la UI, derivados de los documentos de Firestore por
 * `lib/firestore/mappers.ts`. Las fechas van como ISO strings.
 */

/**
 * Perfil de un miembro, copiado (desnormalizado) en `projects/{id}.members`:
 * así el equipo ve nombres y avatares sin poder leer `users/` de nadie más.
 * Cada usuario solo puede escribir su propia entrada (ver firestore.rules).
 */
export type MemberProfile = {
  name: string | null;
  email: string | null;
  photoURL: string | null;
};

export type ProjectMember = MemberProfile & {
  uid: string;
  isOwner: boolean;
};

/** Categoría (disciplina) configurable del proyecto. `icon` es una clave de CATEGORY_ICONS. */
export type ProjectCategory = {
  id: string;
  name: string;
  color: string;
  icon: string;
};

export type ProjectSummary = {
  id: string;
  key: string;
  name: string;
  ownerId: string;
  createdAt: string;
  members: Record<string, MemberProfile>;
  categories: ProjectCategory[];
  /** Versión de la imagen del proyecto (`branding/logo`), o null si no tiene. */
  logo: number | null;
};

export type WorkspaceProject = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  ownerId: string;
  memberIds: string[];
  /** Miembros en orden: propietario primero, luego por nombre. */
  members: ProjectMember[];
  /** Emails invitados que aún no han aceptado (en minúsculas). */
  invitedEmails: string[];
  /** Categorías en su orden; si el proyecto no tiene, las de serie. */
  categories: ProjectCategory[];
  /** Código para unirse sin invitación por email (null = desactivado). */
  inviteCode: string | null;
  /** Versión de la imagen del proyecto (`branding/logo`), o null si no tiene. */
  logo: number | null;
};

export type BoardMilestone = {
  id: string;
  title: string;
  description: string | null;
  status: MilestoneStatus;
  startDate: string | null;
  endDate: string | null;
};

/** Datos editables de un milestone. Fechas como "YYYY-MM-DD" (input type=date). */
export type MilestoneDraft = {
  title: string;
  description: string | null;
  status: MilestoneStatus;
  startDate: string | null;
  endDate: string | null;
};

/**
 * Qué hacer con las tareas sin terminar al completar un milestone:
 * dejarlas donde están, mandarlas al backlog (null) o a otro milestone (id).
 */
export type OpenTasksTarget = "keep" | null | string;

/** Estructura de un nodo del GDD (el contenido viaja aparte, en `gddContent`). */
export type BoardGddNode = {
  id: string;
  title: string;
  parentId: string | null;
  position: number;
  updatedAt: string;
};

export type GddNodeInput = {
  title: string;
  parentId: string | null;
};

export type GddNodePatch = Partial<{ title: string; content: string }>;

/** Elemento de la checklist de una tarea. */
export type Subtask = { id: string; title: string; done: boolean };

export type BoardTask = {
  id: string;
  number: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  category: TaskCategory;
  priority: TaskPriority;
  estimatedHours: number | null;
  loggedHours: number;
  position: number;
  milestoneId: string | null;
  gddNodeId: string | null;
  /** uid del responsable (miembro del proyecto) o null si está sin asignar. */
  assigneeId: string | null;
  /** Fechas de calendario "YYYY-MM-DD" (sin zona horaria). */
  startDate: string | null;
  dueDate: string | null;
  /** Etiquetas libres (minúsculas), como en HacknPlan. */
  tags: string[];
  subtasks: Subtask[];
  /** Ids de las tareas que la bloquean (dependencias). */
  blockedBy: string[];
  /** Ids de sus imágenes (`projects/{id}/taskImages`), en orden de subida. */
  images: string[];
  /** Cuándo pasó a Hecho (ISO); null si está abierta. Base del burndown. */
  completedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Todo lo que necesita el cliente para pintar un proyecto. */
export type Workspace = {
  project: WorkspaceProject;
  milestones: BoardMilestone[];
  gddNodes: BoardGddNode[];
  /** Markdown de cada nodo del GDD por id. */
  gddContent: Record<string, string>;
  tasks: BoardTask[];
};

/** Campos editables de una tarea. */
export type TaskDraft = {
  title: string;
  description: string | null;
  status: TaskStatus;
  category: TaskCategory;
  priority: TaskPriority;
  estimatedHours: number | null;
  loggedHours: number;
  milestoneId: string | null;
  gddNodeId: string | null;
  assigneeId: string | null;
  startDate: string | null;
  dueDate: string | null;
  tags: string[];
  subtasks: Subtask[];
  blockedBy: string[];
};

export type TaskPatch = Partial<TaskDraft> & { position?: number };

/** Comentario de una tarea (`tasks/{id}/comments`). */
export type TaskComment = {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
};

/** Tipos de evento del registro de actividad del proyecto. */
export type ActivityType =
  | "task.created"
  | "task.status"
  | "task.assigned"
  | "task.milestone"
  | "task.deleted"
  | "task.commented"
  | "task.logged"
  | "member.joined";

/** Evento del registro de actividad (`projects/{id}/activity`). */
export type ActivityEvent = {
  id: string;
  actorId: string;
  type: ActivityType;
  taskId: string | null;
  /** Datos pequeños para pintar el evento sin leer nada más (número, título, de/a…). */
  data: Record<string, string | number | null>;
  createdAt: string;
};
