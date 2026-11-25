"use client";

import type { ReactNode } from "react";

import { MemberAvatar } from "@/components/members/member-avatar";
import { formatHours, formatRelative, formatTaskId } from "@/lib/board";
import { STATUS_META } from "@/lib/constants";
import { isOneOf, TaskStatus } from "@/lib/domain";
import { memberDisplayName } from "@/lib/firestore/mappers";
import type { ActivityEvent, MemberProfile } from "@/lib/types";

const statusLabel = (value: unknown) => (isOneOf(TaskStatus, value) ? STATUS_META[value].label : "otro estado");

/**
 * Una línea del registro de actividad ("Ana movió AET-12 a En pruebas · hace
 * 5 min"). `showTask = false` dentro del panel de la propia tarea.
 */
export function ActivityItem({
  event,
  members,
  projectKey,
  showTask = true,
  onOpenTask,
}: {
  event: ActivityEvent;
  members: Record<string, MemberProfile>;
  projectKey: string;
  showTask?: boolean;
  onOpenTask?: (taskId: string) => void;
}) {
  const actor = members[event.actorId];
  const name = <span className="text-foreground">{actor ? memberDisplayName(actor) : "Alguien"}</span>;
  const number = typeof event.data.number === "number" ? event.data.number : null;
  const taskRef: ReactNode =
    showTask && number !== null ? (
      event.taskId && onOpenTask && event.type !== "task.deleted" ? (
        <button
          type="button"
          onClick={() => onOpenTask(event.taskId!)}
          className="font-mono text-[11px] text-foreground/85 underline-offset-2 hover:underline"
          title={typeof event.data.title === "string" ? event.data.title : undefined}
        >
          {formatTaskId(projectKey, number)}
        </button>
      ) : (
        <span className="font-mono text-[11px] text-foreground/85">{formatTaskId(projectKey, number)}</span>
      )
    ) : null;
  const target = (fallback: string) => (taskRef ? <> {taskRef}</> : ` ${fallback}`);
  const assignee = typeof event.data.to === "string" ? members[event.data.to] : undefined;

  let text: ReactNode;
  switch (event.type) {
    case "task.created":
      text = <>{name} creó{target("la tarea")}</>;
      break;
    case "task.status":
      text = (
        <>
          {name} movió{target("la tarea")} de {statusLabel(event.data.from)} a{" "}
          <span className="text-foreground">{statusLabel(event.data.to)}</span>
        </>
      );
      break;
    case "task.assigned":
      text = event.data.to ? (
        <>
          {name} asignó{target("la tarea")} a{" "}
          <span className="text-foreground">
            {event.data.to === event.actorId ? "sí mismo" : assignee ? memberDisplayName(assignee) : "otra persona"}
          </span>
        </>
      ) : (
        <>
          {name} dejó{target("la tarea")} sin responsable
        </>
      );
      break;
    case "task.milestone":
      text = event.data.to ? (
        <>
          {name} pasó{target("la tarea")} al hito <span className="text-foreground">{String(event.data.to)}</span>
        </>
      ) : (
        <>
          {name} pasó{target("la tarea")} a trabajo pendiente
        </>
      );
      break;
    case "task.deleted":
      text = <>{name} eliminó{target("la tarea")}</>;
      break;
    case "task.commented":
      text = <>{name} comentó{showTask ? <> en{target("")}</> : ""}</>;
      break;
    case "task.logged":
      text = (
        <>
          {name} registró{" "}
          <span className="font-mono text-foreground tabular-nums">
            {formatHours(typeof event.data.hours === "number" ? event.data.hours : 0)} h
          </span>
          {showTask && <> en{target("")}</>}
        </>
      );
      break;
    case "member.joined":
      text = (
        <>
          {name} se unió al proyecto{event.data.via === "code" ? " con un código" : ""}
        </>
      );
      break;
  }

  return (
    <li className="flex gap-2.5 py-1.5 text-[13px] leading-snug text-muted-foreground">
      <MemberAvatar size="sm" className="mt-px" name={actor?.name} email={actor?.email} photoURL={actor?.photoURL} />
      <p className="min-w-0 flex-1">
        {text}
        <span className="text-muted-foreground/70" suppressHydrationWarning>
          {" "}
          · {formatRelative(event.createdAt)}
        </span>
      </p>
    </li>
  );
}
