"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BookText, ChevronRight, Ellipsis, Eye, FilePlus, ListTree, PencilLine, Plus, SearchX, Trash } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useGddActions } from "@/hooks/use-gdd-actions";
import { useHotkey } from "@/hooks/use-hotkey";
import { useIsMobile } from "@/hooks/use-mobile";
import { flattenGddTree, type GddOption } from "@/lib/board";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspace-store-provider";
import { GddDeleteDialog } from "./gdd-delete-dialog";
import { GddDocument, type GddMode } from "./gdd-document";
import { GddTree } from "./gdd-tree";

/**
 * Módulo Game Design Doc: árbol de secciones + documento + tareas vinculadas.
 *
 * La página seleccionada sale de la URL (`/gdd/<nodeId>`, enlazable desde el
 * Kanban). Navegar dentro del GDD usa `history.pushState`, que Next integra en
 * el router: cambia la URL y `usePathname` sin ida y vuelta al servidor, porque
 * todos los datos ya están en el store.
 */
export function GddView() {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const projectId = useWorkspaceStore((s) => s.project.id);
  const gddNodes = useWorkspaceStore((s) => s.gddNodes);
  const panelOpen = useWorkspaceStore((s) => s.panel?.open ?? false);
  const boardMilestoneId = useWorkspaceStore((s) => s.milestoneId);
  const openCreate = useWorkspaceStore((s) => s.openCreate);
  const { create, remove } = useGddActions();

  const outline = useMemo(() => flattenGddTree(gddNodes), [gddNodes]);
  const base = `/projects/${projectId}/gdd`;
  const requestedId = pathname.startsWith(`${base}/`) ? decodeURIComponent(pathname.slice(base.length + 1).split("/")[0]) : null;
  const node = requestedId ? (outline.find((n) => n.id === requestedId) ?? null) : (outline[0] ?? null);

  const [mode, setMode] = useState<GddMode>("preview");
  const [freshId, setFreshId] = useState<string | null>(null);
  const [treeOpen, setTreeOpen] = useState(true);
  const [mobileTreeOpen, setMobileTreeOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteNode = outline.find((n) => n.id === deleteId) ?? null;

  const navigate = useCallback(
    (nodeId: string | null, nextMode: GddMode = "preview") => {
      window.history.pushState(null, "", nodeId ? `${base}/${nodeId}` : base);
      setMode(nextMode);
      setMobileTreeOpen(false);
    },
    [base],
  );

  async function handleCreate(parentId: string | null) {
    const created = await create(parentId);
    if (!created) return;
    setFreshId(created.id);
    navigate(created.id, "edit");
  }

  async function handleDelete(nodeId: string) {
    const deleted = await remove(nodeId);
    setDeleteId(null);
    if (!deleted || !node || !deleted.includes(node.id)) return;
    // La página abierta desapareció: ir a su padre o al inicio del GDD.
    const parentId = node.ancestorIds.at(-1);
    navigate(parentId && !deleted.includes(parentId) ? parentId : null);
  }

  const dialogOpen = deleteId !== null;
  useHotkey(
    "e",
    (event) => {
      // Sin preventDefault, la "e" acabaría escrita en el editor, que se monta
      // con autofoco durante este mismo evento de teclado.
      event.preventDefault();
      setMode((m) => (m === "edit" ? "preview" : "edit"));
    },
    { enabled: !panelOpen && !dialogOpen && node !== null },
  );
  useHotkey("c", (event) => {
    if (!node) return;
    event.preventDefault();
    openCreate({ gddNodeId: node.id, milestoneId: boardMilestoneId });
  }, { enabled: !panelOpen && !dialogOpen });

  const treeProps = {
    outline,
    selectedId: node?.id ?? null,
    onSelect: (id: string) => navigate(id),
    onCreate: (parentId: string | null) => void handleCreate(parentId),
    onRequestDelete: setDeleteId,
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader className="gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className={cn("text-muted-foreground", treeOpen && !isMobile && "text-foreground")}
              onClick={() => (isMobile ? setMobileTreeOpen(true) : setTreeOpen((open) => !open))}
              aria-label={isMobile ? "Ver secciones" : treeOpen ? "Ocultar árbol de secciones" : "Mostrar árbol de secciones"}
            >
              <ListTree />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isMobile || !treeOpen ? "Mostrar secciones" : "Ocultar secciones"}</TooltipContent>
        </Tooltip>

        <Breadcrumb node={node} outline={outline} onNavigate={navigate} />

        {node && (
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <ModeToggle mode={mode} onChange={setMode} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label="Acciones de la sección">
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onSelect={() => void handleCreate(node.id)}>
                  <FilePlus /> Añadir subpágina
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => openCreate({ gddNodeId: node.id, milestoneId: boardMilestoneId })}>
                  <Plus /> Crear tarea vinculada
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setDeleteId(node.id)}>
                  <Trash /> Eliminar sección
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </PageHeader>

      <div className="flex min-h-0 flex-1">
        {treeOpen && <GddTree {...treeProps} className="hidden w-64 shrink-0 border-r md:flex" />}

        <div className="scrollbar-subtle min-w-0 flex-1 overflow-y-auto">
          {node ? (
            <GddDocument
              key={node.id}
              node={node}
              outline={outline}
              mode={mode}
              onModeChange={setMode}
              onNavigate={(id) => navigate(id)}
              isNew={node.id === freshId}
            />
          ) : requestedId ? (
            <EmptyState
              icon={SearchX}
              title="Esta sección no existe"
              description="Puede que se haya eliminado. Vuelve al inicio del documento."
              action={<Button size="sm" variant="secondary" onClick={() => navigate(null)}>Ir al inicio del GDD</Button>}
            />
          ) : (
            <EmptyState
              icon={BookText}
              title="El documento de diseño está vacío"
              description="Empieza por la visión general: pilares, público objetivo y loop principal."
              action={
                <Button size="sm" onClick={() => void handleCreate(null)}>
                  <Plus /> Crear la primera sección
                </Button>
              }
            />
          )}
        </div>
      </div>

      <Sheet open={mobileTreeOpen} onOpenChange={setMobileTreeOpen}>
        <SheetContent side="left" showCloseButton={false} className="w-72 gap-0 p-0 pt-2">
          <SheetTitle className="sr-only">Secciones del documento de diseño</SheetTitle>
          <GddTree {...treeProps} className="h-full" />
        </SheetContent>
      </Sheet>

      <GddDeleteDialog
        node={deleteNode}
        outline={outline}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function Breadcrumb({
  node,
  outline,
  onNavigate,
}: {
  node: GddOption | null;
  outline: GddOption[];
  onNavigate: (nodeId: string | null) => void;
}) {
  const ancestors = node ? node.ancestorIds.map((id) => outline.find((n) => n.id === id)).filter(Boolean) : [];
  return (
    <nav aria-label="Ruta" className="flex min-w-0 items-center gap-1 text-[13px]">
      <button
        type="button"
        onClick={() => onNavigate(null)}
        className="flex shrink-0 items-center gap-1.5 rounded px-1 py-0.5 text-muted-foreground hover:text-foreground"
      >
        <BookText className="size-4" aria-hidden />
        <span className="hidden sm:inline">Documento de diseño</span>
      </button>
      {ancestors.map((ancestor) => (
        <span key={ancestor!.id} className="hidden min-w-0 items-center gap-1 lg:flex">
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" aria-hidden />
          <button
            type="button"
            onClick={() => onNavigate(ancestor!.id)}
            className="truncate rounded px-1 py-0.5 text-muted-foreground hover:text-foreground"
          >
            {ancestor!.title}
          </button>
        </span>
      ))}
      {node && (
        <>
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" aria-hidden />
          <span className="truncate px-1 font-medium" aria-current="page">
            {node.title}
          </span>
        </>
      )}
    </nav>
  );
}

function ModeToggle({ mode, onChange }: { mode: GddMode; onChange: (mode: GddMode) => void }) {
  const options = [
    { value: "preview" as const, label: "Vista previa", icon: Eye },
    { value: "edit" as const, label: "Editar", icon: PencilLine },
  ];
  return (
    <div role="radiogroup" aria-label="Modo del documento" className="flex h-7 items-center rounded-md border p-0.5">
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={mode === value}
          onClick={() => onChange(value)}
          className={cn(
            "flex h-full items-center gap-1.5 rounded-[5px] px-2 text-xs transition-colors duration-150",
            mode === value ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="size-3.5" aria-hidden />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
      <Kbd className="mx-1 hidden h-4 min-w-4 text-[10px] md:inline-flex" title="Alternar con E">
        E
      </Kbd>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof BookText;
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex size-10 items-center justify-center rounded-xl border bg-card">
        <Icon className="size-4 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-1">
        <h2 className="text-sm font-medium">{title}</h2>
        <p className="max-w-sm text-[13px] text-pretty text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}
