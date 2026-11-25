"use client";

import { useMemo, useState, useTransition } from "react";
import { Inbox, Loader2 } from "lucide-react";

import { MilestoneStatusIcon } from "@/components/tasks/task-icons";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMilestoneActions } from "@/hooks/use-milestone-actions";
import type { BoardMilestone, OpenTasksTarget } from "@/lib/types";
import { useWorkspaceStore } from "@/stores/workspace-store-provider";

const BACKLOG = "__backlog__";
const KEEP = "__keep__";

/**
 * Completar un milestone. Si quedan tareas sin terminar, propone moverlas al
 * siguiente hito (como hace Linear con los ciclos), al backlog o dejarlas.
 */
export function CompleteMilestoneDialog({
  milestone,
  onOpenChange,
}: {
  milestone: BoardMilestone | null;
  onOpenChange: (open: boolean) => void;
}) {
  const milestones = useWorkspaceStore((s) => s.milestones);
  const tasks = useWorkspaceStore((s) => s.tasks);
  const { complete } = useMilestoneActions();
  const [pending, startTransition] = useTransition();

  const openCount = useMemo(
    () =>
      milestone
        ? Object.values(tasks).filter((t) => t.milestoneId === milestone.id && t.status !== "DONE").length
        : 0,
    [tasks, milestone],
  );
  const destinations = milestones.filter((m) => m.id !== milestone?.id && m.status !== "COMPLETED");

  // Por defecto, el siguiente hito no completado posterior a este.
  const suggested = useMemo(() => {
    if (!milestone) return BACKLOG;
    const index = milestones.findIndex((m) => m.id === milestone.id);
    return milestones.slice(index + 1).find((m) => m.status !== "COMPLETED")?.id ?? BACKLOG;
  }, [milestones, milestone]);
  const [choice, setChoice] = useState<string | null>(null);
  const target = choice ?? suggested;

  function confirm() {
    if (!milestone) return;
    const value: OpenTasksTarget = openCount === 0 || target === KEEP ? "keep" : target === BACKLOG ? null : target;
    startTransition(async () => {
      if (await complete(milestone.id, value)) {
        setChoice(null);
        onOpenChange(false);
      }
    });
  }

  return (
    <AlertDialog
      open={milestone !== null}
      onOpenChange={(open) => {
        if (pending) return;
        if (!open) setChoice(null);
        onOpenChange(open);
      }}
    >
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base">Completar «{milestone?.title}»</AlertDialogTitle>
          <AlertDialogDescription className="text-[13px]">
            {openCount === 0
              ? "Todas sus tareas están cerradas. El hito pasará a Completado."
              : `Quedan ${openCount} ${openCount === 1 ? "tarea sin terminar" : "tareas sin terminar"}. ¿Qué hacemos con ${openCount === 1 ? "ella" : "ellas"}?`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {openCount > 0 && (
          <Select value={target} onValueChange={setChoice}>
            <SelectTrigger aria-label="Destino de las tareas sin terminar" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              {destinations.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <MilestoneStatusIcon status={m.status} />
                  Mover a {m.title}
                </SelectItem>
              ))}
              <SelectItem value={BACKLOG}>
                <Inbox className="text-muted-foreground" />
                Mover al backlog
              </SelectItem>
              <SelectSeparator />
              <SelectItem value={KEEP}>Dejarlas en este hito</SelectItem>
            </SelectContent>
          </Select>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <Button onClick={confirm} disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Completar milestone
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
