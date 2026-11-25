"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useCurrentUser } from "@/components/auth/auth-provider";
import { firestoreErrorMessage } from "@/lib/firestore/errors";
import { createProject } from "@/lib/firestore/projects";
import { createSampleProject } from "@/lib/firestore/sample-project";

/** Crear un proyecto vacío o cargar el de ejemplo, y abrirlo. */
export function useProjectCreation() {
  const user = useCurrentUser();
  const router = useRouter();
  const [pending, setPending] = useState<"sample" | "empty" | null>(null);

  async function loadSample() {
    setPending("sample");
    try {
      const projectId = await createSampleProject(user);
      toast.success("Project: Aethelgard cargado", {
        description: "3 hitos, un documento de diseño de 16 secciones y 27 tareas.",
      });
      router.push(`/projects/${projectId}/board`);
    } catch (error) {
      toast.error(firestoreErrorMessage(error, "No se pudo cargar el proyecto de ejemplo"));
    } finally {
      setPending(null);
    }
  }

  async function create(input: { name: string; key: string; description: string | null }) {
    setPending("empty");
    try {
      const projectId = await createProject(user, input);
      toast.success(`Proyecto «${input.name.trim()}» creado`);
      router.push(`/projects/${projectId}/board`);
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error && !("code" in error) ? error.message : firestoreErrorMessage(error, "No se pudo crear el proyecto"),
      );
      return false;
    } finally {
      setPending(null);
    }
  }

  return { pending, loadSample, create };
}
