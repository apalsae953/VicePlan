import { doc, serverTimestamp, Timestamp, writeBatch } from "firebase/firestore";
import type { User } from "firebase/auth";

import { POSITION_STEP } from "@/lib/constants";
import { getFirebase } from "@/lib/firebase";
import { isoToDateInput } from "@/lib/metrics";
import { aethelgard } from "@/lib/sample-data/aethelgard";
import type { SeedGddNode } from "@/lib/sample-data/types";
import { newProjectFields } from "./projects";
import { gddCollection, milestonesCollection, projectsCollection, tasksCollection } from "./refs";

/** Fecha "YYYY-MM-DD" a `days` días de hoy (negativo = pasado). */
function dateFromToday(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return isoToDateInput(date.toISOString());
}

/**
 * Crea "Project: Aethelgard" completo (milestones, GDD jerárquico y tareas
 * vinculadas) para el usuario, en un único batch atómico. Las fechas son
 * relativas a hoy, así que el Vertical Slice siempre aparece "en curso".
 */
export async function createSampleProject(user: User) {
  const { db } = getFirebase();
  const uid = user.uid;
  const data = aethelgard;
  const batch = writeBatch(db);
  const now = serverTimestamp();

  const projectRef = doc(projectsCollection(db));
  const projectId = projectRef.id;
  batch.set(projectRef, {
    ...newProjectFields(user),
    name: data.name,
    key: data.key,
    description: data.description,
    taskCounter: data.tasks.length,
  });

  const milestoneIds = new Map<string, string>();
  for (const milestone of data.milestones) {
    const ref = doc(milestonesCollection(db, projectId));
    milestoneIds.set(milestone.ref, ref.id);
    batch.set(ref, {
      title: milestone.title,
      description: milestone.description ?? null,
      status: milestone.status,
      startDate: dateFromToday(milestone.startInDays),
      endDate: dateFromToday(milestone.endInDays),
      createdAt: now,
      updatedAt: now,
    });
  }

  const gddIds = new Map<string, string>();
  const addNodes = (nodes: SeedGddNode[], parentId: string | null) => {
    nodes.forEach((node, index) => {
      const ref = doc(gddCollection(db, projectId));
      gddIds.set(node.ref, ref.id);
      batch.set(ref, {
        title: node.title,
        content: node.content ?? "",
        parentId,
        position: (index + 1) * POSITION_STEP,
        createdAt: now,
        updatedAt: now,
      });
      if (node.children) addNodes(node.children, ref.id);
    });
  };
  addNodes(data.gdd, null);

  // Ids generados antes de escribir: las dependencias (blockedBy) se resuelven por ref.
  const taskRefs = data.tasks.map(() => doc(tasksCollection(db, projectId)));
  const taskIdsByRef = new Map<string, string>();
  data.tasks.forEach((task, index) => {
    if (task.ref) taskIdsByRef.set(task.ref, taskRefs[index].id);
  });
  const daysAgo = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(17, 30, 0, 0);
    return Timestamp.fromDate(date);
  };

  const nextPosition = new Map<string, number>();
  data.tasks.forEach((task, index) => {
    const milestoneId = task.milestone ? (milestoneIds.get(task.milestone) ?? null) : null;
    const column = `${milestoneId ?? "backlog"}:${task.status}`;
    const position = (nextPosition.get(column) ?? 0) + POSITION_STEP;
    nextPosition.set(column, position);

    batch.set(taskRefs[index], {
      number: index + 1,
      title: task.title,
      description: task.description ?? null,
      status: task.status,
      category: task.category,
      priority: task.priority,
      estimatedHours: task.estimatedHours ?? null,
      loggedHours: task.loggedHours ?? 0,
      position,
      milestoneId,
      gddNodeId: task.gdd ? (gddIds.get(task.gdd) ?? null) : null,
      assigneeId: task.assignee === "me" ? uid : null,
      startDate: null,
      dueDate: task.dueInDays !== undefined ? dateFromToday(task.dueInDays) : null,
      tags: task.tags ?? [],
      subtasks: (task.subtasks ?? []).map(([title, done], i) => ({ id: `s${index}-${i}`, title, done })),
      blockedBy: (task.blockedBy ?? []).flatMap((ref) => taskIdsByRef.get(ref) ?? []),
      completedAt: task.status === "DONE" ? daysAgo(task.completedInDays ?? -1) : null,
      createdBy: uid,
      createdAt: now,
      updatedAt: now,
    });
  });

  await batch.commit();
  return projectId;
}
