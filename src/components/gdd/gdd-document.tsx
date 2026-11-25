"use client";

import { useState, useTransition } from "react";
import { ChevronRight, Cloud, CloudCheck, CloudOff, ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useCurrentUser } from "@/components/auth/auth-provider";
import { ImagePickButton } from "@/components/images/image-pick-button";
import { useContentAutosave, type SaveStatus } from "@/hooks/use-content-autosave";
import { useGddActions } from "@/hooks/use-gdd-actions";
import { formatRelative, type GddOption } from "@/lib/board";
import { imageErrorMessage, uploadGddImage } from "@/lib/firestore/gdd-assets";
import { imageRejection } from "@/lib/images";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspace-store-provider";
import { GddLinkedTasks } from "./gdd-linked-tasks";
import { MarkdownEditor } from "./markdown-editor";
import { MarkdownPreview } from "./markdown-preview";

export type GddMode = "preview" | "edit";

type GddDocumentProps = {
  node: GddOption;
  outline: GddOption[];
  mode: GddMode;
  onModeChange: (mode: GddMode) => void;
  onNavigate: (nodeId: string) => void;
  /** Página recién creada: enfocar y seleccionar el título. */
  isNew: boolean;
};

/**
 * Página del GDD: título editable, contenido Markdown (vista previa o
 * edición con autoguardado), subsecciones y tareas vinculadas.
 */
export function GddDocument({ node, outline, mode, onModeChange, onNavigate, isNew }: GddDocumentProps) {
  const content = useWorkspaceStore((s) => s.gddContent[node.id] ?? "");
  const projectId = useWorkspaceStore((s) => s.project.id);
  const user = useCurrentUser();
  const { status, change, flush } = useContentAutosave(node.id);
  const children = outline.filter((candidate) => candidate.parentId === node.id);

  return (
    <div className="flex min-h-full">
      <article className="mx-auto w-full max-w-3xl min-w-0 px-5 pt-8 pb-20 sm:px-10">
        <div className="mb-2 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-mono tabular-nums">§ {node.number}</span>
          {node.path.length > 0 && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span className="truncate">{node.path.join(" › ")}</span>
            </>
          )}
        </div>

        <TitleField key={node.id} nodeId={node.id} title={node.title} autoFocus={isNew} />

        <div className="mt-1.5 mb-6 flex h-5 items-center gap-3 text-xs text-muted-foreground">
          <span suppressHydrationWarning>Actualizada {formatRelative(node.updatedAt)}</span>
          {(mode === "edit" || status !== "saved") && <SaveIndicator status={status} onRetry={() => void flush()} />}
          {mode === "preview" && (
            <AppendImageButton
              onUpload={async (files) => {
                // Se añaden al final de la página; luego se pueden mover en Editar.
                let next = content.trimEnd();
                for (const file of files) {
                  const url = await uploadGddImage(projectId, node.id, user.uid, file);
                  next += `${next ? "\n\n" : ""}![${altFromName(file.name)}](${url})`;
                }
                change(`${next}\n`);
                await flush();
              }}
            />
          )}
        </div>

        {mode === "edit" ? (
          <MarkdownEditor
            value={content}
            onChange={change}
            onDone={() => {
              void flush();
              onModeChange("preview");
            }}
            autoFocus={!isNew}
            onUploadImage={(file) => uploadGddImage(projectId, node.id, user.uid, file)}
          />
        ) : (
          <MarkdownPreview content={content} onEdit={() => onModeChange("edit")} />
        )}

        {children.length > 0 && (
          <nav aria-label="Subsecciones" className="mt-10">
            <h2 className="mb-2 text-[13px] font-medium">Subsecciones</h2>
            <ul className="divide-y overflow-hidden rounded-lg border">
              {children.map((child) => (
                <li key={child.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate(child.id)}
                    className="group flex w-full items-center gap-3 px-3 py-2.5 text-left text-[13px] transition-colors duration-150 hover:bg-accent/50"
                  >
                    <span className="w-8 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                      {child.number}
                    </span>
                    <span className="flex-1 truncate">{child.title}</span>
                    {child.childCount > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {child.childCount} {child.childCount === 1 ? "subpágina" : "subpáginas"}
                      </span>
                    )}
                    <ChevronRight
                      className="size-3.5 text-muted-foreground/60 transition-transform duration-150 group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className="mt-10 border-t pt-6 xl:hidden">
          <GddLinkedTasks node={node} outline={outline} onNavigate={onNavigate} />
        </div>
      </article>

      <aside className="hidden w-80 shrink-0 border-l xl:block">
        <div className="sticky top-0 p-5">
          <GddLinkedTasks node={node} outline={outline} onNavigate={onNavigate} />
        </div>
      </aside>
    </div>
  );
}

function altFromName(name: string) {
  return name.replace(/\.[^.]+$/, "").replace(/[[\]]/g, "").replace(/[-_]+/g, " ").trim() || "imagen";
}

/** "Añadir imagen" sin entrar en modo edición: la sube y la pone al final de la página. */
function AppendImageButton({ onUpload }: { onUpload: (files: File[]) => Promise<void> }) {
  const [busy, startBusy] = useTransition();
  return (
    <ImagePickButton
      variant="ghost"
      size="xs"
      multiple
      disabled={busy}
      className="ml-auto gap-1 text-muted-foreground"
      onFiles={(files) => {
        const valid = files.filter((file) => {
          const problem = imageRejection(file);
          if (problem) toast.error(problem);
          return !problem;
        });
        if (!valid.length) return;
        startBusy(async () => {
          try {
            await onUpload(valid);
            toast.success(valid.length === 1 ? "Imagen añadida al final de la página" : `${valid.length} imágenes añadidas al final`);
          } catch (error) {
            toast.error(imageErrorMessage(error));
          }
        });
      }}
    >
      {busy ? <Loader2 className="animate-spin" /> : <ImagePlus />}
      Añadir imagen
    </ImagePickButton>
  );
}

/** Título de la página: se guarda al salir del campo o con Enter. */
function TitleField({ nodeId, title, autoFocus }: { nodeId: string; title: string; autoFocus: boolean }) {
  const { rename } = useGddActions();
  const [draft, setDraft] = useState(title);
  // Si se renombra desde el árbol, el campo adopta el título nuevo.
  const [syncedTitle, setSyncedTitle] = useState(title);
  if (title !== syncedTitle) {
    setSyncedTitle(title);
    setDraft(title);
  }

  return (
    <textarea
      rows={1}
      value={draft}
      autoFocus={autoFocus}
      aria-label="Título de la sección"
      onFocus={(event) => autoFocus && event.currentTarget.select()}
      onChange={(event) => setDraft(event.target.value.replace(/\n/g, ""))}
      onBlur={() => {
        if (!draft.trim()) setDraft(title);
        else void rename(nodeId, draft);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
        if (event.key === "Escape") {
          setDraft(title);
          requestAnimationFrame(() => (document.activeElement as HTMLElement | null)?.blur());
        }
      }}
      className="field-sizing-content block w-full resize-none bg-transparent text-xl leading-snug font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground"
      placeholder="Título de la sección"
    />
  );
}

const SAVE_LABELS: Record<SaveStatus, string> = {
  saved: "Guardado",
  pending: "Sin guardar",
  saving: "Guardando…",
  error: "Error al guardar",
};

function SaveIndicator({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  const Icon = { saved: CloudCheck, pending: Cloud, saving: Loader2, error: CloudOff }[status];
  return (
    <span
      role="status"
      className={cn("flex items-center gap-1.5", status === "error" && "text-destructive")}
    >
      <Icon className={cn("size-3.5", status === "saving" && "animate-spin")} aria-hidden />
      {SAVE_LABELS[status]}
      {status === "error" && (
        <button type="button" onClick={onRetry} className="underline underline-offset-2 hover:text-foreground">
          Reintentar
        </button>
      )}
    </span>
  );
}
