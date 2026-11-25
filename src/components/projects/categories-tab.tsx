"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash } from "lucide-react";
import { toast } from "sonner";

import { CategoryGlyph } from "@/components/tasks/category-glyph";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORY_COLORS, CATEGORY_ICONS, DEFAULT_CATEGORIES, MAX_CATEGORIES } from "@/lib/constants";
import { firestoreErrorMessage } from "@/lib/firestore/errors";
import { deleteCategory, updateProjectCategories } from "@/lib/firestore/projects";
import type { ProjectCategory } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspace-store-provider";

function newCategoryId() {
  return `c${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`;
}

/**
 * Categorías (disciplinas) del proyecto: renombrar, color e icono, orden,
 * añadir y borrar (moviendo antes sus tareas a otra). Como "Data
 * customization" en HacknPlan: el pipeline de cada estudio, no uno fijo.
 */
export function CategoriesTab() {
  const projectId = useWorkspaceStore((s) => s.project.id);
  const categories = useWorkspaceStore((s) => s.project.categories);
  const tasks = useWorkspaceStore((s) => s.tasks);
  const [removing, setRemoving] = useState<ProjectCategory | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const result = new Map<string, number>();
    for (const task of Object.values(tasks)) result.set(task.category, (result.get(task.category) ?? 0) + 1);
    return result;
  }, [tasks]);

  const missingDefaults = DEFAULT_CATEGORIES.filter((d) => !categories.some((c) => c.id === d.id));

  async function save(next: ProjectCategory[], message?: string) {
    try {
      await updateProjectCategories(projectId, next);
      if (message) toast.success(message);
    } catch (error) {
      toast.error(firestoreErrorMessage(error, "No se pudieron guardar las categorías"));
    }
  }

  function patch(id: string, changes: Partial<ProjectCategory>) {
    void save(categories.map((c) => (c.id === id ? { ...c, ...changes } : c)));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;
    const next = [...categories];
    [next[index], next[target]] = [next[target], next[index]];
    void save(next);
  }

  function add() {
    if (categories.length >= MAX_CATEGORIES) return;
    const used = new Set(categories.map((c) => c.color));
    const color = CATEGORY_COLORS.find((c) => !used.has(c.value))?.value ?? CATEGORY_COLORS[0].value;
    const category = { id: newCategoryId(), name: "Nueva categoría", color, icon: "tag" };
    setFocusId(category.id);
    void save([...categories, category], "Categoría añadida");
  }

  async function remove(category: ProjectCategory, targetId: string | null) {
    const count = counts.get(category.id) ?? 0;
    try {
      if (count > 0 && targetId) {
        const moved = await deleteCategory(projectId, categories, category.id, targetId);
        const target = categories.find((c) => c.id === targetId);
        toast(`«${category.name}» eliminada`, {
          description: `${moved} ${moved === 1 ? "tarea movida" : "tareas movidas"} a ${target?.name ?? "otra categoría"}.`,
        });
      } else {
        await updateProjectCategories(projectId, categories.filter((c) => c.id !== category.id));
        toast(`«${category.name}» eliminada`);
      }
    } catch (error) {
      toast.error(firestoreErrorMessage(error, "No se pudo eliminar la categoría"));
    }
  }

  return (
    <div className="grid gap-4">
      <p className="text-xs text-muted-foreground">
        Las disciplinas de tu equipo: aparecen en el tablero, en los filtros de la barra lateral y en Métricas.
      </p>
      <ul className="grid gap-0.5">
        {categories.map((category, index) => (
          <li key={category.id} className="group/cat flex items-center gap-2 rounded-md px-1 py-1 hover:bg-accent/40">
            <AppearancePicker category={category} onChange={(changes) => patch(category.id, changes)} />
            <input
              key={category.name}
              autoFocus={focusId === category.id}
              onFocus={(event) => focusId === category.id && event.currentTarget.select()}
              defaultValue={category.name}
              maxLength={40}
              aria-label="Nombre de la categoría"
              onBlur={(event) => {
                const name = event.target.value.trim();
                if (!name) event.target.value = category.name;
                else if (name !== category.name) patch(category.id, { name });
                if (focusId === category.id) setFocusId(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
                if (event.key === "Escape") {
                  event.currentTarget.value = category.name;
                  event.currentTarget.blur();
                }
              }}
              className="h-7 min-w-0 flex-1 rounded-md bg-transparent px-1.5 text-[13px] outline-none hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            <span className="w-14 text-right font-mono text-[11px] text-muted-foreground tabular-nums">
              {counts.get(category.id) ?? 0} {(counts.get(category.id) ?? 0) === 1 ? "tarea" : "tareas"}
            </span>
            <div className="flex items-center opacity-60 group-hover/cat:opacity-100 focus-within:opacity-100">
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground"
                aria-label={`Subir ${category.name}`}
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <ArrowUp />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground"
                aria-label={`Bajar ${category.name}`}
                disabled={index === categories.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Eliminar ${category.name}`}
                disabled={categories.length <= 1}
                onClick={() => setRemoving(category)}
              >
                <Trash />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" className="gap-1.5" onClick={add} disabled={categories.length >= MAX_CATEGORIES}>
          <Plus /> Añadir categoría
        </Button>
        {missingDefaults.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-muted-foreground"
            onClick={() => void save([...categories, ...missingDefaults].slice(0, MAX_CATEGORIES), "Categorías de serie añadidas")}
          >
            <RotateCcw /> Añadir las de serie que faltan ({missingDefaults.length})
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {categories.length}/{MAX_CATEGORIES}
        </span>
      </div>

      <RemoveCategoryDialog
        category={removing}
        categories={categories}
        count={removing ? (counts.get(removing.id) ?? 0) : 0}
        onClose={() => setRemoving(null)}
        onConfirm={(category, targetId) => void remove(category, targetId)}
      />
    </div>
  );
}

/** Botón de color + icono con su selector (paleta fija de la regla de diseño). */
function AppearancePicker({
  category,
  onChange,
}: {
  category: ProjectCategory;
  onChange: (changes: Partial<ProjectCategory>) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Color e icono de ${category.name}`}
          className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-card outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <CategoryGlyph icon={category.icon} className="size-3.5" style={{ color: category.color }} aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 space-y-3">
        <div>
          <p className="mb-1.5 text-xs text-muted-foreground">Color</p>
          <div className="grid grid-cols-6 gap-1.5">
            {CATEGORY_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => onChange({ color: color.value })}
                aria-label={color.label}
                aria-pressed={category.color === color.value}
                title={color.label}
                className={cn(
                  "size-7 rounded-md border outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  category.color === color.value && "ring-2 ring-foreground/70",
                )}
              >
                <span className="mx-auto block size-3 rounded-full" style={{ background: color.value }} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs text-muted-foreground">Icono</p>
          <div className="grid grid-cols-7 gap-1">
            {Object.entries(CATEGORY_ICONS).map(([key, { label }]) => (
              <button
                key={key}
                type="button"
                onClick={() => onChange({ icon: key })}
                aria-label={label}
                aria-pressed={category.icon === key}
                title={label}
                className={cn(
                  "flex size-7 items-center justify-center rounded-md outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50",
                  category.icon === key && "bg-accent",
                )}
              >
                <CategoryGlyph
                  icon={key}
                  className="size-3.5"
                  style={{ color: category.icon === key ? category.color : undefined }}
                  aria-hidden
                />
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function RemoveCategoryDialog({
  category,
  categories,
  count,
  onClose,
  onConfirm,
}: {
  category: ProjectCategory | null;
  categories: ProjectCategory[];
  count: number;
  onClose: () => void;
  onConfirm: (category: ProjectCategory, targetId: string | null) => void;
}) {
  const others = categories.filter((c) => c.id !== category?.id);
  const [target, setTarget] = useState<string | null>(null);
  const targetId = target && others.some((c) => c.id === target) ? target : (others[0]?.id ?? null);

  return (
    <AlertDialog open={category !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="sm:max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-sm">¿Eliminar «{category?.name}»?</AlertDialogTitle>
          <AlertDialogDescription className="text-[13px]">
            {count > 0
              ? `Tiene ${count} ${count === 1 ? "tarea" : "tareas"}. Elige a qué categoría pasan.`
              : "No tiene tareas. Puedes volver a crearla cuando quieras."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {count > 0 && (
          <Select value={targetId ?? undefined} onValueChange={setTarget}>
            <SelectTrigger className="w-full" aria-label="Categoría de destino">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {others.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <CategoryGlyph icon={c.icon} style={{ color: c.color }} aria-hidden />
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel size="sm">Cancelar</AlertDialogCancel>
          <AlertDialogAction
            size="sm"
            variant="destructive"
            onClick={() => category && onConfirm(category, count > 0 ? targetId : null)}
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
