"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

import { useCurrentUser } from "@/components/auth/auth-provider";
import { MemberAvatar } from "@/components/members/member-avatar";
import { CategoryIcon, PriorityIcon } from "@/components/tasks/task-icons";
import { Button } from "@/components/ui/button";
import type { TaskStatus } from "@/lib/domain";
import { useHotkey } from "@/hooks/use-hotkey";
import { DUE_FILTERS, UNASSIGNED } from "@/lib/board";
import { findCategory, PRIORITY_META } from "@/lib/constants";
import { memberDisplayName } from "@/lib/firestore/mappers";
import { useWorkspaceStore, useWorkspaceStoreApi } from "@/stores/workspace-store-provider";
import { BoardHeader } from "./board-header";
import { KanbanBoard } from "./kanban-board";

/** PÃ¡gina del tablero: header, filtros activos y columnas (el panel de tarea vive en el layout). */
export function BoardView() {
  const user = useCurrentUser();
  const searchRef = useRef<HTMLInputElement>(null);
  const milestoneId = useWorkspaceStore((s) => s.milestoneId);
  const categories = useWorkspaceStore((s) => s.categoryFilter);
  const assignee = useWorkspaceStore((s) => s.assigneeFilter);
  const setAssigneeFilter = useWorkspaceStore((s) => s.setAssigneeFilter);
  const panelOpen = useWorkspaceStore((s) => s.panel?.open ?? false);
  const paletteOpen = useWorkspaceStore((s) => s.paletteOpen);
  const openCreate = useWorkspaceStore((s) => s.openCreate);
  const hotkeysEnabled = !panelOpen && !paletteOpen;
  const storeApi = useWorkspaceStoreApi();

  // Enlaces desde "Mi panel": /board?tarea=<id> abre esa tarea (en su hito).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const taskId = params.get("tarea");
    if (!taskId) return;
    const { tasks, setMilestone, openTask } = storeApi.getState();
    const task = tasks[taskId];
    if (task) {
      setMilestone(task.milestoneId);
      openTask(taskId);
    }
    params.delete("tarea");
    const rest = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (rest ? `?${rest}` : ""));
  }, [storeApi]);

  const createIn = useCallback(
    (status: TaskStatus = "TODO") =>
      openCreate({
        status,
        milestoneId,
        // La tarea nace dentro de los filtros activos, para que no "desaparezca".
        ...(categories.length === 1 && { category: categories[0] }),
        ...(assignee && assignee !== UNASSIGNED && { assigneeId: assignee }),
      }),
    [openCreate, milestoneId, categories, assignee],
  );

  useHotkey(
    "c",
    (event) => {
      event.preventDefault();
      createIn();
    },
    { enabled: hotkeysEnabled },
  );
  useHotkey(
    "/",
    (event) => {
      event.preventDefault();
      searchRef.current?.focus();
    },
    { enabled: hotkeysEnabled },
  );
  useHotkey(
    "m",
    (event) => {
      event.preventDefault();
      setAssigneeFilter(assignee === user.uid ? null : user.uid);
    },
    { enabled: hotkeysEnabled },
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <BoardHeader searchRef={searchRef} onNewTask={() => createIn()} />
      <ActiveFilters />
      <KanbanBoard onAdd={createIn} />
    </div>
  );
}

/** Recordatorio de filtros activos: evita pensar que faltan tareas. */
function ActiveFilters() {
  const user = useCurrentUser();
  const categories = useWorkspaceStore((s) => s.categoryFilter);
  const assignee = useWorkspaceStore((s) => s.assigneeFilter);
  const members = useWorkspaceStore((s) => s.project.members);
  const projectCategories = useWorkspaceStore((s) => s.project.categories);
  const priorities = useWorkspaceStore((s) => s.priorityFilter);
  const tags = useWorkspaceStore((s) => s.tagFilter);
  const due = useWorkspaceStore((s) => s.dueFilter);
  const query = useWorkspaceStore((s) => s.query);
  const toggleCategory = useWorkspaceStore((s) => s.toggleCategory);
  const togglePriority = useWorkspaceStore((s) => s.togglePriority);
  const toggleTag = useWorkspaceStore((s) => s.toggleTag);
  const setDueFilter = useWorkspaceStore((s) => s.setDueFilter);
  const setAssigneeFilter = useWorkspaceStore((s) => s.setAssigneeFilter);
  const setQuery = useWorkspaceStore((s) => s.setQuery);
  const clearFilters = useWorkspaceStore((s) => s.clearFilters);

  if (categories.length === 0 && !assignee && priorities.length === 0 && tags.length === 0 && !due && !query.trim()) {
    return null;
  }

  const member = assignee && assignee !== UNASSIGNED ? members.find((m) => m.uid === assignee) : undefined;
  const assigneeLabel =
    assignee === UNASSIGNED ? "Sin asignar" : assignee === user.uid ? "Mis tareas" : memberDisplayName(member);

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b px-4 py-2 text-xs">
      <span className="mr-1 text-muted-foreground">Filtrando</span>
      {assignee && (
        <FilterChip label={`Quitar filtro ${assigneeLabel}`} onRemove={() => setAssigneeFilter(null)}>
          <MemberAvatar size="xs" name={member?.name} email={member?.email} photoURL={member?.photoURL} />
          {assigneeLabel}
        </FilterChip>
      )}
      {categories.map((id) => {
        const category = findCategory(projectCategories, id);
        return (
          <FilterChip key={id} label={`Quitar filtro ${category.name}`} onRemove={() => toggleCategory(id)}>
            <CategoryIcon category={category} className="size-3" />
            {category.name}
          </FilterChip>
        );
      })}
      {priorities.map((priority) => (
        <FilterChip
          key={priority}
          label={`Quitar filtro de prioridad ${PRIORITY_META[priority].label}`}
          onRemove={() => togglePriority(priority)}
        >
          <PriorityIcon priority={priority} className="size-3" />
          {PRIORITY_META[priority].label}
        </FilterChip>
      ))}
      {tags.map((tag) => (
        <FilterChip key={tag} label={`Quitar filtro de etiqueta ${tag}`} onRemove={() => toggleTag(tag)}>
          #{tag}
        </FilterChip>
      ))}
      {due && (
        <FilterChip label="Quitar filtro de fecha límite" onRemove={() => setDueFilter(null)}>
          {DUE_FILTERS.find((option) => option.value === due)?.label}
        </FilterChip>
      )}
      {query.trim() && (
        <FilterChip label="Quitar bÃºsqueda" onRemove={() => setQuery("")}>
          <span className="text-muted-foreground">Texto:</span> â€œ{query.trim()}â€
        </FilterChip>
      )}
      <Button
        variant="ghost"
        size="xs"
        className="text-muted-foreground"
        onClick={clearFilters}
      >
        Limpiar todo
      </Button>
    </div>
  );
}

function FilterChip({ label, onRemove, children }: { label: string; onRemove: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="group/chip flex h-6 items-center gap-1.5 rounded-md border bg-card px-2 transition-colors duration-150 hover:border-white/15"
      aria-label={label}
    >
      {children}
      <X className="size-3 text-muted-foreground group-hover/chip:text-foreground" aria-hidden />
    </button>
  );
}
