"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ChevronRight, Ellipsis, FilePlus, Pencil, Plus, Trash } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useGddActions } from "@/hooks/use-gdd-actions";
import type { GddOption } from "@/lib/board";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspace-store-provider";

type GddTreeProps = {
  outline: GddOption[];
  selectedId: string | null;
  onSelect: (nodeId: string) => void;
  onCreate: (parentId: string | null) => void;
  onRequestDelete: (nodeId: string) => void;
  className?: string;
};

/**
 * Árbol de secciones del GDD. Se pinta como lista plana con `aria-level`
 * (patrón de árbol ARIA) para que el teclado recorra solo lo visible:
 * ↑/↓ moverse, →/← desplegar/plegar o saltar a hijo/padre, Inicio/Fin,
 * F2 renombrar, Supr eliminar. Doble clic también renombra.
 */
export function GddTree({ outline, selectedId, onSelect, onCreate, onRequestDelete, className }: GddTreeProps) {
  const collapsed = useWorkspaceStore((s) => s.gddCollapsed);
  const setCollapsed = useWorkspaceStore((s) => s.setGddCollapsed);
  const tasks = useWorkspaceStore((s) => s.tasks);
  const { rename } = useGddActions();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const treeRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(
    () => outline.filter((node) => !node.ancestorIds.some((id) => collapsed[id])),
    [outline, collapsed],
  );

  const taskCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const task of Object.values(tasks)) {
      if (task.gddNodeId) counts.set(task.gddNodeId, (counts.get(task.gddNodeId) ?? 0) + 1);
    }
    return counts;
  }, [tasks]);

  // Roving tabindex: un único elemento enfocable con Tab (el seleccionado).
  const focusableId = visible.some((n) => n.id === selectedId) ? selectedId : visible[0]?.id;

  function focusNode(nodeId: string | undefined) {
    if (!nodeId) return;
    treeRef.current?.querySelector<HTMLElement>(`[data-node-id="${nodeId}"] [data-tree-focus]`)?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.tagName === "INPUT") return;
    const nodeId = target.closest("[data-node-id]")?.getAttribute("data-node-id");
    const index = visible.findIndex((node) => node.id === nodeId);
    const node = visible[index];
    if (!node) return;

    const handled = (() => {
      switch (event.key) {
        case "ArrowDown":
          focusNode(visible[index + 1]?.id);
          return true;
        case "ArrowUp":
          focusNode(visible[index - 1]?.id);
          return true;
        case "Home":
          focusNode(visible[0]?.id);
          return true;
        case "End":
          focusNode(visible.at(-1)?.id);
          return true;
        case "ArrowRight":
          if (node.childCount === 0) return true;
          if (collapsed[node.id]) setCollapsed(node.id, false);
          else focusNode(visible[index + 1]?.id);
          return true;
        case "ArrowLeft":
          if (node.childCount > 0 && !collapsed[node.id]) setCollapsed(node.id, true);
          else focusNode(node.ancestorIds.at(-1));
          return true;
        case "F2":
          setRenamingId(node.id);
          return true;
        case "Delete":
          onRequestDelete(node.id);
          return true;
        default:
          return false;
      }
    })();
    if (handled) event.preventDefault();
  }

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="flex h-10 shrink-0 items-center justify-between pr-2 pl-4">
        <span className="text-xs font-medium text-muted-foreground">Secciones</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground"
              onClick={() => onCreate(null)}
              aria-label="Nueva sección"
            >
              <Plus />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Nueva sección</TooltipContent>
        </Tooltip>
      </div>

      <div
        ref={treeRef}
        role="tree"
        aria-label="Secciones del documento de diseño"
        onKeyDown={handleKeyDown}
        className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto px-2 pb-4"
      >
        {visible.map((node) => {
          const isSelected = node.id === selectedId;
          const isCollapsed = !!collapsed[node.id];
          const count = taskCounts.get(node.id) ?? 0;

          return (
            <div
              key={node.id}
              role="treeitem"
              data-node-id={node.id}
              aria-level={node.depth + 1}
              aria-selected={isSelected}
              aria-expanded={node.childCount > 0 ? !isCollapsed : undefined}
              className={cn(
                "group/row relative flex h-7 items-center rounded-md pr-1 text-[13px] transition-colors duration-150",
                isSelected ? "bg-accent text-foreground" : "text-foreground/80 hover:bg-accent/50",
              )}
              style={{ paddingLeft: 4 + node.depth * 14 }}
            >
              {node.childCount > 0 ? (
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setCollapsed(node.id, !isCollapsed)}
                  className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                  aria-label={isCollapsed ? `Desplegar ${node.title}` : `Plegar ${node.title}`}
                >
                  <ChevronRight
                    className={cn("size-3.5 transition-transform duration-150", !isCollapsed && "rotate-90")}
                    aria-hidden
                  />
                </button>
              ) : (
                <span className="size-5 shrink-0" aria-hidden />
              )}

              {renamingId === node.id ? (
                <RenameInput
                  initial={node.title}
                  onDone={(title) => {
                    setRenamingId(null);
                    if (title !== null) void rename(node.id, title);
                    requestAnimationFrame(() => focusNode(node.id));
                  }}
                />
              ) : (
                <button
                  type="button"
                  data-tree-focus
                  tabIndex={node.id === focusableId ? 0 : -1}
                  onClick={() => onSelect(node.id)}
                  onDoubleClick={() => setRenamingId(node.id)}
                  className="flex h-7 min-w-0 flex-1 items-center gap-2 rounded pl-0.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
                    {node.number}
                  </span>
                  <span className={cn("truncate", node.depth === 0 && "font-medium")}>{node.title}</span>
                </button>
              )}

              {count > 0 && renamingId !== node.id && (
                <span
                  className="ml-1 shrink-0 font-mono text-[11px] text-muted-foreground/70 tabular-nums"
                  title={`${count} ${count === 1 ? "tarea vinculada" : "tareas vinculadas"}`}
                >
                  {count}
                </span>
              )}

              {renamingId !== node.id && (
                <div
                  className={cn(
                    "absolute inset-y-0.5 right-0.5 flex items-center gap-0.5 rounded-md bg-accent pl-1 opacity-0 transition-opacity duration-150",
                    "group-hover/row:opacity-100 group-focus-within/row:opacity-100 has-data-[state=open]:opacity-100",
                  )}
                >
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground hover:bg-white/8"
                    onClick={() => onCreate(node.id)}
                    aria-label={`Añadir subpágina en ${node.title}`}
                    tabIndex={-1}
                  >
                    <Plus />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-muted-foreground hover:bg-white/8"
                        aria-label={`Acciones de ${node.title}`}
                        tabIndex={-1}
                      >
                        <Ellipsis />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-52">
                      <DropdownMenuItem onSelect={() => onCreate(node.id)}>
                        <FilePlus /> Añadir subpágina
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setRenamingId(node.id)}>
                        <Pencil /> Renombrar
                        <DropdownMenuShortcut>F2</DropdownMenuShortcut>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onSelect={() => onRequestDelete(node.id)}>
                        <Trash /> Eliminar
                        <DropdownMenuShortcut>Supr</DropdownMenuShortcut>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          );
        })}

        {visible.length === 0 && (
          <button
            type="button"
            onClick={() => onCreate(null)}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed px-3 py-6 text-xs text-muted-foreground hover:border-white/15 hover:text-foreground"
          >
            <Plus className="size-3.5" aria-hidden /> Crear la primera sección
          </button>
        )}
      </div>
    </div>
  );
}

/** Campo de renombrado en línea: Enter guarda, Escape cancela, salir del campo guarda. */
function RenameInput({ initial, onDone }: { initial: string; onDone: (title: string | null) => void }) {
  const [value, setValue] = useState(initial);
  const finished = useRef(false);

  const finish = (title: string | null) => {
    if (finished.current) return;
    finished.current = true;
    onDone(title);
  };

  return (
    <input
      autoFocus
      value={value}
      aria-label="Nuevo título de la sección"
      onFocus={(event) => event.currentTarget.select()}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => finish(value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") finish(value);
        if (event.key === "Escape") {
          event.stopPropagation();
          finish(null);
        }
      }}
      className="h-6 min-w-0 flex-1 rounded border border-ring/60 bg-background px-1.5 text-[13px] outline-none"
    />
  );
}
