"use client";

import { useMemo, useTransition } from "react";
import { Loader2 } from "lucide-react";

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
import type { GddOption } from "@/lib/board";
import { useWorkspaceStore } from "@/stores/workspace-store-provider";

/**
 * Confirmación de borrado de una sección: explica el alcance real (subpáginas
 * que se borran y tareas que quedan desvinculadas, que no se eliminan).
 */
export function GddDeleteDialog({
  node,
  outline,
  onOpenChange,
  onConfirm,
}: {
  node: GddOption | null;
  outline: GddOption[];
  onOpenChange: (open: boolean) => void;
  onConfirm: (nodeId: string) => Promise<void>;
}) {
  const tasks = useWorkspaceStore((s) => s.tasks);
  const [pending, startTransition] = useTransition();

  const impact = useMemo(() => {
    if (!node) return { descendants: 0, linkedTasks: 0 };
    const ids = new Set([node.id, ...outline.filter((n) => n.ancestorIds.includes(node.id)).map((n) => n.id)]);
    const linkedTasks = Object.values(tasks).filter((task) => task.gddNodeId && ids.has(task.gddNodeId)).length;
    return { descendants: ids.size - 1, linkedTasks };
  }, [node, outline, tasks]);

  return (
    <AlertDialog open={node !== null} onOpenChange={(open) => !pending && onOpenChange(open)}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base">
            ¿Eliminar «{node?.number} {node?.title}»?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-[13px]">
              {impact.descendants > 0 && (
                <p>
                  También se eliminarán sus <strong className="text-foreground">{impact.descendants}</strong>{" "}
                  {impact.descendants === 1 ? "subpágina" : "subpáginas"}.
                </p>
              )}
              {impact.linkedTasks > 0 && (
                <p>
                  <strong className="text-foreground">{impact.linkedTasks}</strong>{" "}
                  {impact.linkedTasks === 1 ? "tarea quedará" : "tareas quedarán"} sin vincular (no se borran).
                </p>
              )}
              <p>Esta acción no se puede deshacer.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() => node && startTransition(() => onConfirm(node.id))}
          >
            {pending && <Loader2 className="animate-spin" />}
            Eliminar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
