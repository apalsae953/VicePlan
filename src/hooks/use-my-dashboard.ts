"use client";

import { useEffect, useMemo, useState } from "react";

import { subscribeProjectActivity } from "@/lib/firestore/activity";
import { subscribeAssignedTasks } from "@/lib/firestore/dashboard";
import type { ActivityEvent, BoardTask, ProjectSummary } from "@/lib/types";

export type DashboardTask = BoardTask & { projectId: string };
export type DashboardEvent = ActivityEvent & { projectId: string };

/**
 * Datos de "Mi panel" en tiempo real: mis tareas y la actividad reciente de
 * cada proyecto del que soy miembro (dos listeners por proyecto).
 */
export function useMyDashboard(uid: string, projects: ProjectSummary[]) {
  const [tasksByProject, setTasksByProject] = useState<Record<string, DashboardTask[]>>({});
  const [eventsByProject, setEventsByProject] = useState<Record<string, DashboardEvent[]>>({});
  const projectIds = useMemo(() => projects.map((project) => project.id).sort().join(","), [projects]);

  useEffect(() => {
    if (!projectIds) return;
    const unsubscribers = projectIds.split(",").flatMap((projectId) => [
      subscribeAssignedTasks(
        projectId,
        uid,
        (tasks) =>
          setTasksByProject((current) => ({
            ...current,
            [projectId]: tasks.map((task) => ({ ...task, projectId })),
          })),
        () => setTasksByProject((current) => ({ ...current, [projectId]: [] })),
      ),
      subscribeProjectActivity(
        projectId,
        12,
        (events) =>
          setEventsByProject((current) => ({
            ...current,
            [projectId]: events.map((event) => ({ ...event, projectId })),
          })),
        () => setEventsByProject((current) => ({ ...current, [projectId]: [] })),
      ),
    ]);
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [projectIds, uid]);

  const ids = useMemo(() => (projectIds ? projectIds.split(",") : []), [projectIds]);
  const loaded = ids.every((id) => id in tasksByProject);
  const tasks = useMemo(() => ids.flatMap((id) => tasksByProject[id] ?? []), [tasksByProject, ids]);
  const events = useMemo(
    () =>
      ids
        .flatMap((id) => eventsByProject[id] ?? [])
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 20),
    [eventsByProject, ids],
  );

  return { loaded, tasks, events };
}
