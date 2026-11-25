"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { BookText, Inbox } from "lucide-react";

import { MemberAvatar } from "@/components/members/member-avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { TaskCategory, TaskPriority, TaskStatus } from "@/lib/domain";
import { flattenGddTree } from "@/lib/board";
import { TASK_PRIORITIES, TASK_STATUSES, UNKNOWN_CATEGORY } from "@/lib/constants";
import { memberDisplayName } from "@/lib/firestore/mappers";
import type { BoardGddNode, BoardMilestone, ProjectMember } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspace-store-provider";
import { CategoryIcon, MilestoneStatusIcon, PriorityIcon, StatusIcon } from "./task-icons";

/*
 * Campos del panel de tarea, al estilo de las propiedades de Linear:
 * etiqueta a la izquierda, control "invisible" a la derecha que solo se
 * revela al pasar el ratón o con el foco.
 */

const NONE = "__none__";

export function PropertyRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[112px_1fr] items-center gap-2 py-0.5">
      <span className="px-2 text-[13px] text-muted-foreground">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

const ghostTrigger =
  "h-8 w-full border-transparent bg-transparent px-2 text-[13px] shadow-none hover:bg-accent/60 dark:bg-transparent dark:hover:bg-accent/60 data-[state=open]:bg-accent/60 [&>svg:last-child]:ml-auto [&>svg:last-child]:opacity-0 hover:[&>svg:last-child]:opacity-100 focus-visible:[&>svg:last-child]:opacity-100";

function PropertySelect({
  value,
  onChange,
  label,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className={ghostTrigger}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="start" className="min-w-56">
        {children}
      </SelectContent>
    </Select>
  );
}

export function StatusSelect({ value, onChange }: { value: TaskStatus; onChange: (value: TaskStatus) => void }) {
  return (
    <PropertySelect label="Estado" value={value} onChange={(v) => onChange(v as TaskStatus)}>
      {TASK_STATUSES.map((status) => (
        <SelectItem key={status.value} value={status.value}>
          <StatusIcon status={status.value} />
          {status.label}
        </SelectItem>
      ))}
    </PropertySelect>
  );
}

export function CategorySelect({
  value,
  onChange,
}: {
  value: TaskCategory;
  onChange: (value: TaskCategory) => void;
}) {
  const categories = useWorkspaceStore((s) => s.project.categories);
  return (
    <PropertySelect label="Categoría" value={value} onChange={(v) => onChange(v as TaskCategory)}>
      {categories.map((category) => (
        <SelectItem key={category.id} value={category.id}>
          <CategoryIcon category={category} />
          {category.name}
        </SelectItem>
      ))}
      {!categories.some((category) => category.id === value) && (
        <SelectItem value={value}>
          <CategoryIcon category={UNKNOWN_CATEGORY} />
          <span className="text-muted-foreground">{UNKNOWN_CATEGORY.name}</span>
        </SelectItem>
      )}
    </PropertySelect>
  );
}

export function PrioritySelect({
  value,
  onChange,
}: {
  value: TaskPriority;
  onChange: (value: TaskPriority) => void;
}) {
  return (
    <PropertySelect label="Prioridad" value={value} onChange={(v) => onChange(v as TaskPriority)}>
      {TASK_PRIORITIES.map((priority) => (
        <SelectItem key={priority.value} value={priority.value}>
          <PriorityIcon priority={priority.value} />
          {priority.label}
        </SelectItem>
      ))}
    </PropertySelect>
  );
}

export function MilestoneSelect({
  value,
  milestones,
  onChange,
}: {
  value: string | null;
  milestones: BoardMilestone[];
  onChange: (value: string | null) => void;
}) {
  return (
    <PropertySelect label="Hito" value={value ?? NONE} onChange={(v) => onChange(v === NONE ? null : v)}>
      {milestones.map((milestone) => (
        <SelectItem key={milestone.id} value={milestone.id}>
          <MilestoneStatusIcon status={milestone.status} />
          {milestone.title}
        </SelectItem>
      ))}
      <SelectSeparator />
      <SelectItem value={NONE}>
        <Inbox className="text-muted-foreground" />
        Trabajo pendiente
      </SelectItem>
    </PropertySelect>
  );
}

export function AssigneeSelect({
  value,
  members,
  currentUid,
  onChange,
}: {
  value: string | null;
  members: ProjectMember[];
  currentUid: string;
  onChange: (value: string | null) => void;
}) {
  // Primero tú; después el resto en el orden del proyecto (propietario, nombre).
  const ordered = useMemo(
    () => [...members].sort((a, b) => Number(b.uid === currentUid) - Number(a.uid === currentUid)),
    [members, currentUid],
  );
  const formerMember = value !== null && !members.some((member) => member.uid === value);

  return (
    <PropertySelect label="Responsable" value={value ?? NONE} onChange={(v) => onChange(v === NONE ? null : v)}>
      <SelectItem value={NONE}>
        <MemberAvatar size="xs" />
        <span className="text-muted-foreground">Sin asignar</span>
      </SelectItem>
      <SelectSeparator />
      {ordered.map((member) => (
        <SelectItem key={member.uid} value={member.uid}>
          <MemberAvatar size="xs" name={member.name} email={member.email} photoURL={member.photoURL} />
          {memberDisplayName(member)}
          {member.uid === currentUid && <span className="text-muted-foreground">(tú)</span>}
        </SelectItem>
      ))}
      {formerMember && (
        <SelectItem value={value}>
          <MemberAvatar size="xs" />
          <span className="text-muted-foreground">Antiguo miembro</span>
        </SelectItem>
      )}
    </PropertySelect>
  );
}

export function GddSelect({
  value,
  nodes,
  onChange,
}: {
  value: string | null;
  nodes: BoardGddNode[];
  onChange: (value: string | null) => void;
}) {
  const options = useMemo(() => flattenGddTree(nodes), [nodes]);
  return (
    <PropertySelect label="Sección del GDD" value={value ?? NONE} onChange={(v) => onChange(v === NONE ? null : v)}>
      <SelectItem value={NONE}>
        <span className="text-muted-foreground">Sin vincular</span>
      </SelectItem>
      <SelectSeparator />
      {options.map((node) => (
        <SelectItem key={node.id} value={node.id} style={{ paddingLeft: `${8 + node.depth * 14}px` }}>
          <BookText className={cn(node.depth === 0 ? "text-foreground/70" : "text-muted-foreground")} />
          <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{node.number}</span>
          <span className={cn(node.depth === 0 && "font-medium")}>{node.title}</span>
        </SelectItem>
      ))}
    </PropertySelect>
  );
}

/**
 * Número de horas editable. Guarda al salir del campo o con Enter;
 * Escape descarta. Acepta coma decimal ("1,5").
 */
export function HoursInput({
  value,
  onCommit,
  nullable = false,
  label,
}: {
  value: number | null;
  onCommit: (value: number | null) => void;
  nullable?: boolean;
  label: string;
}) {
  const initial = value === null ? "" : String(value).replace(".", ",");
  const [draft, setDraft] = useState(initial);
  const skipCommit = useRef(false);

  function commit() {
    if (skipCommit.current) {
      skipCommit.current = false;
      setDraft(initial);
      return;
    }
    const text = draft.trim().replace(",", ".");
    const next = text === "" ? (nullable ? null : 0) : Number(text);
    if (next !== null && (!Number.isFinite(next) || next < 0)) {
      setDraft(initial);
      return;
    }
    const rounded = next === null ? null : Math.round(next * 100) / 100;
    if (rounded !== value) onCommit(rounded);
  }

  return (
    <div className="relative">
      <Input
        inputMode="decimal"
        aria-label={label}
        value={draft}
        placeholder="—"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            skipCommit.current = true;
            event.currentTarget.blur();
          }
        }}
        className="h-8 border-transparent bg-transparent pr-6 pl-2 font-mono text-[13px] tabular-nums shadow-none hover:bg-accent/60 dark:bg-transparent dark:hover:bg-accent/60"
      />
      <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-muted-foreground">
        h
      </span>
    </div>
  );
}

/** Texto editable en línea (título / descripción) que guarda al salir del campo. */
export function InlineText({
  value,
  onCommit,
  onValueChange,
  placeholder,
  label,
  multiline = false,
  autoFocus,
  className,
}: {
  value: string;
  /** Modo edición: se llama al salir del campo si el texto cambió. */
  onCommit?: (value: string) => void;
  /** Modo creación: se llama en cada pulsación. */
  onValueChange?: (value: string) => void;
  placeholder: string;
  label: string;
  multiline?: boolean;
  autoFocus?: boolean;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);

  return (
    <Textarea
      aria-label={label}
      value={draft}
      autoFocus={autoFocus}
      placeholder={placeholder}
      rows={1}
      onChange={(event) => {
        setDraft(event.target.value);
        onValueChange?.(event.target.value);
      }}
      onBlur={() => {
        if (!onCommit) return;
        const next = draft.trim();
        // El título no puede quedar vacío: se restaura.
        if (!multiline && !next) {
          setDraft(value);
          return;
        }
        if (next !== value.trim()) onCommit(next);
      }}
      onKeyDown={(event) => {
        if (!multiline && event.key === "Enter" && !event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      className={cn(
        "min-h-0 resize-none rounded-md border-none bg-transparent px-0 py-0 shadow-none focus-visible:ring-0 dark:bg-transparent",
        className,
      )}
    />
  );
}
