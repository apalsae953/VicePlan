"use client";

import { createContext, use, type ReactNode } from "react";
import { useStore } from "zustand";

import type { WorkspaceStore, WorkspaceStoreApi } from "./workspace-store";

const WorkspaceStoreContext = createContext<WorkspaceStoreApi | null>(null);

/**
 * Expone el store del proyecto (creado por `useWorkspaceSubscription` con el
 * primer snapshot completo de Firestore) a toda la vista del proyecto.
 */
export function WorkspaceStoreProvider({ store, children }: { store: WorkspaceStoreApi; children: ReactNode }) {
  return <WorkspaceStoreContext value={store}>{children}</WorkspaceStoreContext>;
}

export function useWorkspaceStoreApi() {
  const store = use(WorkspaceStoreContext);
  if (!store) throw new Error("useWorkspaceStore debe usarse dentro de <WorkspaceStoreProvider>");
  return store;
}

/**
 * Suscripción con selector. El selector debe devolver valores estables
 * (campos del estado, no arrays/objetos nuevos): deriva con useMemo.
 */
export function useWorkspaceStore<T>(selector: (state: WorkspaceStore) => T): T {
  return useStore(useWorkspaceStoreApi(), selector);
}
