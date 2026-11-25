"use client";

import type { ReactNode } from "react";
import { CalendarDays, Check, Clock, Copy, CopyPlus, Inbox, PanelRightOpen, Trash, UserRound } from "lucide-react";
import { toast } from "sonner";

import { useCurrentUser } from "@/components/auth/auth-provider";
import { MemberAvatar } from "@/components/members/member-avatar";
import { UserAvatar } from "@/components/members/user-avatar";
import { MilestoneStatusIcon, PriorityIcon, StatusIcon } from "@/components/tasks/task-icons";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useTaskActions } from "@/hooks/use-task-actions";
import { addDays, formatTaskId, todayDateOnly } from "@/lib/board";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/constants";
import { memberDisplayName } from "@/lib/firestore/mappers";
import { useWorkspaceStore } from "@/stores/workspace-store-provider";

/**
 * Menú contextual de una tarjeta (clic derecho, o pulsación larga sin mover en
 * táctil), como el de HacknPlan: cambios rápidos sin abrir el panel.
 */
export function TaskContextMenu({
  taskId,
  disabled,
  children,
}: {
  taskId: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild disabled={disabled}>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {/* Solo se monta al abrir: las tarjetas cerradas no se suscriben a nada más. */}
        <TaskMenuItems taskId={taskId} />
      </ContextMenuContent>
    </ContextMenu>
  );
}

const QUICK_HOURS = [0.5, 1, 2, 4];

function TaskMenuItems({ taskId }: { taskId: string }) {
  const user = useCurrentUser();
  const task = useWorkspaceStore((s) => s.tasks[taskId]);
  const projectKey = useWorkspaceStore((s) => s.project.key);
  const members = useWorkspaceStore((s) => s.project.members);
  const milestones = useWorkspaceStore((s) => s.milestones);
  const openTask = useWorkspaceStore((s) => s.openTask);
  const { update, duplicate, logHours, remove } = useTaskActions();
  if (!task) return null;

  const today = todayDateOnly();
  const id = formatTaskId(projectKey, task.number);
  const tick = (active: boolean) => <Check className={active ? "ml-auto" : "ml-auto opacity-0"} aria-hidden />;

  return (
    <>
      <ContextMenuLabel className="truncate font-mono">{id}</ContextMenuLabel>
      <ContextMenuItem onSelect={() => openTask(taskId)}>
        <PanelRightOpen /> Abrir
        <ContextMenuShortcut>Enter</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuSeparator />

      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <StatusIcon status={task.status} /> Estado
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          {TASK_STATUSES.map((status) => (
            <ContextMenuItem key={status.value} onSelect={() => void update(taskId, { status: status.value })}>
              <StatusIcon status={status.value} /> {status.label}
              {tick(task.status === status.value)}
            </ContextMenuItem>
          ))}
        </ContextMenuSubContent>
      </ContextMenuSub>

      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <PriorityIcon priority={task.priority} /> Prioridad
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          {TASK_PRIORITIES.map((priority) => (
            <ContextMenuItem key={priority.value} onSelect={() => void update(taskId, { priority: priority.value })}>
              <PriorityIcon priority={priority.value} /> {priority.label}
              {tick(task.priority === priority.value)}
            </ContextMenuItem>
          ))}
        </ContextMenuSubContent>
      </ContextMenuSub>

      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <UserRound /> Responsable
        </ContextMenuSubTrigger>
        <ContextMenuSubContent className="w-56">
          <ContextMenuItem onSelect={() => void update(taskId, { assigneeId: user.uid })}>
            <UserAvatar size="xs" /> Asignarme
            {tick(task.assigneeId === user.uid)}
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => void update(taskId, { assigneeId: null })}>
            <MemberAvatar size="xs" /> Sin asignar
            {tick(task.assigneeId === null)}
          </ContextMenuItem>
          {members.length > 1 && <ContextMenuSeparator />}
          {members
            .filter((member) => member.uid !== user.uid)
            .map((member) => (
              <ContextMenuItem key={member.uid} onSelect={() => void update(taskId, { assigneeId: member.uid })}>
                <MemberAvatar size="xs" name={member.name} email={member.email} photoURL={member.photoURL} />
                <span className="truncate">{memberDisplayName(member)}</span>
                {tick(task.assigneeId === member.uid)}
              </ContextMenuItem>
            ))}
        </ContextMenuSubContent>
      </ContextMenuSub>

      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <Inbox /> Hito
        </ContextMenuSubTrigger>
        <ContextMenuSubContent className="w-56">
          {milestones.map((milestone) => (
            <ContextMenuItem key={milestone.id} onSelect={() => void update(taskId, { milestoneId: milestone.id })}>
              <MilestoneStatusIcon status={milestone.status} />
              <span className="truncate">{milestone.title}</span>
              {tick(task.milestoneId === milestone.id)}
            </ContextMenuItem>
          ))}
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={() => void update(taskId, { milestoneId: null })}>
            <Inbox /> Trabajo pendiente
            {tick(task.milestoneId === null)}
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>

      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <CalendarDays /> Fecha límite
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          <ContextMenuItem onSelect={() => void update(taskId, { dueDate: today })}>Hoy</ContextMenuItem>
          <ContextMenuItem onSelect={() => void update(taskId, { dueDate: addDays(today, 1) })}>Mañana</ContextMenuItem>
          <ContextMenuItem onSelect={() => void update(taskId, { dueDate: addDays(today, 7) })}>En una semana</ContextMenuItem>
          <ContextMenuItem onSelect={() => void update(taskId, { dueDate: addDays(today, 14) })}>En dos semanas</ContextMenuItem>
          {task.dueDate && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onSelect={() => void update(taskId, { dueDate: null })}>Quitar fecha</ContextMenuItem>
            </>
          )}
        </ContextMenuSubContent>
      </ContextMenuSub>

      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <Clock /> Registrar horas
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          {QUICK_HOURS.map((hours) => (
            <ContextMenuItem key={hours} onSelect={() => void logHours(taskId, hours)} className="font-mono tabular-nums">
              +{String(hours).replace(".", ",")} h
            </ContextMenuItem>
          ))}
        </ContextMenuSubContent>
      </ContextMenuSub>

      <ContextMenuSeparator />
      <ContextMenuItem onSelect={() => void duplicate(taskId)}>
        <CopyPlus /> Duplicar
      </ContextMenuItem>
      <ContextMenuItem
        onSelect={() =>
          void navigator.clipboard
            ?.writeText(id)
            .then(() => toast(`${id} copiado`))
            .catch(() => toast.error("No se pudo copiar"))
        }
      >
        <Copy /> Copiar identificador
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem variant="destructive" onSelect={() => void remove(taskId)}>
        <Trash /> Eliminar
      </ContextMenuItem>
    </>
  );
}
