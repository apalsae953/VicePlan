import { Timestamp, type DocumentData, type DocumentSnapshot } from "firebase/firestore";

import { CATEGORY_COLORS, CATEGORY_ICONS, DEFAULT_CATEGORIES } from "@/lib/constants";
import { isOneOf, MilestoneStatus, TaskPriority, TaskStatus } from "@/lib/domain";
import type {
  ActivityEvent,
  ActivityType,
  BoardGddNode,
  BoardMilestone,
  BoardTask,
  MemberProfile,
  ProjectCategory,
  ProjectMember,
  ProjectSummary,
  Subtask,
  TaskComment,
  WorkspaceProject,
} from "@/lib/types";

/*
 * Documentos de Firestore → modelos de la UI. Defensivos: un documento con un
 * campo raro (editado a mano en la consola, versión antigua…) nunca rompe la
 * interfaz; se usan valores por defecto razonables.
 */

type Snapshot = DocumentSnapshot<DocumentData>;

/** Los serverTimestamp() pendientes se estiman con la hora local en vez de null. */
function read(snap: Snapshot): DocumentData {
  return snap.data({ serverTimestamps: "estimate" }) ?? {};
}

function toIso(value: unknown) {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) return value;
  return new Date(0).toISOString();
}

const text = (value: unknown, fallback = "") => (typeof value === "string" ? value : fallback);
const textOrNull = (value: unknown) => (typeof value === "string" && value.length > 0 ? value : null);
const number = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

/** "YYYY-MM-DD" (como se guarda en Firestore) → ISO a medianoche local. */
export function dateInputToIso(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toISOString();
}

const stringList = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const dateOnly = (value: unknown) => (typeof value === "string" && DATE_ONLY.test(value) ? value : null);

const COLOR_VALUES = new Set<string>(CATEGORY_COLORS.map((color) => color.value));

/** Categorías del proyecto; sin campo (proyectos antiguos) o vacío → las de serie. */
function toCategories(value: unknown): ProjectCategory[] {
  if (!Array.isArray(value) || value.length === 0) return DEFAULT_CATEGORIES;
  const categories: ProjectCategory[] = [];
  for (const raw of value) {
    if (typeof raw !== "object" || raw === null) continue;
    const entry = raw as Record<string, unknown>;
    const id = textOrNull(entry.id);
    if (!id || categories.some((c) => c.id === id)) continue;
    categories.push({
      id,
      name: text(entry.name, "Categoría").slice(0, 40) || "Categoría",
      color: typeof entry.color === "string" && COLOR_VALUES.has(entry.color) ? entry.color : "#8a8f98",
      icon: typeof entry.icon === "string" && entry.icon in CATEGORY_ICONS ? entry.icon : "tag",
    });
  }
  return categories.length > 0 ? categories : DEFAULT_CATEGORIES;
}

function toSubtasks(value: unknown): Subtask[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    if (typeof raw !== "object" || raw === null) return [];
    const entry = raw as Record<string, unknown>;
    const id = textOrNull(entry.id);
    return id ? [{ id, title: text(entry.title), done: entry.done === true }] : [];
  });
}

/** `members` del documento → mapa de perfiles (ignora entradas mal formadas). */
function toMemberProfiles(value: unknown): Record<string, MemberProfile> {
  if (typeof value !== "object" || value === null) return {};
  const profiles: Record<string, MemberProfile> = {};
  for (const [uid, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw !== "object" || raw === null) continue;
    const entry = raw as Record<string, unknown>;
    profiles[uid] = {
      name: textOrNull(entry.name),
      email: textOrNull(entry.email),
      photoURL: textOrNull(entry.photoURL),
    };
  }
  return profiles;
}

/** Nombre a mostrar: nombre, o la parte local del email, o un genérico. */
export function memberDisplayName(member: Pick<MemberProfile, "name" | "email"> | undefined | null) {
  // Sin nombre ni email solo puede ser una cuenta de invitado (anónima).
  return member?.name || member?.email?.split("@")[0] || "Invitado";
}

export function toProjectSummary(snap: Snapshot): ProjectSummary {
  const d = read(snap);
  return {
    id: snap.id,
    key: text(d.key, "PRJ"),
    name: text(d.name, "Proyecto sin nombre"),
    ownerId: text(d.ownerId),
    createdAt: toIso(d.createdAt),
    members: toMemberProfiles(d.members),
    categories: toCategories(d.categories),
  };
}

export function toWorkspaceProject(snap: Snapshot): WorkspaceProject {
  const d = read(snap);
  const ownerId = text(d.ownerId);
  const memberIds = stringList(d.memberIds);
  const profiles = toMemberProfiles(d.members);
  const members: ProjectMember[] = memberIds
    .map((uid) => ({
      uid,
      isOwner: uid === ownerId,
      ...(profiles[uid] ?? { name: null, email: null, photoURL: null }),
    }))
    .sort((a, b) => Number(b.isOwner) - Number(a.isOwner) || memberDisplayName(a).localeCompare(memberDisplayName(b)));

  return {
    id: snap.id,
    key: text(d.key, "PRJ"),
    name: text(d.name, "Proyecto sin nombre"),
    description: textOrNull(d.description),
    ownerId,
    memberIds,
    members,
    invitedEmails: stringList(d.invitedEmails),
    categories: toCategories(d.categories),
    inviteCode: textOrNull(d.inviteCode),
  };
}

export function toMilestone(snap: Snapshot): BoardMilestone {
  const d = read(snap);
  return {
    id: snap.id,
    title: text(d.title, "Hito"),
    description: textOrNull(d.description),
    status: isOneOf(MilestoneStatus, d.status) ? d.status : "PLANNED",
    startDate: dateInputToIso(d.startDate),
    endDate: dateInputToIso(d.endDate),
  };
}

export function toTask(snap: Snapshot): BoardTask {
  const d = read(snap);
  return {
    id: snap.id,
    number: number(d.number),
    title: text(d.title, "Tarea sin título"),
    description: textOrNull(d.description),
    status: isOneOf(TaskStatus, d.status) ? d.status : "TODO",
    category: text(d.category, "PROGRAMMING") || "PROGRAMMING",
    priority: isOneOf(TaskPriority, d.priority) ? d.priority : "MEDIUM",
    estimatedHours: typeof d.estimatedHours === "number" ? d.estimatedHours : null,
    loggedHours: number(d.loggedHours),
    position: number(d.position),
    milestoneId: textOrNull(d.milestoneId),
    gddNodeId: textOrNull(d.gddNodeId),
    assigneeId: textOrNull(d.assigneeId),
    startDate: dateOnly(d.startDate),
    dueDate: dateOnly(d.dueDate),
    tags: stringList(d.tags),
    subtasks: toSubtasks(d.subtasks),
    blockedBy: stringList(d.blockedBy),
    completedAt: d.completedAt ? toIso(d.completedAt) : null,
    createdBy: textOrNull(d.createdBy),
    createdAt: toIso(d.createdAt),
    updatedAt: toIso(d.updatedAt),
  };
}

export function toComment(snap: Snapshot): TaskComment {
  const d = read(snap);
  return {
    id: snap.id,
    authorId: text(d.authorId),
    body: text(d.body),
    createdAt: toIso(d.createdAt),
    editedAt: d.editedAt ? toIso(d.editedAt) : null,
  };
}

const ACTIVITY_TYPES: ActivityType[] = [
  "task.created",
  "task.status",
  "task.assigned",
  "task.milestone",
  "task.deleted",
  "task.commented",
  "task.logged",
  "member.joined",
];

export function toActivity(snap: Snapshot): ActivityEvent | null {
  const d = read(snap);
  if (!ACTIVITY_TYPES.includes(d.type)) return null;
  const data: ActivityEvent["data"] = {};
  if (typeof d.data === "object" && d.data !== null) {
    for (const [key, value] of Object.entries(d.data as Record<string, unknown>)) {
      if (typeof value === "string" || typeof value === "number" || value === null) data[key] = value;
    }
  }
  return {
    id: snap.id,
    actorId: text(d.actorId),
    type: d.type as ActivityType,
    taskId: textOrNull(d.taskId),
    data,
    createdAt: toIso(d.createdAt),
  };
}

export function toGddNode(snap: Snapshot): { node: BoardGddNode; content: string } {
  const d = read(snap);
  return {
    node: {
      id: snap.id,
      title: text(d.title, "Sin título"),
      parentId: textOrNull(d.parentId),
      position: number(d.position),
      updatedAt: toIso(d.updatedAt),
    },
    content: text(d.content),
  };
}

/** Orden cronológico por inicio (los que no tienen fecha, al final). */
export function sortMilestones(milestones: BoardMilestone[]) {
  return [...milestones].sort((a, b) => {
    if (a.startDate === b.startDate) return a.title.localeCompare(b.title);
    if (!a.startDate) return 1;
    if (!b.startDate) return -1;
    return a.startDate.localeCompare(b.startDate);
  });
}
