"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Check, Copy, Inbox, Loader2, Trash, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { useCurrentUser } from "@/components/auth/auth-provider";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTaskActions } from "@/hooks/use-task-actions";
import { formatHours, formatRelative, formatTaskId } from "@/lib/board";
import { STATUS_META } from "@/lib/constants";
import type { BoardTask, TaskDraft, TaskPatch } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspace-store-provider";
import {
  AssigneeSelect,
  CategorySelect,
  GddSelect,
  HoursInput,
  InlineText,
  MilestoneSelect,
  PrioritySelect,
  PropertyRow,
  StatusSelect,
} from "./task-fields";
import { TaskDiscussion } from "./task-discussion";
import { DateField, DependenciesSection, dueHint, SubtasksSection, TagsField } from "./task-extra-fields";
import { MilestoneStatusIcon } from "./task-icons";

/**
 * Panel lateral de tarea. En modo edición cada cambio se guarda al momento
 * (como en Linear, sin botón "Guardar"); en modo creación se rellena un
 * borrador y se confirma con "Crear tarea" o Ctrl+Enter.
 */
export function TaskPanel() {
  const panel = useWorkspaceStore((s) => s.panel);
  const closePanel = useWorkspaceStore((s) => s.closePanel);

  return (
    <Sheet open={panel?.open ?? false} onOpenChange={(open) => !open && closePanel()}>
      <SheetContent
        showCloseButton={false}
        className="gap-0 border-white/10 bg-popover p-0 shadow-2xl shadow-black/60 data-[side=right]:w-full data-[side=right]:sm:max-w-[540px]"
        // En edición no saltamos al título: el foco va al panel y Tab recorre los campos.
        onOpenAutoFocus={(event) => panel?.mode === "edit" && event.preventDefault()}
      >
        {panel?.mode === "edit" && <TaskEditor key={panel.taskId} taskId={panel.taskId} />}
        {panel?.mode === "create" && <TaskCreator key={panel.nonce} defaults={panel.defaults} />}
      </SheetContent>
    </Sheet>
  );
}

// ─── Edición ─────────────────────────────────────────────────────────────────

function TaskEditor({ taskId }: { taskId: string }) {
  const task = useWorkspaceStore((s) => s.tasks[taskId]);
  const projectKey = useWorkspaceStore((s) => s.project.key);
  const projectId = useWorkspaceStore((s) => s.project.id);
  const milestones = useWorkspaceStore((s) => s.milestones);
  const closePanel = useWorkspaceStore((s) => s.closePanel);
  const { update, remove } = useTaskActions();
  const router = useRouter();

  if (!task) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <SheetTitle className="text-sm">Esta tarea ya no existe</SheetTitle>
        <SheetDescription className="text-[13px]">Puede que se haya eliminado.</SheetDescription>
      </div>
    );
  }

  const id = formatTaskId(projectKey, task.number);
  const milestone = milestones.find((m) => m.id === task.milestoneId);
  const save = (patch: TaskPatch) => void update(task.id, patch);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelBar onClose={closePanel}>
        <CopyId id={id} />
        <span className="text-muted-foreground/40">/</span>
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          {milestone ? <MilestoneStatusIcon status={milestone.status} /> : <Inbox className="size-3.5" />}
          <span className="truncate">{milestone?.title ?? "Trabajo pendiente"}</span>
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => void remove(task.id)}
              className="ml-auto text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label="Eliminar tarea"
            >
              <Trash />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Eliminar tarea</TooltipContent>
        </Tooltip>
      </PanelBar>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-3 px-6 pt-6 pb-5">
          <SheetTitle className="sr-only">
            {id}: {task.title}
          </SheetTitle>
          <SheetDescription className="sr-only">Detalle editable de la tarea</SheetDescription>
          <InlineText
            label="Título"
            value={task.title}
            onCommit={(title) => save({ title })}
            placeholder="Título de la tarea"
            className="text-lg leading-snug font-semibold text-foreground md:text-lg"
          />
          <InlineText
            multiline
            label="Descripción"
            value={task.description ?? ""}
            onCommit={(description) => save({ description: description || null })}
            placeholder="Añade una descripción…"
            className="min-h-20 text-[13px] leading-relaxed text-foreground/85 md:text-[13px]"
          />
        </div>

        <TaskProperties
          value={task}
          onChange={save}
          onOpenGdd={(nodeId) => {
            closePanel();
            router.push(`/projects/${projectId}/gdd/${nodeId}`);
          }}
        />
        <SubtasksSection value={task.subtasks} onChange={(subtasks) => save({ subtasks })} />
        <DependenciesSection task={task} onChange={(blockedBy) => save({ blockedBy })} />
        <HoursSection task={task} onChange={save} />
        <TaskDiscussion task={task} />
      </div>

      <footer className="flex shrink-0 items-center gap-1.5 border-t px-6 py-3 text-xs text-muted-foreground" suppressHydrationWarning>
        Creada {formatRelative(task.createdAt)}
        <span className="text-muted-foreground/40">·</span>
        Actualizada {formatRelative(task.updatedAt)}
      </footer>
    </div>
  );
}

const QUICK_LOG_HOURS = [0.5, 1, 2, 4];

/**
 * Tiempo de la tarea con registro ligero: botones de +0,5/+1/+2/+4 h o una
 * cantidad libre, con deshacer. El campo "Registradas" sigue editable para
 * corregir el total. Todo pasa por el store, así Métricas y Milestones se
 * actualizan al instante.
 */
function HoursSection({ task, onChange }: { task: BoardTask; onChange: (patch: TaskPatch) => void }) {
  const { logHours } = useTaskActions();
  const [custom, setCustom] = useState("");
  const estimate = task.estimatedHours;
  const logged = task.loggedHours;
  const ratio = estimate ? logged / estimate : 0;
  const overrun = estimate !== null && logged > estimate;

  function log(hours: number) {
    void logHours(task.id, hours);
  }

  function logCustom() {
    const hours = Number(custom.trim().replace(",", "."));
    if (!Number.isFinite(hours) || hours <= 0 || hours > 24) return;
    log(Math.round(hours * 100) / 100);
    setCustom("");
  }

  return (
    <section className="border-t px-4 py-4">
      <h3 className="px-2 pb-1.5 text-xs font-medium text-muted-foreground">Tiempo</h3>
      <PropertyRow label="Registrar">
        <div className="flex flex-wrap items-center gap-1 py-1 pl-1">
          {QUICK_LOG_HOURS.map((hours) => (
            <Button
              key={hours}
              type="button"
              variant="outline"
              size="xs"
              className="font-mono tabular-nums"
              onClick={() => log(hours)}
              aria-label={`Registrar ${formatHours(hours)} horas`}
            >
              +{formatHours(hours)}h
            </Button>
          ))}
          <form
            className="flex items-center"
            onSubmit={(event) => {
              event.preventDefault();
              logCustom();
            }}
          >
            <input
              inputMode="decimal"
              value={custom}
              onChange={(event) => setCustom(event.target.value)}
              placeholder="otra"
              aria-label="Registrar otra cantidad de horas (Enter)"
              className="h-6 w-14 rounded-md border border-input bg-transparent px-1.5 font-mono text-xs outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </form>
        </div>
      </PropertyRow>
      <PropertyRow label="Estimación">
        <HoursInput
          key={`e-${estimate}`}
          label="Horas estimadas"
          nullable
          value={estimate}
          onCommit={(estimatedHours) => onChange({ estimatedHours })}
        />
      </PropertyRow>
      <PropertyRow label="Registradas">
        <HoursInput
          key={`l-${logged}`}
          label="Horas registradas"
          value={logged}
          onCommit={(loggedHours) => onChange({ loggedHours: loggedHours ?? 0 })}
        />
      </PropertyRow>
      {estimate !== null && estimate > 0 && (
        <div className="mt-2 space-y-1.5 px-2">
          <div className="h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div
              className={cn("h-full rounded-full transition-[width] duration-300", overrun ? "bg-warning" : "bg-primary")}
              style={{ width: `${Math.min(ratio, 1) * 100}%` }}
            />
          </div>
          <p className={cn("text-xs tabular-nums", overrun ? "text-warning" : "text-muted-foreground")}>
            {overrun
              ? `Excede la estimación en ${formatHours(logged - estimate)} h`
              : `${Math.round(ratio * 100)}% · quedan ${formatHours(estimate - logged)} h`}
          </p>
        </div>
      )}
    </section>
  );
}

// ─── Creación ────────────────────────────────────────────────────────────────

function TaskCreator({ defaults }: { defaults: Partial<TaskDraft> }) {
  const projectKey = useWorkspaceStore((s) => s.project.key);
  const firstCategory = useWorkspaceStore((s) => s.project.categories[0]?.id ?? "PROGRAMMING");
  const closePanel = useWorkspaceStore((s) => s.closePanel);
  const { create } = useTaskActions();
  const [pending, startTransition] = useTransition();
  const [showError, setShowError] = useState(false);
  const [draft, setDraft] = useState<TaskDraft>(() => ({
    title: "",
    description: null,
    status: "TODO",
    category: firstCategory,
    priority: "MEDIUM",
    estimatedHours: null,
    loggedHours: 0,
    milestoneId: null,
    gddNodeId: null,
    assigneeId: null,
    startDate: null,
    dueDate: null,
    tags: [],
    subtasks: [],
    blockedBy: [],
    ...defaults,
  }));

  const patch = (changes: Partial<TaskDraft>) => setDraft((current) => ({ ...current, ...changes }));

  function submit() {
    if (pending) return;
    if (!draft.title.trim()) {
      setShowError(true);
      return;
    }
    startTransition(async () => {
      const created = await create(draft);
      if (created) closePanel();
    });
  }

  return (
    <form
      className="flex h-full min-h-0 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          submit();
        }
      }}
    >
      <PanelBar onClose={closePanel}>
        <span className="font-mono text-xs text-muted-foreground">{projectKey}</span>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-xs text-foreground/80">Nueva tarea</span>
      </PanelBar>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-3 px-6 pt-6 pb-5">
          <SheetTitle className="sr-only">Nueva tarea</SheetTitle>
          <SheetDescription className="sr-only">Rellena los datos y pulsa Crear tarea.</SheetDescription>
          <InlineText
            autoFocus
            label="Título"
            value={draft.title}
            onValueChange={(title) => {
              patch({ title });
              if (title.trim()) setShowError(false);
            }}
            placeholder="Título de la tarea"
            className="text-lg leading-snug font-semibold text-foreground md:text-lg"
          />
          {showError && <p className="text-xs text-destructive">Ponle un título a la tarea.</p>}
          <InlineText
            multiline
            label="Descripción"
            value={draft.description ?? ""}
            onValueChange={(description) => patch({ description: description || null })}
            placeholder="Añade una descripción…"
            className="min-h-20 text-[13px] leading-relaxed text-foreground/85 md:text-[13px]"
          />
        </div>

        <TaskProperties value={draft} onChange={patch} />
        <SubtasksSection value={draft.subtasks} onChange={(subtasks) => patch({ subtasks })} />

        <section className="border-t px-4 py-4">
          <h3 className="px-2 pb-1.5 text-xs font-medium text-muted-foreground">Tiempo</h3>
          <PropertyRow label="Estimación">
            <HoursInput
              label="Horas estimadas"
              nullable
              value={draft.estimatedHours}
              onCommit={(estimatedHours) => patch({ estimatedHours })}
            />
          </PropertyRow>
        </section>
      </div>

      <footer className="flex shrink-0 items-center justify-end gap-2 border-t px-4 py-3">
        <span className="mr-auto hidden items-center gap-1.5 pl-2 text-xs text-muted-foreground sm:flex">
          <KbdGroup>
            <Kbd>Ctrl</Kbd>
            <Kbd>Enter</Kbd>
          </KbdGroup>
          para crear
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={closePanel}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Crear tarea
        </Button>
      </footer>
    </form>
  );
}

// ─── Piezas compartidas ──────────────────────────────────────────────────────

function TaskProperties({
  value,
  onChange,
  onOpenGdd,
}: {
  value: Pick<
    TaskDraft,
    "status" | "category" | "priority" | "milestoneId" | "gddNodeId" | "assigneeId" | "startDate" | "dueDate" | "tags"
  >;
  onChange: (patch: Partial<TaskDraft>) => void;
  /** Saltar a la sección del GDD vinculada (solo al editar una tarea existente). */
  onOpenGdd?: (nodeId: string) => void;
}) {
  const milestones = useWorkspaceStore((s) => s.milestones);
  const gddNodes = useWorkspaceStore((s) => s.gddNodes);
  const members = useWorkspaceStore((s) => s.project.members);
  const user = useCurrentUser();
  const hint = dueHint({ dueDate: value.dueDate, status: value.status });

  return (
    <section className="border-t px-4 py-4">
      <h3 className="px-2 pb-1.5 text-xs font-medium text-muted-foreground">Propiedades</h3>
      <PropertyRow label="Estado">
        <StatusSelect value={value.status} onChange={(status) => onChange({ status })} />
      </PropertyRow>
      <PropertyRow label="Categoría">
        <CategorySelect value={value.category} onChange={(category) => onChange({ category })} />
      </PropertyRow>
      <PropertyRow label="Prioridad">
        <PrioritySelect value={value.priority} onChange={(priority) => onChange({ priority })} />
      </PropertyRow>
      <PropertyRow label="Responsable">
        <AssigneeSelect
          value={value.assigneeId}
          members={members}
          currentUid={user.uid}
          onChange={(assigneeId) => onChange({ assigneeId })}
        />
      </PropertyRow>
      <PropertyRow label="Hito">
        <MilestoneSelect
          value={value.milestoneId}
          milestones={milestones}
          onChange={(milestoneId) => onChange({ milestoneId })}
        />
      </PropertyRow>
      <PropertyRow label="Inicio">
        <DateField label="Fecha de inicio" value={value.startDate} onChange={(startDate) => onChange({ startDate })} />
      </PropertyRow>
      <PropertyRow label="Fecha límite">
        <div>
          <DateField
            label="Fecha límite"
            value={value.dueDate}
            onChange={(dueDate) => onChange({ dueDate })}
            tone={hint?.tone}
          />
          {hint && (
            <p className={cn("px-2 pb-1 text-[11px]", hint.tone === "overdue" ? "text-warning" : "text-muted-foreground")}>
              {hint.text}
            </p>
          )}
        </div>
      </PropertyRow>
      <PropertyRow label="Etiquetas">
        <TagsField value={value.tags} onChange={(tags) => onChange({ tags })} />
      </PropertyRow>
      <PropertyRow label="GDD">
        <div className="flex items-center gap-1">
          <div className="min-w-0 flex-1">
            <GddSelect value={value.gddNodeId} nodes={gddNodes} onChange={(gddNodeId) => onChange({ gddNodeId })} />
          </div>
          {onOpenGdd && value.gddNodeId && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 text-muted-foreground"
                  onClick={() => onOpenGdd(value.gddNodeId!)}
                  aria-label="Abrir la sección en el documento de diseño"
                >
                  <ArrowUpRight />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Abrir en el GDD</TooltipContent>
            </Tooltip>
          )}
        </div>
      </PropertyRow>
    </section>
  );
}

function PanelBar({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="flex h-12 shrink-0 items-center gap-1 border-b pr-2 pl-4">
      <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onClose}
        className="text-muted-foreground"
        aria-label="Cerrar panel"
      >
        <X />
      </Button>
    </div>
  );
}

function CopyId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard?.writeText(id);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
          className="group/copy flex items-center gap-1.5 rounded px-1 py-0.5 font-mono text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          {id}
          {copied ? (
            <Check className="size-3" style={{ color: STATUS_META.TESTING.color }} aria-hidden />
          ) : (
            <Copy className="size-3 opacity-0 group-hover/copy:opacity-100" aria-hidden />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>{copied ? "Copiado" : "Copiar identificador"}</TooltipContent>
    </Tooltip>
  );
}
