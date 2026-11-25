"use client";

import type { ComponentProps } from "react";
import { BookText, CalendarDays, Clock, Link2, ListChecks } from "lucide-react";

import { MemberAvatar } from "@/components/members/member-avatar";
import { CategoryBadge, PriorityIcon, useCategory } from "@/components/tasks/task-icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { describeDue, formatHours, formatTaskId } from "@/lib/board";
import { PRIORITY_META } from "@/lib/constants";
import { memberDisplayName } from "@/lib/firestore/mappers";
import type { BoardTask, MemberProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

export type CardGddLink = { title: string; path: string[]; number: string } | null;

/** Responsable que ya no es miembro del proyecto (avatar neutro). */
export const FORMER_MEMBER: MemberProfile = { name: null, email: null, photoURL: null };

type TaskCardProps = {
  task: BoardTask;
  projectKey: string;
  gdd: CardGddLink;
  /** Responsable (null = sin asignar). Objeto estable para no romper el memo. */
  assignee?: MemberProfile | null;
  /** Tareas abiertas que la bloquean (dependencias sin cerrar). */
  blockedBy?: number;
  /** Copia flotante que sigue al cursor durante el arrastre. */
  overlay?: boolean;
} & ComponentProps<"div">;

/**
 * Tarjeta de tarea: identificador, prioridad, título, disciplina, vínculo al
 * GDD, responsable, fecha límite, subtareas, etiquetas y horas. Presentacional:
 * el arrastre y el menú contextual los añade SortableTaskCard.
 */
export function TaskCard({ task, projectKey, gdd, assignee, blockedBy = 0, overlay, className, ...props }: TaskCardProps) {
  const category = useCategory(task.category);
  const estimate = task.estimatedHours;
  const logged = task.loggedHours;
  const overrun = estimate !== null && logged > estimate;
  const ratio = estimate ? Math.min(logged / estimate, 1) : 0;
  const isDone = task.status === "DONE";
  const due = describeDue(task);
  const subtasksDone = task.subtasks.filter((subtask) => subtask.done).length;
  const hasMeta = due || task.subtasks.length > 0 || task.tags.length > 0;

  return (
    <div
      className={cn(
        "group/card relative flex flex-col gap-2.5 rounded-lg border bg-card p-3 text-left",
        "shadow-[0_1px_2px_rgb(0_0_0/0.25)] transition-[border-color,background-color] duration-150",
        "hover:border-white/14 hover:bg-[color-mix(in_oklab,var(--card),white_2%)]",
        overlay && "cursor-grabbing border-white/16 shadow-xl shadow-black/50 ring-1 ring-primary/25",
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] text-muted-foreground">{formatTaskId(projectKey, task.number)}</span>
        {blockedBy > 0 && !isDone && (
          <span
            className="flex items-center gap-1 rounded-sm bg-warning/12 px-1 text-[10px] font-medium text-warning"
            title={`Bloqueada por ${blockedBy} ${blockedBy === 1 ? "tarea abierta" : "tareas abiertas"}`}
          >
            <Link2 className="size-3" aria-hidden />
            Bloqueada
          </span>
        )}
        {(estimate !== null || logged > 0) && (
          <span
            className={cn(
              "ml-auto flex shrink-0 items-center gap-1 font-mono text-[11px] tabular-nums",
              overrun ? "text-warning" : "text-muted-foreground",
            )}
            title={
              overrun
                ? `Excede la estimación en ${formatHours(logged - estimate!)} h`
                : `${formatHours(logged)} h registradas de ${estimate === null ? "—" : formatHours(estimate)} h estimadas`
            }
          >
            <Clock className="size-3" aria-hidden />
            {logged > 0 && estimate !== null
              ? `${formatHours(logged)}/${formatHours(estimate)}h`
              : estimate !== null
                ? `${formatHours(estimate)}h`
                : `${formatHours(logged)}h`}
          </span>
        )}
        <span
          className={cn(estimate === null && logged === 0 && "ml-auto")}
          title={`Prioridad ${PRIORITY_META[task.priority].label.toLowerCase()}`}
        >
          <PriorityIcon priority={task.priority} />
        </span>
      </div>

      <p
        className={cn(
          "line-clamp-3 text-[13px] leading-snug font-medium text-pretty",
          isDone ? "text-muted-foreground" : "text-foreground/95",
        )}
      >
        {task.title}
      </p>

      <div className="flex min-w-0 items-center gap-1.5">
        <CategoryBadge category={category} className="max-w-[60%]" />
        {gdd && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex h-5 min-w-0 items-center gap-1 rounded-md border border-dashed border-white/12 px-1.5 text-[11px] text-muted-foreground">
                <BookText className="size-3 shrink-0" aria-hidden />
                <span className="truncate">{gdd.title}</span>
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              GDD § {gdd.number} · {[...gdd.path, gdd.title].join(" › ")}
            </TooltipContent>
          </Tooltip>
        )}
        {assignee && (
          <MemberAvatar
            size="sm"
            className="ml-auto"
            name={assignee.name}
            email={assignee.email}
            photoURL={assignee.photoURL}
            title={`Responsable: ${assignee === FORMER_MEMBER ? "antiguo miembro" : memberDisplayName(assignee)}`}
          />
        )}
      </div>

      {hasMeta && (
        <div className="-mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted-foreground">
          {due && (
            <span
              className={cn(
                "flex items-center gap-1 tabular-nums",
                due.tone === "overdue" && "text-warning",
                due.tone === "soon" && "text-foreground/85",
              )}
              title={due.tone === "overdue" ? `Vencida (${due.long})` : `Fecha límite: ${due.long}`}
            >
              <CalendarDays className="size-3" aria-hidden />
              {due.label}
            </span>
          )}
          {task.subtasks.length > 0 && (
            <span
              className={cn("flex items-center gap-1 tabular-nums", subtasksDone === task.subtasks.length && "text-foreground/70")}
              title={`${subtasksDone} de ${task.subtasks.length} subtareas hechas`}
            >
              <ListChecks className="size-3" aria-hidden />
              {subtasksDone}/{task.subtasks.length}
            </span>
          )}
          {task.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="max-w-24 truncate">
              #{tag}
            </span>
          ))}
          {task.tags.length > 3 && <span>+{task.tags.length - 3}</span>}
        </div>
      )}

      {estimate !== null && logged > 0 && (
        <div className="-mt-1 h-0.5 overflow-hidden rounded-full bg-white/6" aria-hidden>
          <div
            className={cn("h-full rounded-full", overrun ? "bg-warning" : isDone ? "bg-primary" : "bg-foreground/40")}
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
