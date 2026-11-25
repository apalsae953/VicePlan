"use client";

import { useEffect, useId, useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent } from "react";
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link,
  List,
  ListChecks,
  ListOrdered,
  Loader2,
  Strikethrough,
  Table,
  TextQuote,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { imageErrorMessage } from "@/lib/firestore/gdd-assets";
import { ACCEPTED_IMAGE_TYPES, imageRejection } from "@/lib/images";
import { cn } from "@/lib/utils";

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  /** Escape o Ctrl+Enter: volver a la vista previa. */
  onDone?: () => void;
  autoFocus?: boolean;
  /** Comprime y guarda una imagen; devuelve su URL para el Markdown. Sin ella no se ofrecen imágenes. */
  onUploadImage?: (file: File) => Promise<string>;
};

const UPLOAD_UNAVAILABLE = "No se pueden añadir imágenes aquí.";

type Selection = { value: string; start: number; end: number };

/** Envuelve la selección (o un texto de ejemplo) con marcas en línea. */
function wrapInline({ value, start, end }: Selection, before: string, after: string, placeholder: string): Selection {
  const selected = value.slice(start, end) || placeholder;
  return {
    value: value.slice(0, start) + before + selected + after + value.slice(end),
    start: start + before.length,
    end: start + before.length + selected.length,
  };
}

/** Añade (o quita, si ya está) un prefijo a cada línea seleccionada. */
function toggleLinePrefix({ value, start, end }: Selection, prefix: (index: number) => string): Selection {
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const nextBreak = value.indexOf("\n", end);
  const lineEnd = nextBreak === -1 ? value.length : nextBreak;
  const lines = value.slice(lineStart, lineEnd).split("\n");
  const pattern = new RegExp(`^${prefix(0).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace("1", "\\d+")}`);
  const remove = lines.every((line) => pattern.test(line));
  const block = lines
    .map((line, i) => (remove ? line.replace(pattern, "") : prefix(i) + line.replace(/^(#{1,6} |[-*] (\[[ x]\] )?|\d+\. |> )/, "")))
    .join("\n");
  return {
    value: value.slice(0, lineStart) + block + value.slice(lineEnd),
    start: lineStart,
    end: lineStart + block.length,
  };
}

function insertBlock({ value, start }: Selection, block: string): Selection {
  const needsBreak = start > 0 && value[start - 1] !== "\n";
  const text = `${needsBreak ? "\n\n" : ""}${block}\n`;
  return { value: value.slice(0, start) + text + value.slice(start), start: start + text.length, end: start + text.length };
}

/** Texto alternativo a partir del nombre del archivo (sin extensión ni corchetes). */
function altFromFile(name: string) {
  const alt = name
    .replace(/\.[^.]+$/, "")
    .replace(/[[\]()]/g, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .slice(0, 80);
  return alt || "imagen";
}

type Tool = {
  label: string;
  icon: LucideIcon;
  shortcut?: string;
  apply: (selection: Selection) => Selection;
};

const TOOL_GROUPS: Tool[][] = [
  [
    { label: "Título", icon: Heading2, apply: (s) => toggleLinePrefix(s, () => "## ") },
    { label: "Subtítulo", icon: Heading3, apply: (s) => toggleLinePrefix(s, () => "### ") },
  ],
  [
    { label: "Negrita", icon: Bold, shortcut: "Ctrl+B", apply: (s) => wrapInline(s, "**", "**", "texto") },
    { label: "Cursiva", icon: Italic, shortcut: "Ctrl+I", apply: (s) => wrapInline(s, "*", "*", "texto") },
    { label: "Tachado", icon: Strikethrough, apply: (s) => wrapInline(s, "~~", "~~", "texto") },
    { label: "Código", icon: Code, apply: (s) => wrapInline(s, "`", "`", "código") },
  ],
  [
    { label: "Lista", icon: List, apply: (s) => toggleLinePrefix(s, () => "- ") },
    { label: "Lista numerada", icon: ListOrdered, apply: (s) => toggleLinePrefix(s, (i) => `${i + 1}. `) },
    { label: "Checklist", icon: ListChecks, apply: (s) => toggleLinePrefix(s, () => "- [ ] ") },
    { label: "Cita", icon: TextQuote, apply: (s) => toggleLinePrefix(s, () => "> ") },
  ],
  [
    { label: "Enlace", icon: Link, shortcut: "Ctrl+K", apply: (s) => wrapInline(s, "[", "](https://)", "texto") },
    {
      label: "Tabla",
      icon: Table,
      apply: (s) => insertBlock(s, "| Columna | Columna |\n| --- | --- |\n| Valor | Valor |"),
    },
  ],
];

const SHORTCUTS: Record<string, Tool> = Object.fromEntries(
  TOOL_GROUPS.flat()
    .filter((tool) => tool.shortcut)
    .map((tool) => [tool.shortcut!.split("+")[1].toLowerCase(), tool]),
);

/** Al pulsar Enter dentro de una lista, continúa la viñeta (o la quita si el elemento está vacío). */
function continueList({ value, start, end }: Selection): Selection | null {
  if (start !== end) return null;
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const line = value.slice(lineStart, start);
  const match = line.match(/^(\s*)([-*] \[[ x]\] |[-*] |(\d+)\. |> )/);
  if (!match) return null;

  const [marker, indent] = [match[0], match[1]];
  if (line.trim() === marker.trim()) {
    // Elemento vacío: terminar la lista.
    return { value: value.slice(0, lineStart) + value.slice(start), start: lineStart, end: lineStart };
  }
  const next = match[3]
    ? `${indent}${Number(match[3]) + 1}. `
    : marker.replace("[x]", "[ ]");
  const text = `\n${next}`;
  return { value: value.slice(0, start) + text + value.slice(end), start: start + text.length, end: start + text.length };
}

/**
 * Editor de Markdown: textarea sin bordes que crece con el contenido, barra de
 * formato, atajos (Ctrl+B/I/K, Tab, listas que continúan solas) e imágenes
 * (botón, arrastrar o pegar) que se guardan comprimidas como ![alt](asset:id).
 */
export function MarkdownEditor({
  value,
  onChange,
  onDone,
  autoFocus,
  onUploadImage,
}: MarkdownEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadPrefix = useId().replace(/[^a-zA-Z0-9]/g, "");
  const uploadCount = useRef(0);
  const [uploading, setUploading] = useState(0);
  const [dropping, setDropping] = useState(false);
  // Texto más reciente, para sustituir el marcador cuando termina una subida.
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  }, [value]);

  function apply(transform: (selection: Selection) => Selection | null) {
    const textarea = ref.current;
    if (!textarea) return false;
    const next = transform({ value: textarea.value, start: textarea.selectionStart, end: textarea.selectionEnd });
    if (!next) return false;
    onChange(next.value);
    latest.current = next.value;
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(next.start, next.end);
    });
    return true;
  }

  function replaceMarker(marker: string, replacement: string) {
    const current = latest.current;
    if (!current.includes(marker)) return;
    const next = replacement
      ? current.replace(marker, replacement)
      : current.replace(`${marker}\n`, "").replace(marker, "");
    latest.current = next;
    onChange(next);
  }

  /**
   * Inserta un marcador «Subiendo…» en el cursor, comprime y guarda cada
   * imagen y lo sustituye por ![alt](url). Si falla, quita el marcador y avisa.
   */
  async function uploadImages(files: File[]) {
    const images = files.filter((file) => file.type.startsWith("image/"));
    if (images.length === 0) return;
    if (!onUploadImage) {
      toast.error(UPLOAD_UNAVAILABLE);
      return;
    }
    for (const file of images) {
      const problem = imageRejection(file);
      if (problem) {
        toast.error(problem);
        continue;
      }
      const alt = altFromFile(file.name);
      uploadCount.current += 1;
      const marker = `![Subiendo ${alt}…](#subiendo-${uploadPrefix}-${uploadCount.current})`;
      apply((s) => insertBlock(s, marker));
      setUploading((n) => n + 1);
      try {
        const url = await onUploadImage(file);
        replaceMarker(marker, `![${alt}](${url})`);
        toast.success(`Imagen «${alt}» añadida`);
      } catch (error) {
        replaceMarker(marker, "");
        toast.error(imageErrorMessage(error));
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  function handleDrag(event: DragEvent<HTMLDivElement>) {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    if (event.type === "dragleave") {
      // Solo al salir del editor, no al pasar entre sus hijos.
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropping(false);
      return;
    }
    event.dataTransfer.dropEffect = onUploadImage ? "copy" : "none";
    setDropping(true);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    if (!event.dataTransfer.files.length) return;
    event.preventDefault();
    setDropping(false);
    void uploadImages(Array.from(event.dataTransfer.files));
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith("image/"));
    if (files.length === 0) return;
    event.preventDefault();
    void uploadImages(files);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    const mod = event.ctrlKey || event.metaKey;
    if (event.key === "Escape" || (mod && event.key === "Enter")) {
      event.preventDefault();
      onDone?.();
      return;
    }
    if (mod && !event.shiftKey && !event.altKey) {
      const tool = SHORTCUTS[event.key.toLowerCase()];
      if (tool) {
        event.preventDefault();
        // Evita que Ctrl+B pliegue la barra lateral y Ctrl+K abra la paleta (escuchan en window).
        event.stopPropagation();
        apply(tool.apply);
      }
      return;
    }
    if (event.key === "Tab" && !event.shiftKey) {
      event.preventDefault();
      apply((s) => ({ value: s.value.slice(0, s.start) + "  " + s.value.slice(s.end), start: s.start + 2, end: s.start + 2 }));
      return;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      if (apply(continueList)) event.preventDefault();
    }
  }

  return (
    <div
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      className={cn(
        "relative rounded-lg border bg-card/40 transition-colors duration-150 focus-within:border-white/14",
        dropping && "border-primary/60",
      )}
    >
      <div
        role="toolbar"
        aria-label="Formato"
        className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 rounded-t-lg border-b bg-card px-1.5 py-1"
      >
        {TOOL_GROUPS.map((group, index) => (
          <div key={index} className="flex items-center gap-0.5">
            {index > 0 && <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4" />}
            {group.map((tool) => (
              <Tooltip key={tool.label}>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground"
                    aria-label={tool.label}
                    // Mantiene la selección del textarea al pulsar.
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => apply(tool.apply)}
                  >
                    <tool.icon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {tool.label}
                  {tool.shortcut && <span className="font-mono text-muted-foreground">{tool.shortcut}</span>}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        ))}
        <div className="flex items-center gap-0.5">
          <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4" />
          <Tooltip>
            <TooltipTrigger asChild>
              {/* span: un botón deshabilitado no dispara el tooltip */}
              <span
                tabIndex={onUploadImage ? undefined : 0}
                className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground"
                  aria-label="Subir imagen"
                  disabled={!onUploadImage}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => fileInput.current?.click()}
                >
                  <ImagePlus />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-64">
              {onUploadImage ? "Subir imagen · también puedes arrastrarla o pegarla" : UPLOAD_UNAVAILABLE}
            </TooltipContent>
          </Tooltip>
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            multiple
            hidden
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              event.target.value = "";
              void uploadImages(files);
            }}
          />
        </div>
        <span
          className="ml-auto hidden items-center gap-1.5 pr-1.5 text-[11px] text-muted-foreground sm:flex"
          aria-live="polite"
        >
          {uploading > 0 ? (
            <>
              <Loader2 className="size-3 animate-spin" aria-hidden />
              Subiendo {uploading === 1 ? "imagen" : `${uploading} imágenes`}…
            </>
          ) : (
            <>
              Markdown · <span className="font-mono">Esc</span> para previsualizar
            </>
          )}
        </span>
      </div>
      <textarea
        ref={ref}
        value={value}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        spellCheck
        aria-label="Contenido de la sección en Markdown"
        placeholder="Escribe en Markdown: ## títulos, **negrita**, - listas, | tablas |… Arrastra o pega imágenes."
        className="field-sizing-content block min-h-[45vh] w-full resize-none bg-transparent px-4 py-3 font-mono text-[13px] leading-6 text-foreground/90 outline-none placeholder:text-muted-foreground/60"
      />
      {dropping && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg border border-dashed border-primary/60 bg-background/75 text-[13px] text-foreground">
          {onUploadImage ? "Suelta para subir la imagen" : UPLOAD_UNAVAILABLE}
        </div>
      )}
    </div>
  );
}
