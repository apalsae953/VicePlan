"use client";

import { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { formatTaskId } from "@/lib/board";
import type { BoardTask, MemberProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TaskCard, type CardGddLink } from "./task-card";
import { TaskContextMenu } from "./task-context-menu";

type SortableTaskCardProps = {
  task: BoardTask;
  projectKey: string;
  gdd: CardGddLink;
  assignee: MemberProfile | null;
  /** Dependencias abiertas (0 = no está bloqueada). */
  blockedBy: number;
  onOpen: (taskId: string) => void;
};

/**
 * Tarjeta arrastrable. Clic o Enter abre el detalle; Espacio la levanta para
 * moverla con el teclado. Mientras se arrastra, deja un hueco fantasma.
 */
export const SortableTaskCard = memo(function SortableTaskCard({
  task,
  projectKey,
  gdd,
  assignee,
  blockedBy,
  onOpen,
}: SortableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "task" },
  });

  return (
    <TaskContextMenu taskId={task.id} disabled={isDragging}>
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      aria-label={`${formatTaskId(projectKey, task.number)}: ${task.title}`}
      onClick={() => onOpen(task.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onOpen(task.id);
          return;
        }
        listeners?.onKeyDown?.(event);
      }}
      className={cn(
        "cursor-pointer touch-manipulation rounded-lg outline-none select-none focus-visible:ring-2 focus-visible:ring-ring",
        isDragging && "cursor-grabbing",
      )}
    >
      <TaskCard
        task={task}
        projectKey={projectKey}
        gdd={gdd}
        assignee={assignee}
        blockedBy={blockedBy}
        className={cn(isDragging && "border-dashed border-white/20 bg-transparent opacity-40 shadow-none")}
      />
    </div>
    </TaskContextMenu>
  );
});
