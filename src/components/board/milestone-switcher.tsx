"use client";

import { useMemo } from "react";
import { CalendarRange, Check, ChevronDown, Inbox } from "lucide-react";

import { MilestoneStatusIcon } from "@/components/tasks/task-icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { milestoneDateRange as dateRange, milestoneTimeline as timeline } from "@/lib/board";
import { MILESTONE_STATUS_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspace-store-provider";

/** Selector del milestone visible en el tablero (o el backlog). */
export function MilestoneSwitcher() {
  const milestones = useWorkspaceStore((s) => s.milestones);
  const milestoneId = useWorkspaceStore((s) => s.milestoneId);
  const setMilestone = useWorkspaceStore((s) => s.setMilestone);
  const tasks = useWorkspaceStore((s) => s.tasks);

  const current = milestones.find((m) => m.id === milestoneId) ?? null;
  const counts = useMemo(() => {
    const result = new Map<string | null, number>();
    for (const task of Object.values(tasks)) {
      result.set(task.milestoneId, (result.get(task.milestoneId) ?? 0) + 1);
    }
    return result;
  }, [tasks]);

  const range = current && dateRange(current);
  const status = current && timeline(current);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="min-w-0 gap-2 px-2 text-[13px] font-medium">
            {current ? (
              <MilestoneStatusIcon status={current.status} />
            ) : (
              <Inbox className="text-muted-foreground" aria-hidden />
            )}
            <span className="truncate">{current?.title ?? "Trabajo pendiente"}</span>
            <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Hitos
          </DropdownMenuLabel>
          {milestones.map((milestone) => (
            <DropdownMenuItem
              key={milestone.id}
              onSelect={() => setMilestone(milestone.id)}
              className="items-start gap-2.5 py-1.5"
            >
              <MilestoneStatusIcon status={milestone.status} className="mt-0.5" />
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="truncate text-[13px]">{milestone.title}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {MILESTONE_STATUS_META[milestone.status].label}
                  {dateRange(milestone) && ` · ${dateRange(milestone)}`}
                </span>
              </span>
              <span className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                {counts.get(milestone.id) ?? 0}
              </span>
              {milestone.id === milestoneId && <Check className="mt-0.5" aria-label="Seleccionado" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setMilestone(null)} className="gap-2.5">
            <Inbox className="text-muted-foreground" aria-hidden />
            <span className="flex-1 text-[13px]">Trabajo pendiente</span>
            <span className="font-mono text-[11px] text-muted-foreground">{counts.get(null) ?? 0}</span>
            {milestoneId === null && <Check aria-label="Seleccionado" />}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {range && (
        <span
          className="hidden items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground xl:flex"
          title={range}
          suppressHydrationWarning
        >
          <CalendarRange className="size-3.5" aria-hidden />
          <span className={cn(status && "hidden 2xl:inline")}>{range}</span>
          {status && (
            <>
              <span className="hidden text-muted-foreground/50 2xl:inline">·</span>
              <span>{status}</span>
            </>
          )}
        </span>
      )}
    </div>
  );
}
