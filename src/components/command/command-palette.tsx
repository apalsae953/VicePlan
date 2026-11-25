"use client";

import { useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BookText,
  ChartColumn,
  FilePlus2,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Milestone,
  Plus,
  Settings2,
  Shapes,
  SquareKanban,
  SquarePen,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";

import { useCurrentUser } from "@/components/auth/auth-provider";
import { useProjects } from "@/components/auth/projects-provider";
import { ProjectAvatar } from "@/components/layout/project-avatar";
import { MilestoneStatusIcon, StatusIcon } from "@/components/tasks/task-icons";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
  Command,
} from "@/components/ui/command";
import { useGddActions } from "@/hooks/use-gdd-actions";
import { useHotkey } from "@/hooks/use-hotkey";
import { useTaskActions } from "@/hooks/use-task-actions";
import { flattenGddTree, formatTaskId, UNASSIGNED } from "@/lib/board";
import { useWorkspaceStore } from "@/stores/workspace-store-provider";

const VIEWS = [
  { segment: "board", label: "Tablero", icon: SquareKanban, keywords: ["kanban", "tablero", "tareas"] },
  { segment: "gdd", label: "Documento de diseño", icon: BookText, keywords: ["gdd", "documento", "diseño"] },
  { segment: "milestones", label: "Hitos", icon: Milestone, keywords: ["hitos", "backlog"] },
  { segment: "metrics", label: "Métricas", icon: ChartColumn, keywords: ["estadísticas", "horas", "gráficos"] },
] as const;

/** Resultados de búsqueda que se pintan como máximo por grupo (la paleta sigue siendo instantánea). */
const MAX_RESULTS = 12;

/**
 * Paleta de comandos global (Ctrl/⌘ + K): acciones, navegación entre vistas,
 * milestone activo, proyectos y búsqueda de tareas y páginas del GDD.
 */
export function CommandPalette() {
  const open = useWorkspaceStore((s) => s.paletteOpen);
  const setOpen = useWorkspaceStore((s) => s.setPaletteOpen);

  useHotkey(
    "k",
    (event) => {
      event.preventDefault();
      setOpen(!open);
    },
    { mod: true, allowInInputs: true },
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      {/* Se monta al abrir: cada apertura empieza con la búsqueda vacía. */}
      {open && <PaletteContent onClose={() => setOpen(false)} />}
    </CommandDialog>
  );
}

function PaletteContent({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useCurrentUser();
  const { projects } = useProjects();
  const project = useWorkspaceStore((s) => s.project);
  const tasks = useWorkspaceStore((s) => s.tasks);
  const milestones = useWorkspaceStore((s) => s.milestones);
  const gddNodes = useWorkspaceStore((s) => s.gddNodes);
  const categories = useWorkspaceStore((s) => s.project.categories);
  const milestoneId = useWorkspaceStore((s) => s.milestoneId);
  const assigneeFilter = useWorkspaceStore((s) => s.assigneeFilter);
  const setMilestone = useWorkspaceStore((s) => s.setMilestone);
  const setAssigneeFilter = useWorkspaceStore((s) => s.setAssigneeFilter);
  const openTask = useWorkspaceStore((s) => s.openTask);
  const openCreate = useWorkspaceStore((s) => s.openCreate);
  const openProjectSettings = useWorkspaceStore((s) => s.openProjectSettings);
  const setJoinOpen = useWorkspaceStore((s) => s.setJoinOpen);
  const taskActions = useTaskActions();
  const gddActions = useGddActions();
  const [search, setSearch] = useState("");
  const query = search.trim();
  const base = `/projects/${project.id}`;

  const milestoneTitles = useMemo(() => new Map(milestones.map((m) => [m.id, m.title])), [milestones]);
  const pages = useMemo(() => flattenGddTree(gddNodes), [gddNodes]);
  const taskList = useMemo(
    () => Object.values(tasks).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [tasks],
  );

  // Coincidencias simples (id, título, sección): cmdk ordena y resalta sobre este subconjunto.
  const needle = query.toLowerCase();
  const matchingTasks = useMemo(() => {
    if (!needle) return [];
    return taskList
      .filter(
        (task) =>
          formatTaskId(project.key, task.number).toLowerCase().includes(needle) ||
          task.title.toLowerCase().includes(needle) ||
          String(task.number) === needle,
      )
      .slice(0, MAX_RESULTS);
  }, [taskList, needle, project.key]);
  const matchingPages = useMemo(() => {
    if (!needle) return [];
    return pages
      .filter((page) => page.title.toLowerCase().includes(needle) || page.number.startsWith(needle))
      .slice(0, MAX_RESULTS);
  }, [pages, needle]);

  function run(action: () => void) {
    onClose();
    action();
  }

  function goToBoard() {
    if (!pathname.startsWith(`${base}/board`)) router.push(`${base}/board`);
  }

  async function quickCreate() {
    const title = query;
    onClose();
    const created = await taskActions.create({
      title,
      description: null,
      status: "TODO",
      category: categories[0]?.id ?? "PROGRAMMING",
      priority: "MEDIUM",
      estimatedHours: null,
      loggedHours: 0,
      milestoneId,
      gddNodeId: null,
      assigneeId: assigneeFilter && assigneeFilter !== UNASSIGNED ? assigneeFilter : null,
      startDate: null,
      dueDate: null,
      tags: [],
      subtasks: [],
      blockedBy: [],
    });
    if (created) openTask(created.id);
  }

  async function newPage() {
    onClose();
    const node = await gddActions.create(null);
    router.push(`${base}/gdd/${node.id}`);
  }

  const mine = assigneeFilter === user.uid;

  return (
    <Command
      // El filtro de cmdk puntúa y ordena; las tareas y páginas ya llegan acotadas.
      loop
      className="rounded-none"
    >
      <CommandInput
        value={search}
        onValueChange={setSearch}
        placeholder="Busca tareas o páginas del GDD, o escribe un comando…"
      />
      <CommandList>
        <CommandEmpty>Sin coincidencias en tareas, páginas ni comandos.</CommandEmpty>

        {matchingTasks.length > 0 && (
          <CommandGroup heading="Tareas">
            {matchingTasks.map((task) => {
              const id = formatTaskId(project.key, task.number);
              return (
                <CommandItem
                  key={task.id}
                  value={`tarea ${id} ${task.title}`}
                  onSelect={() => run(() => openTask(task.id))}
                >
                  <StatusIcon status={task.status} />
                  <span className="w-14 shrink-0 font-mono text-[11px] text-muted-foreground">{id}</span>
                  <span className="truncate">{task.title}</span>
                  <span className="ml-auto max-w-32 shrink-0 truncate pl-2 text-xs text-muted-foreground">
                    {task.milestoneId ? milestoneTitles.get(task.milestoneId) : "Trabajo pendiente"}
                  </span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {matchingPages.length > 0 && (
          <CommandGroup heading="Documento de diseño">
            {matchingPages.map((page) => (
              <CommandItem
                key={page.id}
                value={`pagina ${page.number} ${page.title} ${page.path.join(" ")}`}
                onSelect={() => run(() => router.push(`${base}/gdd/${page.id}`))}
              >
                <BookText />
                <span className="w-10 shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">{page.number}</span>
                <span className="truncate">{page.title}</span>
                {page.path.length > 0 && (
                  <span className="ml-auto max-w-40 shrink-0 truncate pl-2 text-xs text-muted-foreground">
                    {page.path.join(" › ")}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandGroup heading="Acciones">
          <PaletteItem
            value="nueva tarea crear"
            icon={<SquarePen />}
            shortcut="C"
            onSelect={() => run(() => openCreate({ milestoneId }))}
          >
            Nueva tarea…
          </PaletteItem>
          <PaletteItem value="nueva pagina gdd documento" icon={<FilePlus2 />} onSelect={() => void newPage()}>
            Nueva página del GDD
          </PaletteItem>
          <PaletteItem
            value={mine ? "ver todas las tareas filtro" : "mis tareas filtro asignadas"}
            icon={mine ? <Users /> : <UserRound />}
            shortcut="M"
            onSelect={() =>
              run(() => {
                setAssigneeFilter(mine ? null : user.uid);
                goToBoard();
              })
            }
          >
            {mine ? "Ver las tareas de todos" : "Ver solo mis tareas"}
          </PaletteItem>
          <PaletteItem
            value="invitar equipo miembros colaboradores"
            icon={<UserPlus />}
            onSelect={() => run(() => openProjectSettings("members"))}
          >
            Invitar al equipo…
          </PaletteItem>
          <PaletteItem
            value="configuracion proyecto ajustes"
            icon={<Settings2 />}
            onSelect={() => run(() => openProjectSettings("general"))}
          >
            Configuración del proyecto
          </PaletteItem>
          <PaletteItem value="categorias disciplinas gestionar" icon={<Shapes />} onSelect={() => run(() => openProjectSettings("categories"))}>
            Gestionar categorías
          </PaletteItem>
          <PaletteItem value="unirme codigo invitacion proyecto" icon={<KeyRound />} onSelect={() => run(() => setJoinOpen(true))}>
            Unirme a un proyecto con código…
          </PaletteItem>
          <PaletteItem value="mi panel inicio dashboard" icon={<LayoutDashboard />} onSelect={() => run(() => router.push("/"))}>
            Ir a mi panel
          </PaletteItem>
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="Ir a">
          {VIEWS.map((view) => {
            const Icon = view.icon;
            const current = pathname.startsWith(`${base}/${view.segment}`);
            return (
              <PaletteItem
                key={view.segment}
                value={`ir a ${view.label} ${view.keywords.join(" ")}`}
                icon={<Icon />}
                onSelect={() => run(() => router.push(`${base}/${view.segment}`))}
              >
                {view.label}
                {current && <span className="text-xs text-muted-foreground">· aquí</span>}
              </PaletteItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="Hito del tablero">
          {milestones.map((milestone) => (
            <PaletteItem
              key={milestone.id}
              value={`hito milestone ${milestone.title}`}
              icon={<MilestoneStatusIcon status={milestone.status} />}
              onSelect={() =>
                run(() => {
                  setMilestone(milestone.id);
                  goToBoard();
                })
              }
            >
              {milestone.title}
              {milestone.id === milestoneId && <span className="text-xs text-muted-foreground">· visible</span>}
            </PaletteItem>
          ))}
          <PaletteItem
            value="hito trabajo pendiente backlog sin hito"
            icon={<Inbox />}
            onSelect={() =>
              run(() => {
                setMilestone(null);
                goToBoard();
              })
            }
          >
            Trabajo pendiente
            {milestoneId === null && <span className="text-xs text-muted-foreground">· visible</span>}
          </PaletteItem>
        </CommandGroup>

        {projects.length > 1 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Proyectos">
              {projects
                .filter((item) => item.id !== project.id)
                .map((item) => (
                  <PaletteItem
                    key={item.id}
                    value={`proyecto ${item.name} ${item.key}`}
                    icon={<ProjectAvatar projectKey={item.key} className="size-4 text-[8px]" />}
                    onSelect={() => run(() => router.push(`/projects/${item.id}/board`))}
                  >
                    {item.name}
                    <CommandShortcut>{item.key}</CommandShortcut>
                  </PaletteItem>
                ))}
            </CommandGroup>
          </>
        )}
        {query && (
          <>
            <CommandSeparator alwaysRender />
            <CommandGroup heading="Crear" forceMount>
              <CommandItem value={`crear tarea ${query}`} forceMount onSelect={() => void quickCreate()}>
                <Plus />
                <span className="truncate">
                  Crear tarea <span className="text-foreground">«{query}»</span>
                </span>
                <span className="ml-auto shrink-0 pl-2 text-xs text-muted-foreground">
                  en {milestoneId ? (milestoneTitles.get(milestoneId) ?? "el hito") : "trabajo pendiente"}
                </span>
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </Command>
  );
}

function PaletteItem({
  value,
  icon,
  shortcut,
  onSelect,
  children,
}: {
  value: string;
  icon: ReactNode;
  shortcut?: string;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <CommandItem value={value} onSelect={onSelect}>
      {icon}
      <span className="flex min-w-0 items-center gap-1.5 truncate">{children}</span>
      {shortcut && <CommandShortcut>{shortcut}</CommandShortcut>}
    </CommandItem>
  );
}
