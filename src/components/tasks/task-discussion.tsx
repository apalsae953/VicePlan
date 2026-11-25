"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { History, Loader2, MessageSquare, MoreHorizontal, Pencil, Trash } from "lucide-react";
import { toast } from "sonner";

import { ActivityItem } from "@/components/activity/activity-item";
import { useCurrentUser } from "@/components/auth/auth-provider";
import { MemberAvatar } from "@/components/members/member-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatRelative } from "@/lib/board";
import { logActivity, subscribeTaskActivity } from "@/lib/firestore/activity";
import { addComment, deleteComment, editComment, MAX_COMMENT, subscribeComments } from "@/lib/firestore/comments";
import { firestoreErrorMessage } from "@/lib/firestore/errors";
import { memberDisplayName } from "@/lib/firestore/mappers";
import type { ActivityEvent, BoardTask, MemberProfile, TaskComment } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspace-store-provider";

type Tab = "comments" | "activity";

/**
 * Comentarios y actividad de una tarea, en pestañas (como el panel de
 * HacknPlan). Se cargan solo con el panel abierto, en tiempo real.
 */
export function TaskDiscussion({ task }: { task: BoardTask }) {
  const [tab, setTab] = useState<Tab>("comments");
  const members = useWorkspaceStore((s) => s.project.members);
  const profiles = useMemo(
    () => Object.fromEntries(members.map((member) => [member.uid, member as MemberProfile])),
    [members],
  );

  return (
    <section className="border-t px-4 pt-3 pb-4">
      <div role="tablist" aria-label="Conversación" className="mb-2 flex gap-1 px-1">
        {(
          [
            { value: "comments", label: "Comentarios", icon: MessageSquare },
            { value: "activity", label: "Actividad", icon: History },
          ] as const
        ).map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={tab === item.value}
            onClick={() => setTab(item.value)}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-md px-2 text-xs transition-colors duration-150",
              tab === item.value ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <item.icon className="size-3.5" aria-hidden />
            {item.label}
          </button>
        ))}
      </div>
      {tab === "comments" ? <Comments task={task} profiles={profiles} /> : <TaskActivity task={task} profiles={profiles} />}
    </section>
  );
}

function Comments({ task, profiles }: { task: BoardTask; profiles: Record<string, MemberProfile> }) {
  const user = useCurrentUser();
  const projectId = useWorkspaceStore((s) => s.project.id);
  const ownerId = useWorkspaceStore((s) => s.project.ownerId);
  const [comments, setComments] = useState<TaskComment[] | null>(null);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(
    () =>
      subscribeComments(projectId, task.id, setComments, (error) => {
        console.warn("[comentarios]", error.code);
        setComments([]);
      }),
    [projectId, task.id],
  );

  function send() {
    const body = draft.trim();
    if (!body || pending) return;
    startTransition(async () => {
      try {
        await addComment(projectId, task.id, user.uid, body);
        setDraft("");
        logActivity(projectId, user.uid, {
          type: "task.commented",
          taskId: task.id,
          data: { number: task.number, title: task.title.slice(0, 120) },
        });
      } catch (error) {
        toast.error(firestoreErrorMessage(error, "No se pudo publicar el comentario"));
      }
    });
  }

  return (
    <div className="space-y-3 px-1">
      {comments === null ? (
        <div className="space-y-2" aria-busy>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-2/3" />
        </div>
      ) : comments.length === 0 ? (
        <p className="px-1 text-xs text-muted-foreground">Todavía no hay comentarios.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => {
            const author = profiles[comment.authorId];
            const own = comment.authorId === user.uid;
            return (
              <li key={comment.id} className="group/comment flex gap-2.5">
                <MemberAvatar size="md" name={author?.name} email={author?.email} photoURL={author?.photoURL} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-xs">
                    <span className="font-medium text-foreground">{author ? memberDisplayName(author) : "Antiguo miembro"}</span>
                    <span className="text-muted-foreground" suppressHydrationWarning>
                      {formatRelative(comment.createdAt)}
                      {comment.editedAt && " · editado"}
                    </span>
                    {(own || ownerId === user.uid) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="ml-auto text-muted-foreground opacity-0 group-hover/comment:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                            aria-label="Acciones del comentario"
                          >
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          {own && (
                            <DropdownMenuItem onSelect={() => setEditing(comment.id)}>
                              <Pencil /> Editar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() =>
                              void deleteComment(projectId, task.id, comment.id).catch((error) =>
                                toast.error(firestoreErrorMessage(error, "No se pudo borrar el comentario")),
                              )
                            }
                          >
                            <Trash /> Borrar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </p>
                  {editing === comment.id ? (
                    <EditComment
                      initial={comment.body}
                      onCancel={() => setEditing(null)}
                      onSave={async (body) => {
                        try {
                          await editComment(projectId, task.id, comment.id, body);
                          setEditing(null);
                        } catch (error) {
                          toast.error(firestoreErrorMessage(error, "No se pudo editar el comentario"));
                        }
                      }}
                    />
                  ) : (
                    <p className="mt-0.5 text-[13px] leading-relaxed whitespace-pre-wrap text-foreground/90">{comment.body}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
        className="rounded-lg border bg-card/40 focus-within:border-white/14"
      >
        <Textarea
          value={draft}
          maxLength={MAX_COMMENT}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              send();
            }
          }}
          placeholder="Escribe un comentario…"
          aria-label="Nuevo comentario"
          rows={2}
          className="min-h-16 resize-none border-none bg-transparent text-[13px] shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
        <div className="flex items-center justify-end gap-2 px-2 pb-2">
          <span className="mr-auto hidden items-center gap-1 text-[11px] text-muted-foreground sm:flex">
            <KbdGroup>
              <Kbd>Ctrl</Kbd>
              <Kbd>Enter</Kbd>
            </KbdGroup>
            para enviar
          </span>
          <Button type="submit" size="xs" disabled={!draft.trim() || pending}>
            {pending && <Loader2 className="animate-spin" />}
            Comentar
          </Button>
        </div>
      </form>
    </div>
  );
}

function EditComment({
  initial,
  onCancel,
  onSave,
}: {
  initial: string;
  onCancel: () => void;
  onSave: (body: string) => Promise<void>;
}) {
  const [body, setBody] = useState(initial);
  const [pending, startTransition] = useTransition();
  return (
    <div className="mt-1 space-y-1.5">
      <Textarea
        autoFocus
        value={body}
        maxLength={MAX_COMMENT}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") onCancel();
          if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) startTransition(() => onSave(body));
        }}
        className="min-h-16 text-[13px]"
        aria-label="Editar comentario"
      />
      <div className="flex justify-end gap-1.5">
        <Button type="button" size="xs" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" size="xs" disabled={!body.trim() || pending} onClick={() => startTransition(() => onSave(body))}>
          Guardar
        </Button>
      </div>
    </div>
  );
}

function TaskActivity({ task, profiles }: { task: BoardTask; profiles: Record<string, MemberProfile> }) {
  const projectId = useWorkspaceStore((s) => s.project.id);
  const projectKey = useWorkspaceStore((s) => s.project.key);
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);

  useEffect(
    () =>
      subscribeTaskActivity(projectId, task.id, setEvents, (error) => {
        console.warn("[actividad]", error.code);
        setEvents([]);
      }),
    [projectId, task.id],
  );

  if (events === null) {
    return (
      <div className="space-y-2 px-1" aria-busy>
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/4" />
      </div>
    );
  }
  return (
    <ul className="px-1">
      {events.map((event) => (
        <ActivityItem key={event.id} event={event} members={profiles} projectKey={projectKey} showTask={false} />
      ))}
      <li className="flex gap-2.5 py-1.5 text-[13px] text-muted-foreground">
        <span className="ml-1 size-3 shrink-0 rounded-full border" aria-hidden />
        <span suppressHydrationWarning>Creada {formatRelative(task.createdAt)}</span>
      </li>
    </ul>
  );
}
