"use client";

import { useMemo, type ReactNode } from "react";
import { Check, UserPlus, Users } from "lucide-react";

import { useCurrentUser } from "@/components/auth/auth-provider";
import { MemberAvatar } from "@/components/members/member-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UNASSIGNED } from "@/lib/board";
import { memberDisplayName } from "@/lib/firestore/mappers";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspace-store-provider";

/**
 * Filtro rápido por responsable: todos, mis tareas, sin asignar o un
 * compañero. Los contadores son del milestone visible.
 */
export function AssigneeFilter({ className }: { className?: string }) {
  const user = useCurrentUser();
  const members = useWorkspaceStore((s) => s.project.members);
  const tasks = useWorkspaceStore((s) => s.tasks);
  const milestoneId = useWorkspaceStore((s) => s.milestoneId);
  const value = useWorkspaceStore((s) => s.assigneeFilter);
  const setValue = useWorkspaceStore((s) => s.setAssigneeFilter);
  const openProjectSettings = useWorkspaceStore((s) => s.openProjectSettings);

  const counts = useMemo(() => {
    const result = new Map<string, number>();
    for (const task of Object.values(tasks)) {
      if (task.milestoneId !== milestoneId) continue;
      const key = task.assigneeId ?? UNASSIGNED;
      result.set(key, (result.get(key) ?? 0) + 1);
    }
    return result;
  }, [tasks, milestoneId]);

  const ordered = useMemo(
    () => [...members].sort((a, b) => Number(b.uid === user.uid) - Number(a.uid === user.uid)),
    [members, user.uid],
  );
  const selected = value && value !== UNASSIGNED ? members.find((member) => member.uid === value) : undefined;
  const label =
    value === null
      ? "Todos"
      : value === UNASSIGNED
        ? "Sin asignar"
        : value === user.uid
          ? "Mis tareas"
          : memberDisplayName(selected).split(" ")[0];

  const option = (optionValue: string | null, content: ReactNode, count?: number, shortcut?: string) => (
    <DropdownMenuItem key={optionValue ?? "all"} onSelect={() => setValue(optionValue)} className="gap-2">
      <Check className={cn("size-3.5", value === optionValue ? "opacity-100" : "opacity-0")} aria-hidden />
      {content}
      {shortcut ? (
        <DropdownMenuShortcut>{shortcut}</DropdownMenuShortcut>
      ) : (
        count !== undefined && (
          <span className="ml-auto font-mono text-[11px] text-muted-foreground tabular-nums">{count}</span>
        )
      )}
    </DropdownMenuItem>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Filtrar por responsable: ${label}`}
          className={cn("gap-1.5 px-2 text-muted-foreground", value !== null && "bg-accent/60 text-foreground", className)}
        >
          {value === null ? (
            <Facepile members={ordered} />
          ) : value === UNASSIGNED ? (
            <MemberAvatar size="sm" />
          ) : (
            <MemberAvatar size="sm" name={selected?.name} email={selected?.email} photoURL={selected?.photoURL} />
          )}
          <span className="hidden max-w-24 truncate md:inline">{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Responsable</DropdownMenuLabel>
        {option(
          null,
          <>
            <Users className="size-4 text-muted-foreground" aria-hidden /> Todos
          </>,
        )}
        {option(
          user.uid,
          <>
            <MemberAvatar size="xs" name={user.displayName} email={user.email} photoURL={user.photoURL} /> Mis tareas
          </>,
          undefined,
          "M",
        )}
        {option(
          UNASSIGNED,
          <>
            <MemberAvatar size="xs" /> Sin asignar
          </>,
          counts.get(UNASSIGNED) ?? 0,
        )}
        {ordered.length > 1 && <DropdownMenuSeparator />}
        {ordered
          .filter((member) => member.uid !== user.uid)
          .map((member) =>
            option(
              member.uid,
              <>
                <MemberAvatar size="xs" name={member.name} email={member.email} photoURL={member.photoURL} />
                <span className="truncate">{memberDisplayName(member)}</span>
              </>,
              counts.get(member.uid) ?? 0,
            ),
          )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => openProjectSettings("members")}>
          <UserPlus /> Invitar al equipo…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Hasta tres avatares solapados del equipo. */
function Facepile({ members }: { members: { uid: string; name: string | null; email: string | null; photoURL: string | null }[] }) {
  if (members.length <= 1) return <Users className="size-4" aria-hidden />;
  return (
    <span className="flex -space-x-1.5" aria-hidden>
      {members.slice(0, 3).map((member) => (
        <MemberAvatar
          key={member.uid}
          size="sm"
          name={member.name}
          email={member.email}
          photoURL={member.photoURL}
          className="ring-2 ring-background"
        />
      ))}
    </span>
  );
}
