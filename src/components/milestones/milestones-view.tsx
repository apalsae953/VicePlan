"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Milestone, Plus } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { useHotkey } from "@/hooks/use-hotkey";
import { useMilestoneActions } from "@/hooks/use-milestone-actions";
import type { MilestoneStatus } from "@/lib/domain";
import type { BoardMilestone, BoardTask } from "@/lib/types";
import { useWorkspaceStore } from "@/stores/workspace-store-provider";
import { BacklogPanel } from "./backlog-panel";
import { CompleteMilestoneDialog } from "./complete-milestone-dialog";
import { MilestoneCard } from "./milestone-card";
import { MilestoneDialog } from "./milestone-dialog";

const GROUPS: { status: MilestoneStatus; title: string }[] = [
  { status: "ACTIVE", title: "En curso" },
  { status: "PLANNED", title: "Planificados" },
  { status: "COMPLETED", title: "Completados" },
];

/** Vista Milestones: hitos agrupados por estado + backlog para planificar. */
export function MilestonesView() {
  const router = useRouter();
  const projectId = useWorkspaceStore((s) => s.project.id);
  const milestones = useWorkspaceStore((s) => s.milestones);
  const tasks = useWorkspaceStore((s) => s.tasks);
  const panelOpen = useWorkspaceStore((s) => s.panel?.open ?? false);
  const setMilestone = useWorkspaceStore((s) => s.setMilestone);
  const { update } = useMilestoneActions();

  // Formulario: `editing` null = crear; `formKey` reinicia el estado del diálogo.
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BoardMilestone | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [completing, setCompleting] = useState<BoardMilestone | null>(null);

  const tasksByMilestone = useMemo(() => {
    const map = new Map<string, BoardTask[]>();
    for (const task of Object.values(tasks)) {
      if (!task.milestoneId) continue;
      const list = map.get(task.milestoneId) ?? [];
      list.push(task);
      map.set(task.milestoneId, list);
    }
    return map;
  }, [tasks]);

  function openForm(milestone: BoardMilestone | null) {
    setEditing(milestone);
    setFormKey((key) => key + 1);
    setFormOpen(true);
  }

  useHotkey(
    "n",
    (event) => {
      event.preventDefault();
      openForm(null);
    },
    { enabled: !formOpen && !completing && !panelOpen },
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader>
        <Milestone className="size-4 text-muted-foreground" aria-hidden />
        <h1 className="text-[13px] font-medium">Hitos</h1>
        <span className="text-xs text-muted-foreground tabular-nums">{milestones.length}</span>
        <Button size="sm" className="ml-auto gap-1.5" onClick={() => openForm(null)}>
          <Plus aria-hidden />
          <span className="hidden sm:inline">Nuevo hito</span>
          <Kbd className="ml-0.5 hidden h-4 min-w-4 bg-primary-foreground/15 text-[10px] text-primary-foreground sm:inline-flex">
            N
          </Kbd>
        </Button>
      </PageHeader>

      <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl space-y-10 px-4 py-8 sm:px-6">
          {milestones.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
              <Milestone className="size-5 text-muted-foreground" aria-hidden />
              <div className="space-y-1">
                <h2 className="text-sm font-medium">Sin hitos todavía</h2>
                <p className="text-[13px] text-muted-foreground">
                  Crea el primer hito (por ejemplo, un prototipo o un vertical slice) y planifica sus tareas.
                </p>
              </div>
              <Button size="sm" onClick={() => openForm(null)}>
                <Plus /> Crear hito
              </Button>
            </div>
          )}

          {GROUPS.map(({ status, title }) => {
            const group = milestones.filter((m) => m.status === status);
            if (group.length === 0) return null;
            return (
              <section key={status} aria-labelledby={`group-${status}`} className="space-y-3">
                <h2 id={`group-${status}`} className="flex items-center gap-2 text-[13px] font-medium">
                  {title}
                  <span className="font-normal text-muted-foreground tabular-nums">{group.length}</span>
                </h2>
                <div className="space-y-3">
                  {group.map((milestone) => (
                    <MilestoneCard
                      key={milestone.id}
                      milestone={milestone}
                      tasks={tasksByMilestone.get(milestone.id) ?? []}
                      onOpenBoard={() => {
                        setMilestone(milestone.id);
                        router.push(`/projects/${projectId}/board`);
                      }}
                      onEdit={() => openForm(milestone)}
                      onComplete={() => setCompleting(milestone)}
                      onReopen={() =>
                        void update(milestone.id, { status: "ACTIVE" }).then(
                          (saved) => saved && toast(`«${saved.title}» reabierto`),
                        )
                      }
                    />
                  ))}
                </div>
              </section>
            );
          })}

          <BacklogPanel />
        </div>
      </div>

      <MilestoneDialog key={formKey} open={formOpen} onOpenChange={setFormOpen} milestone={editing} />
      <CompleteMilestoneDialog milestone={completing} onOpenChange={(open) => !open && setCompleting(null)} />
    </div>
  );
}
