"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Check, GripVertical, Link2, Plus, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { describeDue, formatTaskId } from "@/lib/board";
import { MAX_DEPENDENCIES, MAX_SUBTASKS, MAX_TAGS, normalizeTags } from "@/lib/firestore/tasks";
import type { BoardTask, Subtask } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspace-store-provider";
import { StatusIcon } from "./task-icons";

/*
 * Campos "de HacknPlan" del panel de tarea: fechas, etiquetas, subtareas y
 * dependencias. Mismo estilo que task-fields: controles invisibles que se
 * revelan al pasar el ratón o con el foco.
 */

/** Fecha de calendario (input type=date) con botón para quitarla. */
export function DateField({
  label,
  value,
  onChange,
  tone,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  /** Tono de aviso para la fecha límite vencida. */
  tone?: "overdue" | "soon" | "normal" | "done";
}) {
  return (
    <div className="group/date relative flex items-center">
      <input
        type="date"
        aria-label={label}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
        className={cn(
          "h-8 w-full rounded-md border border-transparent bg-transparent px-2 text-[13px] tabular-nums outline-none [color-scheme:dark]",
          "hover:bg-accent/60 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
          !value && "text-muted-foreground",
          tone === "overdue" && "text-warning",
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label={`Quitar ${label.toLowerCase()}`}
          className="absolute right-8 flex size-5 items-center justify-center rounded text-muted-foreground opacity-0 group-hover/date:opacity-100 hover:bg-accent hover:text-foreground focus-visible:opacity-100"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}

/** Texto de ayuda bajo la fecha límite ("Vence mañana", "Vencida hace 2 días"). */
export function dueHint(task: Pick<BoardTask, "dueDate" | "status">) {
  const due = describeDue(task);
  if (!due || due.tone === "done") return null;
  if (due.days < 0) return { text: `Vencida hace ${-due.days} ${due.days === -1 ? "día" : "días"}`, tone: due.tone };
  if (due.days === 0) return { text: "Vence hoy", tone: due.tone };
  if (due.days === 1) return { text: "Vence mañana", tone: due.tone };
  return { text: `Vence en ${due.days} días`, tone: due.tone };
}

/** Etiquetas: chips + campo con sugerencias de las ya usadas en el proyecto. */
export function TagsField({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
  const tasks = useWorkspaceStore((s) => s.tasks);
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);

  const known = useMemo(() => {
    const all = new Set<string>();
    for (const task of Object.values(tasks)) for (const tag of task.tags) all.add(tag);
    return [...all].sort();
  }, [tasks]);
  const query = draft.trim().toLowerCase();
  const suggestions = known.filter((tag) => !value.includes(tag) && (!query || tag.includes(query))).slice(0, 6);

  function add(tag: string) {
    const next = normalizeTags([...value, tag]);
    if (next.length !== value.length) onChange(next);
    setDraft("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if ((event.key === "Enter" || event.key === ",") && draft.trim()) {
      event.preventDefault();
      add(draft);
    } else if (event.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    } else if (event.key === "Escape") {
      setDraft("");
      event.currentTarget.blur();
    }
  }

  return (
    <div className="relative">
      <div className="flex min-h-8 flex-wrap items-center gap-1 rounded-md px-1.5 py-1 hover:bg-accent/60 focus-within:bg-accent/60">
        {value.map((tag) => (
          <span key={tag} className="flex h-5 items-center gap-0.5 rounded-md border bg-card pr-0.5 pl-1.5 text-[11px]">
            #{tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              aria-label={`Quitar etiqueta ${tag}`}
              className="flex size-4 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="size-2.5" />
            </button>
          </span>
        ))}
        {value.length < MAX_TAGS && (
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              if (draft.trim()) add(draft);
            }}
            placeholder={value.length === 0 ? "Añadir etiqueta…" : ""}
            aria-label="Añadir etiqueta (Enter)"
            className="h-5 min-w-20 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
          />
        )}
      </div>
      {focused && suggestions.length > 0 && (
        <ul className="absolute top-full right-0 left-0 z-20 mt-1 rounded-lg bg-popover p-1 shadow-md ring-1 ring-foreground/10">
          {suggestions.map((tag) => (
            <li key={tag}>
              <button
                type="button"
                // mousedown: antes del blur del campo.
                onMouseDown={(event) => {
                  event.preventDefault();
                  add(tag);
                }}
                className="flex w-full items-center rounded-md px-2 py-1 text-left text-[13px] hover:bg-accent"
              >
                #{tag}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function newSubtaskId() {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 10);
}

/** Checklist de la tarea: marcar, renombrar, borrar y reordenar con ↑/↓ (Alt). */
export function SubtasksSection({ value, onChange }: { value: Subtask[]; onChange: (subtasks: Subtask[]) => void }) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const done = value.filter((subtask) => subtask.done).length;

  function add() {
    const title = draft.trim();
    if (!title || value.length >= MAX_SUBTASKS) return;
    onChange([...value, { id: newSubtaskId(), title, done: false }]);
    setDraft("");
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <section className="border-t px-4 py-4">
      <h3 className="flex items-center gap-2 px-2 pb-2 text-xs font-medium text-muted-foreground">
        Subtareas
        {value.length > 0 && (
          <span className="font-mono tabular-nums">
            {done}/{value.length}
          </span>
        )}
        {value.length > 0 && (
          <span className="ml-1 h-1 w-16 overflow-hidden rounded-full bg-muted" aria-hidden>
            <span className="block h-full rounded-full bg-primary" style={{ width: `${(done / value.length) * 100}%` }} />
          </span>
        )}
      </h3>
      <ul className="space-y-0.5">
        {value.map((subtask, index) => (
          <li key={subtask.id} className="group/sub flex items-center gap-2 rounded-md px-2 py-1 hover:bg-accent/40">
            <GripVertical className="size-3.5 shrink-0 text-muted-foreground/40" aria-hidden />
            <Checkbox
              checked={subtask.done}
              onCheckedChange={(checked) =>
                onChange(value.map((s) => (s.id === subtask.id ? { ...s, done: checked === true } : s)))
              }
              aria-label={`Marcar «${subtask.title}»`}
            />
            <input
              defaultValue={subtask.title}
              onBlur={(event) => {
                const title = event.target.value.trim();
                if (!title) event.target.value = subtask.title;
                else if (title !== subtask.title) onChange(value.map((s) => (s.id === subtask.id ? { ...s, title } : s)));
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
                if (event.altKey && event.key === "ArrowUp") move(index, -1);
                if (event.altKey && event.key === "ArrowDown") move(index, 1);
              }}
              aria-label="Título de la subtarea"
              className={cn(
                "min-w-0 flex-1 bg-transparent text-[13px] outline-none",
                subtask.done && "text-muted-foreground line-through",
              )}
            />
            <button
              type="button"
              onClick={() => onChange(value.filter((s) => s.id !== subtask.id))}
              aria-label={`Quitar «${subtask.title}»`}
              className="flex size-5 items-center justify-center rounded text-muted-foreground opacity-0 group-hover/sub:opacity-100 hover:bg-accent hover:text-foreground focus-visible:opacity-100"
            >
              <X className="size-3" />
            </button>
          </li>
        ))}
      </ul>
      {value.length < MAX_SUBTASKS && (
        // Sin <form>: en "Nueva tarea" esto ya está dentro de un formulario.
        <div className="mt-1 flex items-center gap-2 px-2">
          <Plus className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              // Enter añade la subtarea (y no envía el formulario de la tarea);
              // Ctrl/⌘+Enter sigue llegando al panel para crear la tarea.
              if (event.key !== "Enter" || event.ctrlKey || event.metaKey) return;
              event.preventDefault();
              add();
            }}
            placeholder="Añadir subtarea…"
            aria-label="Nueva subtarea (Enter)"
            enterKeyHint="done"
            className="h-7 min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
          />
        </div>
      )}
    </section>
  );
}

/** Dependencias: tareas que deben cerrarse antes que esta ("Bloqueada por"). */
export function DependenciesSection({ task, onChange }: { task: BoardTask; onChange: (blockedBy: string[]) => void }) {
  const tasks = useWorkspaceStore((s) => s.tasks);
  const projectKey = useWorkspaceStore((s) => s.project.key);
  const openTask = useWorkspaceStore((s) => s.openTask);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const blockers = task.blockedBy.map((id) => tasks[id]).filter((t): t is BoardTask => !!t);
  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.values(tasks)
      .filter((t) => t.id !== task.id && !task.blockedBy.includes(t.id))
      .filter(
        (t) =>
          !q || t.title.toLowerCase().includes(q) || formatTaskId(projectKey, t.number).toLowerCase().includes(q),
      )
      .sort((a, b) => Number(a.status === "DONE") - Number(b.status === "DONE") || b.number - a.number)
      .slice(0, 8);
  }, [tasks, task.id, task.blockedBy, query, projectKey]);
  const openCount = blockers.filter((t) => t.status !== "DONE").length;

  return (
    <section className="border-t px-4 py-4">
      <div className="flex items-center gap-2 px-2 pb-2">
        <h3 className="text-xs font-medium text-muted-foreground">Bloqueada por</h3>
        {openCount > 0 && (
          <span className="flex items-center gap-1 text-[11px] text-warning">
            <Link2 className="size-3" aria-hidden />
            {openCount} {openCount === 1 ? "abierta" : "abiertas"}
          </span>
        )}
        {task.blockedBy.length < MAX_DEPENDENCIES && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="xs" className="ml-auto gap-1 text-muted-foreground">
                <Plus /> Añadir
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-1">
              <div className="flex items-center gap-2 border-b px-2 pb-1.5">
                <Search className="size-3.5 text-muted-foreground" aria-hidden />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por título o identificador…"
                  aria-label="Buscar tarea"
                  className="h-7 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
                />
              </div>
              <ul className="max-h-64 overflow-y-auto pt-1">
                {candidates.length === 0 && <li className="px-2 py-3 text-center text-xs text-muted-foreground">Sin resultados</li>}
                {candidates.map((candidate) => (
                  <li key={candidate.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange([...task.blockedBy, candidate.id]);
                        setOpen(false);
                        setQuery("");
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-accent"
                    >
                      <StatusIcon status={candidate.status} />
                      <span className="w-12 shrink-0 font-mono text-[11px] text-muted-foreground">
                        {formatTaskId(projectKey, candidate.number)}
                      </span>
                      <span className="truncate">{candidate.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        )}
      </div>
      {blockers.length === 0 ? (
        <p className="px-2 text-xs text-muted-foreground">Sin dependencias.</p>
      ) : (
        <ul className="space-y-0.5">
          {blockers.map((blocker) => (
            <li key={blocker.id} className="group/dep flex items-center gap-2 rounded-md px-2 py-1 hover:bg-accent/40">
              {blocker.status === "DONE" ? (
                <Check className="size-3.5 shrink-0 text-muted-foreground" aria-label="Cerrada" />
              ) : (
                <StatusIcon status={blocker.status} />
              )}
              <button
                type="button"
                onClick={() => openTask(blocker.id)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left text-[13px] hover:underline"
              >
                <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                  {formatTaskId(projectKey, blocker.number)}
                </span>
                <span className={cn("truncate", blocker.status === "DONE" && "text-muted-foreground line-through")}>
                  {blocker.title}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onChange(task.blockedBy.filter((id) => id !== blocker.id))}
                aria-label={`Quitar la dependencia con ${formatTaskId(projectKey, blocker.number)}`}
                className="flex size-5 items-center justify-center rounded text-muted-foreground opacity-0 group-hover/dep:opacity-100 hover:bg-accent hover:text-foreground focus-visible:opacity-100"
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
