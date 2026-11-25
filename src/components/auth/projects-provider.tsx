"use client";

import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { firestoreErrorMessage } from "@/lib/firestore/errors";
import {
  acceptInvitation,
  declineInvitation,
  profileOf,
  setOwnPhoto,
  subscribeInvitations,
  syncOwnProfile,
} from "@/lib/firestore/members";
import { subscribeMyProjects } from "@/lib/firestore/projects";
import type { ProjectSummary } from "@/lib/types";
import { useAuth, useCurrentUser } from "./auth-provider";

type ProjectsContextValue = {
  status: "loading" | "ready" | "error";
  projects: ProjectSummary[];
  /** Proyectos que han invitado al email (verificado) del usuario. */
  invitations: ProjectSummary[];
  /** Solo las cuentas con email verificado (Google siempre lo está) reciben invitaciones. */
  canReceiveInvitations: boolean;
  accept: (project: ProjectSummary) => Promise<void>;
  decline: (project: ProjectSummary) => Promise<void>;
};

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

/**
 * Proyectos del usuario (donde es miembro) e invitaciones pendientes, en
 * tiempo real. También mantiene al día su nombre/avatar dentro de cada
 * proyecto (lo que ven los demás miembros).
 */
export function ProjectsProvider({ children }: { children: ReactNode }) {
  const user = useCurrentUser();
  const { version, photoURL } = useAuth();
  const router = useRouter();
  const [projectsState, setProjectsState] = useState<{ status: ProjectsContextValue["status"]; projects: ProjectSummary[] }>(
    { status: "loading", projects: [] },
  );
  const canReceiveInvitations = !user.isAnonymous && !!user.email && user.emailVerified;
  const invitationEmail = canReceiveInvitations ? user.email : null;
  // Guardadas junto al email al que pertenecen: si cambia la cuenta, no se muestran las anteriores.
  const [invitationsState, setInvitationsState] = useState<{ email: string; projects: ProjectSummary[] } | null>(null);
  const invitations = useMemo(
    () => (invitationsState && invitationsState.email === invitationEmail ? invitationsState.projects : []),
    [invitationsState, invitationEmail],
  );

  useEffect(
    () =>
      subscribeMyProjects(
        user.uid,
        (projects) => setProjectsState({ status: "ready", projects }),
        (error) => {
          console.error("[proyectos]", error);
          setProjectsState((current) => ({ status: "error", projects: current.projects }));
        },
      ),
    [user.uid],
  );

  // Invitaciones: avisa con un toast de las que llegan con la app abierta.
  const seenInvitations = useRef<Set<string> | null>(null);
  useEffect(() => {
    seenInvitations.current = null;
    if (!invitationEmail) return;
    return subscribeInvitations(
      invitationEmail,
      (projects) => {
        setInvitationsState({ email: invitationEmail, projects });
        const seen = seenInvitations.current;
        if (seen) {
          for (const project of projects) {
            if (!seen.has(project.id)) toast(`Te han invitado a «${project.name}»`, { description: "Acéptala desde el selector de proyectos." });
          }
        }
        seenInvitations.current = new Set(projects.map((project) => project.id));
      },
      (error) => console.warn("[invitaciones]", error.code),
    );
  }, [invitationEmail]);

  // Perfil propio dentro de cada proyecto: se actualiza si cambió (nombre, foto…).
  const projects = projectsState.projects;
  useEffect(() => {
    // Los efectos del hijo corren antes que los de AuthProvider: se fija aquí la
    // foto vigente para que profileOf no compare con la anterior.
    setOwnPhoto(user.uid, photoURL);
    const profile = profileOf(user);
    for (const project of projects) {
      const current = project.members[user.uid];
      const outdated =
        !current ||
        current.name !== profile.name ||
        current.email !== profile.email ||
        current.photoURL !== profile.photoURL;
      if (outdated) void syncOwnProfile(project.id, user).catch((error) => console.warn("[perfil]", error.code));
    }
    // `version` cambia al guardar la cuenta de invitado o verificar el email;
    // `photoURL`, al subir o quitar la foto de perfil.
  }, [projects, user, version, photoURL]);

  const accept = useCallback(
    async (project: ProjectSummary) => {
      try {
        await acceptInvitation(project.id, user);
        toast.success(`Te has unido a «${project.name}»`, {
          action: { label: "Abrir", onClick: () => router.push(`/projects/${project.id}/board`) },
        });
      } catch (error) {
        toast.error(firestoreErrorMessage(error, "No se pudo aceptar la invitación"));
      }
    },
    [user, router],
  );

  const decline = useCallback(
    async (project: ProjectSummary) => {
      try {
        await declineInvitation(project.id, user);
        toast(`Invitación a «${project.name}» rechazada`);
      } catch (error) {
        toast.error(firestoreErrorMessage(error, "No se pudo rechazar la invitación"));
      }
    },
    [user],
  );

  const value = useMemo<ProjectsContextValue>(
    () => ({ ...projectsState, invitations, canReceiveInvitations, accept, decline }),
    [projectsState, invitations, canReceiveInvitations, accept, decline],
  );

  return <ProjectsContext value={value}>{children}</ProjectsContext>;
}

export function useProjects() {
  const value = use(ProjectsContext);
  if (!value) throw new Error("useProjects debe usarse dentro de <ProjectsProvider>");
  return value;
}
