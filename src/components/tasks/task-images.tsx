"use client";

import { useEffect, useMemo, useState, type DragEvent, type KeyboardEvent, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { useCurrentUser } from "@/components/auth/auth-provider";
import { ImagePickButton, imageFilesFrom } from "@/components/images/image-pick-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useStoredImage } from "@/hooks/use-stored-image";
import { firestoreErrorMessage } from "@/lib/firestore/errors";
import { imageErrorMessage } from "@/lib/firestore/gdd-assets";
import {
  deleteTaskImage,
  MAX_TASK_IMAGES,
  taskImagePath,
  taskThumbPath,
  uploadTaskImage,
} from "@/lib/firestore/stored-images";
import { imageRejection } from "@/lib/images";
import type { BoardTask } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspace-store-provider";

/*
 * Imágenes de una tarea (capturas, referencias, bocetos). Se comprimen en el
 * navegador y se guardan en Firestore, como las del documento de diseño.
 * Se añaden con el botón, arrastrándolas o pegándolas (Ctrl+V) en el panel.
 */

const HINT = "Pulsa una imagen para verla en grande. Para añadir: arrástralas aquí, pégalas con Ctrl+V o pulsa Añadir.";

/** Filtra los archivos válidos y avisa de los que no lo son. */
function validFiles(files: File[], room: number) {
  const ok: File[] = [];
  for (const file of files) {
    const problem = imageRejection(file);
    if (problem) toast.error(problem);
    else ok.push(file);
  }
  if (ok.length > room) toast(`Una tarea admite ${MAX_TASK_IMAGES} imágenes`, { description: "Se añaden las primeras." });
  return ok.slice(0, Math.max(0, room));
}

/** Sube imágenes a una tarea ya creada (una a una, para no saturar la conexión). */
async function uploadAll(projectId: string, taskId: string, uid: string, files: File[]) {
  let done = 0;
  for (const file of files) {
    try {
      await uploadTaskImage(projectId, taskId, uid, file);
      done++;
    } catch (error) {
      toast.error(imageErrorMessage(error));
    }
  }
  return done;
}

/** Subida de imágenes de una tarea existente, compartida por el panel (pegar) y la sección. */
export function useTaskImageUpload(task: BoardTask) {
  const user = useCurrentUser();
  const projectId = useWorkspaceStore((s) => s.project.id);
  const [uploading, setUploading] = useState(0);

  async function upload(files: File[]) {
    const accepted = validFiles(files, MAX_TASK_IMAGES - task.images.length - uploading);
    if (!accepted.length) return;
    setUploading((n) => n + accepted.length);
    try {
      await uploadAll(projectId, task.id, user.uid, accepted);
    } finally {
      setUploading((n) => n - accepted.length);
    }
  }

  return { upload, uploading };
}

/** Sube en segundo plano las imágenes elegidas al crear una tarea. */
export function uploadNewTaskImages(projectId: string, taskId: string, uid: string, files: File[], label: string) {
  if (!files.length) return;
  void uploadAll(projectId, taskId, uid, files).then((done) => {
    if (done) toast.success(done === 1 ? `Imagen añadida a ${label}` : `${done} imágenes añadidas a ${label}`);
  });
}

// ─── Tarea existente ─────────────────────────────────────────────────────────

export function TaskImagesSection({
  task,
  upload,
  uploading,
}: {
  task: BoardTask;
  upload: (files: File[]) => Promise<void>;
  uploading: number;
}) {
  const projectId = useWorkspaceStore((s) => s.project.id);
  const [viewing, setViewing] = useState<number | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const full = task.images.length + uploading >= MAX_TASK_IMAGES;

  async function confirmRemove(imageId: string) {
    try {
      await deleteTaskImage(projectId, task.id, imageId);
      toast("Imagen eliminada");
    } catch (error) {
      toast.error(firestoreErrorMessage(error, "No se pudo eliminar la imagen"));
    }
  }

  return (
    <ImagesFrame
      count={task.images.length}
      onDropFiles={(files) => void upload(files)}
      action={
        !full && (
          <ImagePickButton variant="ghost" size="xs" multiple className="gap-1 text-muted-foreground" onFiles={(f) => void upload(f)}>
            <ImagePlus /> Añadir
          </ImagePickButton>
        )
      }
    >
      {task.images.length + uploading > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {task.images.map((id, index) => (
            <li key={id} className="group/thumb relative">
              <StoredThumb
                path={taskThumbPath(projectId, id)}
                fallback={taskImagePath(projectId, id)}
                onOpen={() => setViewing(index)}
              />
              <button
                type="button"
                onClick={() => setRemoving(id)}
                aria-label="Eliminar imagen"
                className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-md border bg-popover/90 text-muted-foreground opacity-0 transition-opacity duration-150 group-hover/thumb:opacity-100 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:transition-none"
              >
                <X className="size-3" aria-hidden />
              </button>
            </li>
          ))}
          {Array.from({ length: uploading }, (_, i) => (
            <li key={`uploading-${i}`} className="relative">
              <Skeleton className="aspect-[4/3] w-full rounded-md" />
              <Loader2 className="absolute inset-0 m-auto size-4 animate-spin text-muted-foreground" aria-label="Subiendo" />
            </li>
          ))}
        </ul>
      )}

      {viewing !== null && (
        <ImageViewer
          paths={task.images.map((id) => taskImagePath(projectId, id))}
          index={Math.min(viewing, task.images.length - 1)}
          onIndexChange={setViewing}
          onClose={() => setViewing(null)}
        />
      )}

      <AlertDialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">¿Eliminar esta imagen?</AlertDialogTitle>
            <AlertDialogDescription className="text-[13px]">Se quitará de la tarea para todo el equipo.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size="sm">Cancelar</AlertDialogCancel>
            <AlertDialogAction size="sm" variant="destructive" onClick={() => removing && void confirmRemove(removing)}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ImagesFrame>
  );
}

// ─── Tarea nueva ─────────────────────────────────────────────────────────────

/** Imágenes elegidas antes de crear la tarea: se suben al pulsar "Crear tarea". */
export function DraftImagesSection({ files, onChange }: { files: File[]; onChange: (files: File[]) => void }) {
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);
  const add = (incoming: File[]) => onChange([...files, ...validFiles(incoming, MAX_TASK_IMAGES - files.length)]);

  return (
    <ImagesFrame
      count={files.length}
      onDropFiles={add}
      action={
        files.length < MAX_TASK_IMAGES && (
          <ImagePickButton variant="ghost" size="xs" multiple className="gap-1 text-muted-foreground" onFiles={add}>
            <ImagePlus /> Añadir
          </ImagePickButton>
        )
      }
    >
      {files.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {previews.map((url, index) => (
            <li key={url} className="group/thumb relative">
              <Thumb src={url} />
              <button
                type="button"
                onClick={() => onChange(files.filter((_, i) => i !== index))}
                aria-label={`Quitar ${files[index]?.name ?? "imagen"}`}
                className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-md border bg-popover/90 text-muted-foreground opacity-0 transition-opacity duration-150 group-hover/thumb:opacity-100 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:transition-none"
              >
                <X className="size-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </ImagesFrame>
  );
}

// ─── Piezas ──────────────────────────────────────────────────────────────────

/** Sección con cabecera, zona para soltar archivos y pista de uso. */
function ImagesFrame({
  count,
  action,
  onDropFiles,
  children,
}: {
  count: number;
  action: ReactNode;
  onDropFiles: (files: File[]) => void;
  children: ReactNode;
}) {
  const [dragging, setDragging] = useState(false);

  function onDragOver(event: DragEvent) {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setDragging(true);
  }

  function onDrop(event: DragEvent) {
    const files = imageFilesFrom(event.dataTransfer.files);
    setDragging(false);
    if (!files.length) return;
    event.preventDefault();
    onDropFiles(files);
  }

  return (
    <section
      className={cn(
        "border-t px-4 py-4 transition-colors duration-150",
        dragging && "bg-primary/5 outline-1 -outline-offset-1 outline-primary/40 outline-dashed",
      )}
      onDragOver={onDragOver}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={onDrop}
    >
      <div className="flex items-center justify-between px-2 pb-1.5">
        <h3 className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          Imágenes
          {count > 0 && <span className="font-mono tabular-nums">{count}</span>}
        </h3>
        {action}
      </div>
      <div className="grid gap-2 px-2">
        {children}
        <p className="text-[11px] text-muted-foreground">{dragging ? "Suelta para añadirlas" : HINT}</p>
      </div>
    </section>
  );
}

function Thumb({ src, onOpen }: { src: string | null; onOpen?: () => void }) {
  if (!src) return <Skeleton className="aspect-[4/3] w-full rounded-md" />;
  const image = (
    // eslint-disable-next-line @next/next/no-img-element -- imagen del usuario ya en memoria (blob:)
    <img src={src} alt="" className="aspect-[4/3] w-full cursor-zoom-in rounded-md border object-cover" />
  );
  if (!onOpen) return image;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Ver imagen en grande"
      className="block w-full rounded-md outline-none transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {image}
    </button>
  );
}

function StoredThumb({ path, fallback, onOpen }: { path: string; fallback: string; onOpen: () => void }) {
  return <Thumb src={useStoredImage(path, null, fallback)} onOpen={onOpen} />;
}

/** Visor a pantalla casi completa con flechas (← →) para pasar de imagen. */
function ImageViewer({
  paths,
  index,
  onIndexChange,
  onClose,
}: {
  paths: string[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const src = useStoredImage(paths[index] ?? null);
  const many = paths.length > 1;
  const go = (delta: number) => onIndexChange((index + delta + paths.length) % paths.length);

  function onKeyDown(event: KeyboardEvent) {
    if (!many) return;
    if (event.key === "ArrowRight") go(1);
    if (event.key === "ArrowLeft") go(-1);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        onKeyDown={onKeyDown}
        className="grid max-h-[calc(100svh-2rem)] w-[calc(100vw-2rem)] max-w-5xl grid-rows-[minmax(0,1fr)_auto] gap-3 p-3 sm:max-w-5xl"
      >
        <DialogTitle className="sr-only">Imagen {index + 1} de {paths.length}</DialogTitle>
        <DialogDescription className="sr-only">Usa las flechas para pasar de imagen.</DialogDescription>
        <div className="flex min-h-0 items-center justify-center">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element -- imagen del usuario ya en memoria (blob:)
            <img src={src} alt="" className="max-h-[calc(100svh-7rem)] max-w-full rounded-md object-contain" />
          ) : (
            <Skeleton className="aspect-video w-full max-w-3xl rounded-md" />
          )}
        </div>
        <div className="flex items-center gap-1">
          {many && (
            <>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => go(-1)} aria-label="Imagen anterior">
                <ChevronLeft />
              </Button>
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                {index + 1}/{paths.length}
              </span>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => go(1)} aria-label="Imagen siguiente">
                <ChevronRight />
              </Button>
            </>
          )}
          {src && (
            <Button asChild variant="ghost" size="sm" className="ml-auto gap-1.5 text-muted-foreground">
              <a href={src} target="_blank" rel="noreferrer noopener">
                <ExternalLink /> Abrir original
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
