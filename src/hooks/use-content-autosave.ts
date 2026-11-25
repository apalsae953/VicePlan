"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useWorkspaceStoreApi } from "@/stores/workspace-store-provider";
import { useGddActions } from "./use-gdd-actions";

export type SaveStatus = "saved" | "pending" | "saving" | "error";

const SAVE_DELAY_MS = 700;

/**
 * Autoguardado del Markdown de una página del GDD:
 * - cada cambio va al store al instante y marca la página como "sucia", así
 *   un snapshot remoto (otro miembro renombrando, etc.) no pisa lo tecleado,
 * - se escribe en Firestore tras 700 ms sin escribir; al lanzar la escritura
 *   la caché local ya tiene el texto, de modo que deja de estar sucia,
 * - al cambiar de página o desmontar se guarda lo pendiente sin esperar.
 */
export function useContentAutosave(nodeId: string) {
  const store = useWorkspaceStoreApi();
  const { saveContent } = useGddActions();
  const [status, setStatus] = useState<SaveStatus>("saved");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ nodeId: string; content: string } | null>(null);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const job = pending.current;
    if (!job) return;
    pending.current = null;
    setStatus("saving");
    const write = saveContent(job.nodeId, job.content);
    store.getState().setGddDirty(job.nodeId, false);
    const ok = await write;
    // Si entretanto llegó otro cambio, su propio guardado fijará el estado.
    if (!pending.current) setStatus(ok ? "saved" : "error");
  }, [saveContent, store]);

  const change = useCallback(
    (content: string) => {
      store.getState().setGddDirty(nodeId, true);
      store.getState().setGddContent(nodeId, content);
      pending.current = { nodeId, content };
      setStatus("pending");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
    },
    [store, nodeId, flush],
  );

  // Cambio de página o desmontaje: guardar lo pendiente de la página anterior.
  useEffect(() => () => void flush(), [nodeId, flush]);

  // Cerrar la pestaña con cambios sin guardar: pedir confirmación.
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (pending.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  return { status, change, flush };
}
