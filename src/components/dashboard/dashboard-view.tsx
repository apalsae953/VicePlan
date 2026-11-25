"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarClock,
  CircleCheck,
  FolderPlus,
  History,
  KeyRound,
  LogOut,
  Mail,
  CloudUpload,
  SquareKanban,
  TriangleAlert,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";

import { ActivityItem } from "@/components/activity/activity-item";
import { GuestSignOutDialog, SaveAccountDialog } from "@/components/auth/account-dialogs";
import { AccountSettingsDialog } from "@/components/auth/account-settings-dialog";
import { LegalLinks } from "@/components/legal/legal-links";
import { displayNameOf, useAuth, useCurrentUser } from "@/components/auth/auth-provider";
import { useProjects } from "@/components/auth/projects-provider";
import { ProjectAvatar } from "@/components/layout/project-avatar";
import { MemberAvatar } from "@/components/members/member-avatar";
import { UserAvatar } from "@/components/members/user-avatar";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { JoinProjectDialog } from "@/components/projects/join-project";
import { CategoryIcon, PriorityIcon, StatusIcon } from "@/components/tasks/task-icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyDashboard, type DashboardTask } from "@/hooks/use-my-dashboard";
import { addDays, describeDue, formatTaskId, todayDateOnly } from "@/lib/board";
import { findCategory, PRIORITY_META } from "@/lib/constants";
import { getLastProjectId } from "@/lib/preferences";
import type { MemberProfile, ProjectSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * "Mi panel" (como el dashboard personal de HacknPlan): mis tareas de todos
 * los proyectos ordenadas por urgencia, invitaciones, proyectos y actividad
 * reciente del equipo, todo en tiempo real.
 */
export function DashboardView({ projects }: { projects: ProjectSummary[] }) {
  const user = useCurrentUser();
  const { invitations, accept, decline } = useProjects();
  const { loaded, tasks, events } = useMyDashboard(user.uid, projects);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const byId = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const lastProject = byId.get(getLastProjectId() ?? "") ?? projects[0];

  const open = tasks.filter((task) => task.status !== "DONE");
  const today = todayDateOnly();
  const weekEnd = addDays(today, 7);
  const groups: { id: string; title: string; icon: ReactNode; tasks: DashboardTask[] }[] = [
    {
      id: "overdue",
      title: "Vencidas",
      icon: <TriangleAlert className="size-3.5 text-warning" aria-hidden />,
      tasks: open.filter((task) => task.dueDate && task.dueDate < today),
    },
    {
      id: "week",
      title: "Vencen esta semana",
      icon: <CalendarClock className="size-3.5" aria-hidden />,
      tasks: open.filter((task) => task.dueDate && task.dueDate >= today && task.dueDate <= weekEnd),
    },
    {
      id: "progress",
      title: "En curso",
      icon: <StatusIcon status="IN_PROGRESS" />,
      tasks: open.filter(
        (task) => (!task.dueDate || task.dueDate > weekEnd) && (task.status === "IN_PROGRESS" || task.status === "TESTING"),
      ),
    },
    {
      id: "todo",
      title: "Por hacer",
      icon: <StatusIcon status="TODO" />,
      tasks: open.filter((task) => (!task.dueDate || task.dueDate > weekEnd) && task.status === "TODO"),
    },
  ].map((group) => ({ ...group, tasks: group.tasks.sort(byUrgency) }));
  const overdue = groups[0].tasks.length;
  const doneThisWeek = tasks.filter(
    (task) => task.status === "DONE" && task.completedAt && task.completedAt.slice(0, 10) >= addDays(today, -7),
  ).length;

  return (
    <div className="flex min-h-svh flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <span className="flex size-6 items-center justify-center rounded-md border bg-card">
          <SquareKanban className="size-3.5 text-primary" aria-hidden />
        </span>
        <span className="text-[13px] font-medium">VicePlan</span>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-[13px] text-muted-foreground">Mi panel</span>
        <div className="ml-auto flex items-center gap-1.5">
          <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" onClick={() => setJoinOpen(true)}>
            <KeyRound /> <span className="hidden sm:inline">Unirme con código</span>
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <FolderPlus /> <span className="hidden sm:inline">Nuevo proyecto</span>
          </Button>
          <AccountMenu />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-base font-medium">{greeting(displayNameOf(user))}</h1>
            <p className="text-[13px] text-muted-foreground" suppressHydrationWarning>
              {loaded
                ? `${open.length} ${open.length === 1 ? "tarea abierta" : "tareas abiertas"} a tu nombre` +
                  (overdue > 0 ? ` · ${overdue} ${overdue === 1 ? "vencida" : "vencidas"}` : "") +
                  (doneThisWeek > 0
                    ? ` · ${doneThisWeek} ${doneThisWeek === 1 ? "cerrada" : "cerradas"} esta semana`
                    : "")
                : "Cargando tus tareas…"}
            </p>
          </div>
          {lastProject && (
            <Button asChild size="sm" className="gap-1.5">
              <Link href={`/projects/${lastProject.id}/board`}>
                Continuar en {lastProject.name} <ArrowRight />
              </Link>
            </Button>
          )}
        </div>

        {invitations.length > 0 && (
          <section className="mb-8 grid gap-2">
            <h2 className="text-xs font-medium text-muted-foreground">Te han invitado</h2>
            {invitations.map((invitation) => (
              <div key={invitation.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                <Mail className="size-4 shrink-0 text-primary" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-sm">{invitation.name}</span>
                <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => void decline(invitation)}>
                  Rechazar
                </Button>
                <Button size="sm" onClick={() => void accept(invitation)}>
                  Unirme
                </Button>
              </div>
            ))}
          </section>
        )}

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section aria-labelledby="my-tasks" className="min-w-0 space-y-6">
            <h2 id="my-tasks" className="text-[13px] font-medium">
              Mis tareas
            </h2>
            {!loaded ? (
              <div className="space-y-2" aria-busy>
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : open.length === 0 ? (
              <div className="flex items-center gap-3 rounded-lg border border-dashed p-5 text-[13px] text-muted-foreground">
                <CircleCheck className="size-4" aria-hidden />
                No tienes tareas abiertas asignadas. Asígnate alguna desde el tablero (tecla M para ver solo las tuyas).
              </div>
            ) : (
              groups
                .filter((group) => group.tasks.length > 0)
                .map((group) => (
                  <div key={group.id} className="space-y-1.5">
                    <h3 className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      {group.icon}
                      {group.title}
                      <span className="font-mono tabular-nums">{group.tasks.length}</span>
                    </h3>
                    <ul className="divide-y overflow-hidden rounded-lg border bg-card">
                      {group.tasks.map((task) => (
                        <TaskRow key={`${task.projectId}/${task.id}`} task={task} project={byId.get(task.projectId)} />
                      ))}
                    </ul>
                  </div>
                ))
            )}
          </section>

          <aside className="space-y-8">
            <section aria-labelledby="my-projects" className="space-y-2">
              <h2 id="my-projects" className="text-[13px] font-medium">
                Proyectos
              </h2>
              <ul className="grid gap-1.5">
                {projects.map((project) => {
                  const mine = open.filter((task) => task.projectId === project.id).length;
                  const members = Object.values(project.members);
                  return (
                    <li key={project.id}>
                      <Link
                        href={`/projects/${project.id}/board`}
                        className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 transition-colors duration-150 hover:border-white/15 hover:bg-accent/40"
                      >
                        <ProjectAvatar
                          projectKey={project.key}
                          projectId={project.id}
                          logo={project.logo}
                          className="size-8 rounded-lg text-sm"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium">{project.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {mine > 0 ? `${mine} ${mine === 1 ? "tarea tuya" : "tareas tuyas"}` : "Sin tareas tuyas"}
                          </span>
                        </span>
                        <span className="flex -space-x-1.5">
                          {members.slice(0, 3).map((member, i) => (
                            <MemberAvatar
                              key={i}
                              size="sm"
                              name={member.name}
                              email={member.email}
                              photoURL={member.photoURL}
                              className="ring-2 ring-card"
                            />
                          ))}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section aria-labelledby="activity" className="space-y-2">
              <h2 id="activity" className="flex items-center gap-2 text-[13px] font-medium">
                <History className="size-3.5 text-muted-foreground" aria-hidden /> Actividad reciente
              </h2>
              {events.length === 0 ? (
                <p className="text-xs text-muted-foreground">Todavía no hay actividad.</p>
              ) : (
                <ul>
                  {events.map((event) => {
                    const project = byId.get(event.projectId);
                    return (
                      <ActivityItem
                        key={`${event.projectId}/${event.id}`}
                        event={event}
                        members={project?.members ?? EMPTY_MEMBERS}
                        projectKey={project?.key ?? "?"}
                      />
                    );
                  })}
                </ul>
              )}
            </section>
          </aside>
        </div>
      </main>
      <footer className="mx-auto flex w-full max-w-6xl justify-end px-4 pb-6 sm:px-6">
        <LegalLinks />
      </footer>

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
      <JoinProjectDialog open={joinOpen} onOpenChange={setJoinOpen} />
    </div>
  );
}

const EMPTY_MEMBERS: Record<string, MemberProfile> = {};

const PRIORITY_RANK: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

/** Vencimiento más próximo primero; luego prioridad. */
function byUrgency(a: DashboardTask, b: DashboardTask) {
  return (
    (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") ||
    PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
    b.updatedAt.localeCompare(a.updatedAt)
  );
}

function greeting(name: string) {
  const hour = new Date().getHours();
  const hello = hour < 6 ? "Buenas noches" : hour < 14 ? "Buenos días" : hour < 21 ? "Buenas tardes" : "Buenas noches";
  return `${hello}, ${name.split(" ")[0]}`;
}

function TaskRow({ task, project }: { task: DashboardTask; project?: ProjectSummary }) {
  const router = useRouter();
  const due = describeDue(task);
  const category = findCategory(project?.categories ?? [], task.category);
  return (
    <li>
      <button
        type="button"
        onClick={() => router.push(`/projects/${task.projectId}/board?tarea=${task.id}`)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:outline-none"
      >
        <StatusIcon status={task.status} />
        <span className="w-16 shrink-0 font-mono text-[11px] text-muted-foreground">
          {formatTaskId(project?.key ?? "?", task.number)}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px]">{task.title}</span>
        <CategoryIcon category={category} className="hidden sm:block" />
        {due && (
          <span
            className={cn(
              "w-14 shrink-0 text-right text-xs tabular-nums",
              due.tone === "overdue" ? "text-warning" : due.tone === "soon" ? "text-foreground/85" : "text-muted-foreground",
            )}
          >
            {due.label}
          </span>
        )}
        <span title={`Prioridad ${PRIORITY_META[task.priority].label.toLowerCase()}`}>
          <PriorityIcon priority={task.priority} />
        </span>
      </button>
    </li>
  );
}

/** Menú de cuenta del panel (fuera de un proyecto no hay barra lateral). */
function AccountMenu() {
  const user = useCurrentUser();
  const { signOut, isGuest } = useAuth();
  const [saveOpen, setSaveOpen] = useState(false);
  const [guestSignOut, setGuestSignOut] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Tu cuenta"
            className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <UserAvatar size="md" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="font-normal">
            <p className="truncate text-[13px] text-foreground">{displayNameOf(user)}</p>
            <p className="truncate text-xs text-muted-foreground">
              {isGuest ? "Invitado · los datos viven en este navegador" : user.email}
            </p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setAccountOpen(true)}>
            <UserCog /> Mi cuenta
          </DropdownMenuItem>
          {isGuest && (
            <DropdownMenuItem onSelect={() => setSaveOpen(true)}>
              <CloudUpload /> Guardar cuenta
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onSelect={() => {
              if (isGuest) setGuestSignOut(true);
              else void signOut().catch(() => toast.error("No se pudo cerrar la sesión."));
            }}
          >
            <LogOut /> Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {isGuest && <SaveAccountDialog open={saveOpen} onOpenChange={setSaveOpen} />}
      <AccountSettingsDialog open={accountOpen} onOpenChange={setAccountOpen} onSaveAccount={() => setSaveOpen(true)} />
      <GuestSignOutDialog open={guestSignOut} onOpenChange={setGuestSignOut} onSaveAccount={() => setSaveOpen(true)} />
    </>
  );
}

/** Esqueleto de "Mi panel" mientras llegan los proyectos. */
export function DashboardSkeleton() {
  return (
    <div className="flex min-h-svh flex-1 flex-col" aria-busy aria-label="Cargando tu panel">
      <div className="flex h-12 items-center gap-2 border-b px-4">
        <Skeleton className="size-6 rounded-md" />
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="ml-auto h-7 w-32" />
        <Skeleton className="size-6 rounded-full" />
      </div>
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-3.5 w-80" />
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
