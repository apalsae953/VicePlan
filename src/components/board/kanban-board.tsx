"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  getFirstCollision,
  KeyboardSensor,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import type { TaskStatus } from "@/lib/domain";
import type { MemberProfile } from "@/lib/types";
import { useTaskActions } from "@/hooks/use-task-actions";
import {
  buildColumns,
  filterTasks,
  findColumn,
  flattenGddTree,
  formatTaskId,
  isStatus,
  openBlockers,
  positionBetween,
  STATUS_ORDER,
  type Columns,
} from "@/lib/board";
import { STATUS_META } from "@/lib/constants";
import { useWorkspaceStore } from "@/stores/workspace-store-provider";
import { KanbanColumn } from "./kanban-column";
import { FORMER_MEMBER, TaskCard, type CardGddLink } from "./task-card";

/**
 * Tablero Kanban con dnd-kit (patrón "multiple containers").
 *
 * - Durante el arrastre se trabaja sobre una copia local de las columnas
 *   (`dragColumns`) para mover la tarjeta entre columnas en vivo.
 * - Al soltar se calcula la nueva posición fraccional entre sus vecinos y se
 *   persiste un único cambio (status + position) de forma optimista.
 */
export function KanbanBoard({ onAdd }: { onAdd: (status: TaskStatus) => void }) {
  const dndId = useId();
  const tasks = useWorkspaceStore((s) => s.tasks);
  const milestoneId = useWorkspaceStore((s) => s.milestoneId);
  const categories = useWorkspaceStore((s) => s.categoryFilter);
  const assignee = useWorkspaceStore((s) => s.assigneeFilter);
  const priorities = useWorkspaceStore((s) => s.priorityFilter);
  const tags = useWorkspaceStore((s) => s.tagFilter);
  const due = useWorkspaceStore((s) => s.dueFilter);
  const sort = useWorkspaceStore((s) => s.boardSort);
  const categoryList = useWorkspaceStore((s) => s.project.categories);
  const query = useWorkspaceStore((s) => s.query);
  const members = useWorkspaceStore((s) => s.project.members);
  const projectKey = useWorkspaceStore((s) => s.project.key);
  const gddNodes = useWorkspaceStore((s) => s.gddNodes);
  const openTask = useWorkspaceStore((s) => s.openTask);
  const { update } = useTaskActions();

  const gddIndex = useMemo(
    () =>
      new Map<string, CardGddLink>(
        flattenGddTree(gddNodes).map((node) => [
          node.id,
          { title: node.title, path: node.path, number: node.number },
        ]),
      ),
    [gddNodes],
  );
  const memberIndex = useMemo(
    () => new Map<string, MemberProfile>(members.map((member) => [member.uid, member])),
    [members],
  );
  const categoryNames = useMemo(() => new Map(categoryList.map((c) => [c.id, c.name])), [categoryList]);
  const gddTitles = useMemo(() => new Map(gddNodes.map((node) => [node.id, node.title])), [gddNodes]);

  const columns = useMemo(
    () =>
      buildColumns(
        filterTasks(Object.values(tasks), {
          milestoneId,
          categories,
          assignee,
          priorities,
          tags,
          due,
          query,
          projectKey,
          gddTitles,
          categoryNames,
        }),
        sort,
      ),
    [tasks, milestoneId, categories, assignee, priorities, tags, due, query, projectKey, gddTitles, categoryNames, sort],
  );
  const filtering =
    categories.length > 0 || assignee !== null || priorities.length > 0 || tags.length > 0 || due !== null || query.trim() !== "";

  const [dragColumns, setDragColumns] = useState<Columns | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const suppressClickUntil = useRef(0);
  const shown = dragColumns ?? columns;

  const sensors = useSensors(
    // Ratón: 5 px de margen; un clic abre la tarjeta, un arrastre la mueve.
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // Táctil: pulsación larga, para que deslizar siga desplazando el tablero.
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      // Enter queda libre para abrir el detalle.
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space", "Enter"] },
    }),
  );

  /**
   * Primero lo que hay bajo el puntero; si es una columna con tarjetas, la
   * tarjeta más cercana dentro de ella. Recuerda el último destino para evitar
   * parpadeos cuando el puntero cae en un hueco.
   */
  const collisionDetection = useCallback<CollisionDetection>(
    (args) => {
      const pointerHits = pointerWithin(args);
      const hits = pointerHits.length > 0 ? pointerHits : rectIntersection(args);
      let overId = getFirstCollision(hits, "id");

      if (overId != null) {
        if (isStatus(overId) && shown[overId].length > 0) {
          const items = shown[overId];
          const closest = closestCenter({
            ...args,
            droppableContainers: args.droppableContainers.filter(
              (container) => container.id !== overId && items.includes(String(container.id)),
            ),
          });
          overId = closest[0]?.id ?? overId;
        }
        lastOverId.current = overId;
        return [{ id: overId }];
      }
      return lastOverId.current != null ? [{ id: lastOverId.current }] : [];
    },
    [shown],
  );

  const handleOpen = useCallback(
    (taskId: string) => {
      // El pointerup de un arrastre puede generar un clic sobre la tarjeta.
      if (performance.now() < suppressClickUntil.current) return;
      openTask(taskId);
    },
    [openTask],
  );

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id));
    setDragColumns(columns);
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const activeKey = String(active.id);
    const overKey = String(over.id);

    setDragColumns((previous) => {
      const current = previous ?? columns;
      const from = findColumn(current, activeKey);
      const to = findColumn(current, overKey);
      if (!from || !to || from === to) return previous;

      const target = current[to];
      let index = target.length;
      if (!isStatus(overKey)) {
        const overIndex = target.indexOf(overKey);
        const translated = active.rect.current.translated;
        const below = translated != null && translated.top > over.rect.top + over.rect.height / 2;
        if (overIndex >= 0) index = overIndex + (below ? 1 : 0);
      }

      return {
        ...current,
        [from]: current[from].filter((id) => id !== activeKey),
        [to]: [...target.slice(0, index), activeKey, ...target.slice(index)],
      };
    });
  }

  function resetDrag() {
    setActiveId(null);
    setDragColumns(null);
    lastOverId.current = null;
    suppressClickUntil.current = performance.now() + 150;
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    const taskId = String(active.id);
    const current = dragColumns ?? columns;
    const task = tasks[taskId];
    resetDrag();
    if (!over || !task) return;

    const to = findColumn(current, String(over.id));
    if (!to) return;

    let ids = current[to];
    const fromIndex = ids.indexOf(taskId);
    const overIndex = isStatus(over.id) ? ids.length - 1 : ids.indexOf(String(over.id));
    if (fromIndex !== -1 && overIndex !== -1 && fromIndex !== overIndex) {
      ids = arrayMove(ids, fromIndex, overIndex);
    }
    const index = ids.indexOf(taskId);
    if (index === -1) return;
    // Misma columna y mismo sitio: nada que guardar.
    if (to === task.status && columns[to].indexOf(taskId) === index) return;

    const before = ids[index - 1] ? tasks[ids[index - 1]]?.position : undefined;
    const after = ids[index + 1] ? tasks[ids[index + 1]]?.position : undefined;
    void update(taskId, { status: to, position: positionBetween(before, after) });
  }

  const label = (id: UniqueIdentifier) => {
    const task = tasks[String(id)];
    return task ? formatTaskId(projectKey, task.number) : "la tarea";
  };
  const targetLabel = (id: UniqueIdentifier) => {
    const status = isStatus(id) ? id : findColumn(shown, String(id));
    return status ? STATUS_META[status].label : "el tablero";
  };
  const announcements: Announcements = {
    onDragStart: ({ active }) => `${label(active.id)} levantada.`,
    onDragOver: ({ active, over }) =>
      over ? `${label(active.id)} sobre ${targetLabel(over.id)}.` : `${label(active.id)} fuera de las columnas.`,
    onDragEnd: ({ active, over }) =>
      over ? `${label(active.id)} soltada en ${targetLabel(over.id)}.` : `${label(active.id)} soltada.`,
    onDragCancel: ({ active }) => `Movimiento de ${label(active.id)} cancelado.`,
  };

  const activeTask = activeId ? tasks[activeId] : null;
  const activeColumn = activeId ? findColumn(shown, activeId) : null;

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={resetDrag}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            "Pulsa Espacio para levantar la tarea, muévela con las flechas y vuelve a pulsar Espacio para soltarla. Escape cancela. Enter abre el detalle.",
        },
      }}
    >
      <div className="scrollbar-subtle flex min-h-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto p-3 sm:snap-none">
        {STATUS_ORDER.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            taskIds={shown[status]}
            tasks={tasks}
            projectKey={projectKey}
            gddIndex={gddIndex}
            memberIndex={memberIndex}
            isDropTarget={activeColumn === status}
            isDragging={activeId !== null}
            filtering={filtering}
            onOpen={handleOpen}
            onAdd={onAdd}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }}>
        {activeTask ? (
          <TaskCard
            overlay
            task={activeTask}
            projectKey={projectKey}
            gdd={(activeTask.gddNodeId && gddIndex.get(activeTask.gddNodeId)) || null}
            assignee={activeTask.assigneeId ? (memberIndex.get(activeTask.assigneeId) ?? FORMER_MEMBER) : null}
            blockedBy={openBlockers(activeTask, tasks).length}
            className="motion-safe:rotate-[1.5deg]"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
