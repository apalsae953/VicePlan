import { createStore } from "zustand/vanilla";

import type { TaskCategory, TaskPriority } from "@/lib/domain";
import { pickDefaultMilestone, UNASSIGNED, type BoardSort, type DueFilter } from "@/lib/board";
import { sortMilestones } from "@/lib/firestore/mappers";
import type {
  BoardGddNode,
  BoardMilestone,
  BoardTask,
  TaskDraft,
  Workspace,
  ProjectCategory,
  ProjectMember,
  WorkspaceProject,
} from "@/lib/types";

function sameCategories(a: ProjectCategory[], b: ProjectCategory[]) {
  return (
    a.length === b.length &&
    a.every((c, i) => c.id === b[i].id && c.name === b[i].name && c.color === b[i].color && c.icon === b[i].icon)
  );
}

function sameMembers(a: ProjectMember[], b: ProjectMember[]) {
  return (
    a.length === b.length &&
    a.every(
      (member, i) =>
        member.uid === b[i].uid &&
        member.name === b[i].name &&
        member.email === b[i].email &&
        member.photoURL === b[i].photoURL &&
        member.isOwner === b[i].isOwner,
    )
  );
}

/**
 * Estado de cliente de un proyecto, compartido por tablero, GDD, milestones y
 * métricas: datos del proyecto, filtros, árbol plegado y panel de tarea.
 *
 * Los datos llegan de Firestore en tiempo real (`useWorkspaceSubscription`
 * llama a las acciones `sync*` en cada snapshot). Las mutaciones escriben en
 * Firestore y, para que la UI no espere ni un frame, aplican también el cambio
 * aquí; el snapshot que llega después lo confirma (o lo revierte si las reglas
 * lo rechazan).
 *
 * Un store por proyecto y por pestaña (ver WorkspaceStoreProvider), nunca un
 * singleton de módulo.
 */

/** Pestaña abierta del diálogo de configuración del proyecto. */
export type ProjectSettingsTab = "general" | "members" | "categories";

export type TaskPanel =
  | { open: boolean; mode: "edit"; taskId: string }
  | { open: boolean; mode: "create"; defaults: Partial<TaskDraft>; nonce: number };

export type WorkspaceState = {
  project: WorkspaceProject;
  milestones: BoardMilestone[];
  tasks: Record<string, BoardTask>;

  /** Estructura del árbol del GDD (títulos, jerarquía, orden). */
  gddNodes: BoardGddNode[];
  /**
   * Markdown por nodo. Va separado de la estructura para que escribir en el
   * editor no re-renderice el árbol ni los selectores en cada pulsación.
   */
  gddContent: Record<string, string>;
  /** Nodos plegados en el árbol (por defecto todo desplegado). */
  gddCollapsed: Record<string, boolean>;
  /**
   * Páginas con cambios escritos pero aún no enviados (autoguardado pendiente):
   * un snapshot remoto no debe pisar lo que el usuario está tecleando.
   */
  gddDirty: Record<string, boolean>;

  /** Milestone visible en el tablero; `null` = backlog. */
  milestoneId: string | null;
  categoryFilter: TaskCategory[];
  /** Filtro por responsable: null = todos, UNASSIGNED = sin asignar, o un uid. */
  assigneeFilter: string | null;
  priorityFilter: TaskPriority[];
  tagFilter: string[];
  dueFilter: DueFilter;
  boardSort: BoardSort;
  query: string;
  /** Diálogo de configuración del proyecto (general / miembros). */
  projectSettings: ProjectSettingsTab | null;
  /** Paleta de comandos (Ctrl/Cmd + K). */
  paletteOpen: boolean;
  /** Diálogo "Unirme con un código". */
  joinOpen: boolean;
  /** Se conserva al cerrar (open: false) para que el panel anime su salida con contenido. */
  panel: TaskPanel | null;
};

export type WorkspaceActions = {
  setMilestone: (milestoneId: string | null) => void;
  toggleCategory: (category: TaskCategory) => void;
  clearCategories: () => void;
  setAssigneeFilter: (assigneeFilter: string | null) => void;
  togglePriority: (priority: TaskPriority) => void;
  toggleTag: (tag: string) => void;
  setDueFilter: (dueFilter: DueFilter) => void;
  setBoardSort: (boardSort: BoardSort) => void;
  /** Quita todos los filtros del tablero (no el milestone visible). */
  clearFilters: () => void;
  setQuery: (query: string) => void;
  openProjectSettings: (tab?: ProjectSettingsTab) => void;
  closeProjectSettings: () => void;
  setPaletteOpen: (open: boolean) => void;
  setJoinOpen: (open: boolean) => void;

  openTask: (taskId: string) => void;
  openCreate: (defaults?: Partial<TaskDraft>) => void;
  closePanel: () => void;

  upsertTask: (task: BoardTask) => void;
  patchTask: (taskId: string, patch: Partial<BoardTask>) => void;
  removeTask: (taskId: string) => void;

  /** Inserta o reemplaza un milestone, manteniendo el orden por fecha de inicio. */
  upsertMilestone: (milestone: BoardMilestone) => void;
  /** Quita un milestone y manda sus tareas al backlog, como hace la BD. */
  removeMilestone: (milestoneId: string) => void;

  upsertGddNode: (node: BoardGddNode, content?: string) => void;
  patchGddNode: (nodeId: string, patch: Partial<BoardGddNode>) => void;
  setGddContent: (nodeId: string, content: string) => void;
  /** Quita nodos (un subárbol) y desvincula sus tareas, como hace la BD. */
  removeGddNodes: (nodeIds: string[]) => void;
  setGddCollapsed: (nodeId: string, collapsed: boolean) => void;
  setGddDirty: (nodeId: string, dirty: boolean) => void;

  // ─── Sincronización desde Firestore (snapshots) ───────────────────────────
  syncProject: (project: WorkspaceProject) => void;
  syncMilestones: (milestones: BoardMilestone[]) => void;
  /** Aplica solo los cambios del snapshot: las tareas intactas conservan su identidad (memo). */
  syncTasks: (changes: { upserts: BoardTask[]; removals: string[] }) => void;
  syncGdd: (nodes: BoardGddNode[], contents: Record<string, string>) => void;
};

export type WorkspaceStore = WorkspaceState & WorkspaceActions;

export function createWorkspaceStore(workspace: Workspace) {
  return createStore<WorkspaceStore>()((set) => ({
    project: workspace.project,
    milestones: workspace.milestones,
    tasks: Object.fromEntries(workspace.tasks.map((task) => [task.id, task])),
    gddNodes: workspace.gddNodes,
    gddContent: workspace.gddContent,
    gddCollapsed: {},
    gddDirty: {},
    milestoneId: pickDefaultMilestone(workspace.milestones),
    categoryFilter: [],
    assigneeFilter: null,
    priorityFilter: [],
    tagFilter: [],
    dueFilter: null,
    boardSort: "manual",
    query: "",
    projectSettings: null,
    paletteOpen: false,
    joinOpen: false,
    panel: null,

    setMilestone: (milestoneId) => set({ milestoneId }),
    toggleCategory: (category) =>
      set((state) => ({
        categoryFilter: state.categoryFilter.includes(category)
          ? state.categoryFilter.filter((c) => c !== category)
          : [...state.categoryFilter, category],
      })),
    clearCategories: () => set({ categoryFilter: [] }),
    setAssigneeFilter: (assigneeFilter) => set({ assigneeFilter }),
    togglePriority: (priority) =>
      set((state) => ({
        priorityFilter: state.priorityFilter.includes(priority)
          ? state.priorityFilter.filter((p) => p !== priority)
          : [...state.priorityFilter, priority],
      })),
    toggleTag: (tag) =>
      set((state) => ({
        tagFilter: state.tagFilter.includes(tag) ? state.tagFilter.filter((t) => t !== tag) : [...state.tagFilter, tag],
      })),
    setDueFilter: (dueFilter) => set({ dueFilter }),
    setBoardSort: (boardSort) => set({ boardSort }),
    clearFilters: () =>
      set({ categoryFilter: [], assigneeFilter: null, priorityFilter: [], tagFilter: [], dueFilter: null, query: "" }),
    setQuery: (query) => set({ query }),
    openProjectSettings: (tab = "general") => set({ projectSettings: tab }),
    closeProjectSettings: () => set({ projectSettings: null }),
    setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
    setJoinOpen: (joinOpen) => set({ joinOpen }),

    openTask: (taskId) => set({ panel: { open: true, mode: "edit", taskId } }),
    openCreate: (defaults = {}) =>
      set({ panel: { open: true, mode: "create", defaults, nonce: Date.now() } }),
    closePanel: () =>
      set((state) => (state.panel ? { panel: { ...state.panel, open: false } } : state)),

    upsertTask: (task) => set((state) => ({ tasks: { ...state.tasks, [task.id]: task } })),
    patchTask: (taskId, patch) =>
      set((state) => {
        const task = state.tasks[taskId];
        if (!task) return state;
        return { tasks: { ...state.tasks, [taskId]: { ...task, ...patch } } };
      }),
    removeTask: (taskId) =>
      set((state) => {
        const tasks = { ...state.tasks };
        delete tasks[taskId];
        return { tasks };
      }),

    upsertMilestone: (milestone) =>
      set((state) => ({
        milestones: sortMilestones([
          ...state.milestones.filter((m) => m.id !== milestone.id),
          milestone,
        ]),
      })),
    removeMilestone: (milestoneId) =>
      set((state) => {
        const tasks = { ...state.tasks };
        for (const task of Object.values(tasks)) {
          if (task.milestoneId === milestoneId) tasks[task.id] = { ...task, milestoneId: null };
        }
        const milestones = state.milestones.filter((m) => m.id !== milestoneId);
        return {
          milestones,
          tasks,
          milestoneId: state.milestoneId === milestoneId ? pickDefaultMilestone(milestones) : state.milestoneId,
        };
      }),

    upsertGddNode: (node, content) =>
      set((state) => {
        const exists = state.gddNodes.some((n) => n.id === node.id);
        return {
          gddNodes: exists
            ? state.gddNodes.map((n) => (n.id === node.id ? node : n))
            : [...state.gddNodes, node],
          gddContent:
            content === undefined ? state.gddContent : { ...state.gddContent, [node.id]: content },
        };
      }),
    patchGddNode: (nodeId, patch) =>
      set((state) => ({
        gddNodes: state.gddNodes.map((node) => (node.id === nodeId ? { ...node, ...patch } : node)),
      })),
    setGddContent: (nodeId, content) =>
      set((state) => ({ gddContent: { ...state.gddContent, [nodeId]: content } })),
    removeGddNodes: (nodeIds) =>
      set((state) => {
        const removed = new Set(nodeIds);
        const gddContent = { ...state.gddContent };
        for (const id of nodeIds) delete gddContent[id];
        const tasks = { ...state.tasks };
        for (const task of Object.values(tasks)) {
          if (task.gddNodeId && removed.has(task.gddNodeId)) tasks[task.id] = { ...task, gddNodeId: null };
        }
        return {
          gddNodes: state.gddNodes.filter((node) => !removed.has(node.id)),
          gddContent,
          tasks,
        };
      }),
    setGddCollapsed: (nodeId, collapsed) =>
      set((state) => ({ gddCollapsed: { ...state.gddCollapsed, [nodeId]: collapsed } })),
    setGddDirty: (nodeId, dirty) =>
      set((state) => {
        if (!!state.gddDirty[nodeId] === dirty) return state;
        const gddDirty = { ...state.gddDirty };
        if (dirty) gddDirty[nodeId] = true;
        else delete gddDirty[nodeId];
        return { gddDirty };
      }),

    syncProject: (project) =>
      set((state) => {
        // Cada tarea nueva toca el proyecto (taskCounter): conservar la lista de
        // miembros si no cambió evita re-renderizar avatares y tarjetas.
        const members = sameMembers(state.project.members, project.members) ? state.project.members : project.members;
        const categories = sameCategories(state.project.categories, project.categories)
          ? state.project.categories
          : project.categories;
        // Un filtro por una categoría que ya no existe dejaría el tablero vacío.
        const categoryFilter = state.categoryFilter.filter((id) => categories.some((c) => c.id === id));
        const stillMember =
          !state.assigneeFilter || state.assigneeFilter === UNASSIGNED || project.memberIds.includes(state.assigneeFilter);
        return {
          project: { ...project, members, categories },
          assigneeFilter: stillMember ? state.assigneeFilter : null,
          categoryFilter: categoryFilter.length === state.categoryFilter.length ? state.categoryFilter : categoryFilter,
        };
      }),
    syncMilestones: (milestones) =>
      set((state) => ({
        milestones,
        // Si el milestone visible desaparece (lo borró otra persona), elegir otro.
        milestoneId:
          state.milestoneId && !milestones.some((m) => m.id === state.milestoneId)
            ? pickDefaultMilestone(milestones)
            : state.milestoneId,
      })),
    syncTasks: ({ upserts, removals }) =>
      set((state) => {
        if (upserts.length === 0 && removals.length === 0) return state;
        const tasks = { ...state.tasks };
        for (const task of upserts) tasks[task.id] = task;
        for (const id of removals) delete tasks[id];
        return { tasks };
      }),
    syncGdd: (nodes, contents) =>
      set((state) => {
        const gddContent: Record<string, string> = {};
        for (const node of nodes) {
          // Lo que el usuario está escribiendo (sin enviar) gana al snapshot.
          gddContent[node.id] = state.gddDirty[node.id]
            ? (state.gddContent[node.id] ?? contents[node.id] ?? "")
            : (contents[node.id] ?? "");
        }
        return { gddNodes: nodes, gddContent };
      }),
  }));
}

export type WorkspaceStoreApi = ReturnType<typeof createWorkspaceStore>;
