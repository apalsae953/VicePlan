"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash } from "lucide-react";
import { toast } from "sonner";

import { MilestoneStatusIcon } from "@/components/tasks/task-icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { MilestoneStatus } from "@/lib/domain";
import { useMilestoneActions } from "@/hooks/use-milestone-actions";
import { MILESTONE_STATUSES } from "@/lib/constants";
import { isoToDateInput } from "@/lib/metrics";
import type { BoardMilestone, MilestoneDraft } from "@/lib/types";

type MilestoneDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` = crear uno nuevo. */
  milestone: BoardMilestone | null;
};

/**
 * Crear / editar un milestone. Montar con `key` distinta por milestone para
 * que el formulario arranque con sus datos.
 */
export function MilestoneDialog({ open, onOpenChange, milestone }: MilestoneDialogProps) {
  const { create, update, remove } = useMilestoneActions();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<MilestoneDraft>(() => ({
    title: milestone?.title ?? "",
    description: milestone?.description ?? null,
    status: milestone?.status ?? "PLANNED",
    startDate: isoToDateInput(milestone?.startDate ?? null) || null,
    endDate: isoToDateInput(milestone?.endDate ?? null) || null,
  }));

  const patch = (changes: Partial<MilestoneDraft>) => {
    setDraft((current) => ({ ...current, ...changes }));
    setError(null);
  };

  function submit() {
    if (pending) return;
    if (!draft.title.trim()) return setError("Ponle un título al hito.");
    if (draft.startDate && draft.endDate && draft.endDate < draft.startDate) {
      return setError("La fecha de fin no puede ser anterior a la de inicio.");
    }
    startTransition(async () => {
      const saved = milestone ? await update(milestone.id, draft) : await create(draft);
      if (saved) {
        if (milestone) toast.success("Hito guardado", { description: saved.title });
        onOpenChange(false);
      }
    });
  }

  function handleDelete() {
    if (!milestone) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      if (await remove(milestone.id)) onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="gap-5 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">{milestone ? "Editar hito" : "Nuevo hito"}</DialogTitle>
          <DialogDescription className="text-[13px]">
            Un hito agrupa las tareas de un tablero con fechas y un objetivo claro.
          </DialogDescription>
        </DialogHeader>

        <form
          id="milestone-form"
          className="grid gap-4"
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
          <div className="grid gap-1.5">
            <Label htmlFor="milestone-title" className="text-xs text-muted-foreground">
              Título
            </Label>
            <Input
              id="milestone-title"
              autoFocus
              value={draft.title}
              onChange={(event) => patch({ title: event.target.value })}
              placeholder="p. ej. Beta cerrada v0.4"
              aria-invalid={error?.includes("título") || undefined}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="milestone-description" className="text-xs text-muted-foreground">
              Descripción
            </Label>
            <Textarea
              id="milestone-description"
              value={draft.description ?? ""}
              onChange={(event) => patch({ description: event.target.value || null })}
              placeholder="¿Qué tiene que ser verdad al terminar este hito?"
              className="min-h-20 text-[13px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="milestone-start" className="text-xs text-muted-foreground">
                Inicio
              </Label>
              <Input
                id="milestone-start"
                type="date"
                value={draft.startDate ?? ""}
                onChange={(event) => patch({ startDate: event.target.value || null })}
                className="[color-scheme:dark]"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="milestone-end" className="text-xs text-muted-foreground">
                Fin
              </Label>
              <Input
                id="milestone-end"
                type="date"
                value={draft.endDate ?? ""}
                min={draft.startDate ?? undefined}
                onChange={(event) => patch({ endDate: event.target.value || null })}
                className="[color-scheme:dark]"
                aria-invalid={error?.includes("fecha") || undefined}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Estado</Label>
            <Select value={draft.status} onValueChange={(status) => patch({ status: status as MilestoneStatus })}>
              <SelectTrigger aria-label="Estado del hito" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {MILESTONE_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    <MilestoneStatusIcon status={status.value} />
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
        </form>

        <DialogFooter className="items-center sm:justify-between">
          {milestone ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={handleDelete}
              onBlur={() => setConfirmDelete(false)}
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash />
              {confirmDelete ? "¿Seguro? Sus tareas pasarán a trabajo pendiente" : "Eliminar"}
            </Button>
          ) : (
            <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
              <KbdGroup>
                <Kbd>Ctrl</Kbd>
                <Kbd>Enter</Kbd>
              </KbdGroup>
              para guardar
            </span>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" form="milestone-form" size="sm" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {milestone ? "Guardar cambios" : "Crear hito"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
