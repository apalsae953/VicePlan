/**
 * Enums del dominio (antes los generaba Prisma). Objeto + tipo con el mismo
 * nombre: `TaskStatus.TODO` como valor y `TaskStatus` como tipo.
 * Firestore guarda los valores como strings; `firestore.rules` valida que
 * pertenezcan a estas listas, así que cualquier cambio aquí debe reflejarse
 * también allí.
 */

export const TaskStatus = {
  TODO: "TODO",
  IN_PROGRESS: "IN_PROGRESS",
  TESTING: "TESTING",
  DONE: "DONE",
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

/**
 * Id de una categoría (disciplina) del proyecto. Las categorías son
 * configurables por proyecto (`projects/{id}.categories`); las de serie
 * conservan los ids históricos (PROGRAMMING, ART…) para que las tareas
 * antiguas sigan encajando. Ver DEFAULT_CATEGORIES en constants.ts.
 */
export type TaskCategory = string;

export const TaskPriority = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
} as const;
export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];

export const MilestoneStatus = {
  PLANNED: "PLANNED",
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
} as const;
export type MilestoneStatus = (typeof MilestoneStatus)[keyof typeof MilestoneStatus];

export function isOneOf<T extends string>(values: Record<string, T>, input: unknown): input is T {
  return typeof input === "string" && (Object.values(values) as string[]).includes(input);
}
