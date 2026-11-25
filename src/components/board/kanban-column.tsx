"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";

import { StatusIcon } from "@/components/tasks/task-icons";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { TaskStatus } from "@/lib/domain";
import { formatHours, openBlockers } from "@/lib/board";
import { STATUS_META } from "@/lib/constants";
import type { BoardTask, MemberProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FORMER_MEMBER, type CardGddLink } from "./task-card";
import { SortableTaskCard } from "./sortable-task-card";

type KanbanColumnProps = {
  status: TaskStatus;
  taskIds: string[];
  tasks: Record<string, BoardTask>;
  projectKey: string;
  /** Vínculos al GDD precalculados (objetos estables para no romper el memo de las tarjetas). */
  gddIndex: Map<string, CardGddLink>;
  /** Miembros por uid (para el avatar del responsable). */
  memberIndex: Map<string, MemberProfile>;
  /** La tarjeta arrastrada está ahora en esta columna. */
  isDropTarget: boolean;
  isDragging: boolean;
  /** Hay filtros activos: una columna vacía significa "sin resultados". */
  filtering: boolean;
  onOpen: (taskId: string) => void;
  onAdd: (status: TaskStatus) => void;
};

export function KanbanColumn({
  status,
  taskIds,
  tasks,
  projectKey,
  gddIndex,
  memberIndex,
  isDropTarget,
  isDragging,
  filtering,
  onOpen,
  onAdd,
}: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id: status, data: { type: "column" } });
  const { label } = STATUS_META[status];
  const hours = taskIds.reduce((sum, id) => sum + (tasks[id]?.estimatedHours ?? 0), 0);
  const headingId = `column-${status}`;

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        // Móvil: una columna casi a pantalla completa con snap. Escritorio: las
        // cuatro reparten el ancho disponible y hacen scroll solo si no caben.
        "flex h-full w-[85vw] max-w-[320px] shrink-0 snap-start flex-col rounded-xl border border-transparent bg-white/[0.018] transition-colors duration-150",
        "sm:w-auto sm:max-w-[420px] sm:min-w-[264px] sm:flex-1 sm:basis-0",
        isDropTarget && "border-primary/25 bg-primary/[0.045]",
      )}
    >
      <header className="flex h-11 shrink-0 items-center gap-2 pr-1.5 pl-3">
        <StatusIcon status={status} />
        <h2 id={headingId} className="text-[13px] font-medium">
          {label}
        </h2>
        <span className="text-xs text-muted-foreground tabular-nums">{taskIds.length}</span>
        {hours > 0 && (
          <span className="ml-auto font-mono text-[11px] text-muted-foreground/80 tabular-nums" title="Horas estimadas en la columna">
            {formatHours(hours)}h
          </span>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onAdd(status)}
              className={cn("text-muted-foreground", hours === 0 && "ml-auto")}
              aria-label={`Añadir tarea en ${label}`}
            >
              <Plus />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Añadir en {label}</TooltipContent>
        </Tooltip>
      </header>

      <div
        ref={setNodeRef}
        className="scrollbar-subtle flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-2 pb-2"
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {taskIds.map((id) => {
            const task = tasks[id];
            if (!task) return null;
            return (
              <SortableTaskCard
                key={id}
                task={task}
                projectKey={projectKey}
                gdd={(task.gddNodeId && gddIndex.get(task.gddNodeId)) || null}
                assignee={task.assigneeId ? (memberIndex.get(task.assigneeId) ?? FORMER_MEMBER) : null}
                blockedBy={task.blockedBy.length > 0 ? openBlockers(task, tasks).length : 0}
                onOpen={onOpen}
              />
            );
          })}
        </SortableContext>

        {taskIds.length === 0 && (
          <button
            type="button"
            onClick={() => onAdd(status)}
            className={cn(
              "flex h-20 shrink-0 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground/70 transition-colors",
              "hover:border-white/15 hover:text-muted-foreground",
              isDragging && "border-primary/30 text-primary/80",
            )}
          >
            {isDragging ? "Suelta aquí" : filtering ? "Sin resultados" : "Sin tareas · añadir"}
          </button>
        )}
      </div>
    </section>
  );
}
