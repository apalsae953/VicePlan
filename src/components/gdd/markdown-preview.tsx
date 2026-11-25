"use client";

import { useEffect, useState, type ReactNode } from "react";
import Markdown, { defaultUrlTransform, type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { ImageOff, SquarePen } from "lucide-react";

import { Kbd } from "@/components/ui/kbd";
import { ASSET_SCHEME, assetIdFromSrc, loadGddImage } from "@/lib/firestore/gdd-assets";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspace-store-provider";

/** react-markdown descarta protocolos desconocidos: se deja pasar `asset:` (imágenes del GDD). */
function urlTransform(url: string) {
  return url.startsWith(ASSET_SCHEME) ? url : defaultUrlTransform(url);
}

/**
 * Imagen ya resuelta, sin desbordar, con clic para verla a tamaño completo.
 * Las externas cargan en diferido; las del GDD ya están en memoria (blob:).
 */
function ImageFrame({ src, alt, lazy = true }: { src: string; alt: string; lazy?: boolean }) {
  return (
    <a href={src} target="_blank" rel="noreferrer noopener" className="not-prose my-4 block w-fit">
      {/* eslint-disable-next-line @next/next/no-img-element -- imagen del usuario, tamaño desconocido */}
      <img
        src={src}
        alt={alt}
        loading={lazy ? "lazy" : "eager"}
        decoding="async"
        className="max-h-[70vh] max-w-full rounded-lg border object-contain"
      />
    </a>
  );
}

function ImagePlaceholder({ children, loading = false }: { children?: ReactNode; loading?: boolean }) {
  return (
    <span
      className={cn(
        "not-prose my-4 flex h-40 w-full max-w-md items-center justify-center gap-2 rounded-lg text-xs text-muted-foreground",
        loading ? "animate-pulse bg-muted motion-reduce:animate-none" : "border border-dashed",
      )}
    >
      {children}
    </span>
  );
}

/** Imagen guardada en Firestore (`asset:<id>`): se descarga una vez y se reutiliza. */
function GddAssetImage({ assetId, alt }: { assetId: string; alt: string }) {
  const projectId = useWorkspaceStore((s) => s.project.id);
  const [state, setState] = useState<{ id: string; url: string | null } | null>(null);

  useEffect(() => {
    let alive = true;
    loadGddImage(projectId, assetId).then(
      (url) => alive && setState({ id: assetId, url }),
      () => alive && setState({ id: assetId, url: null }),
    );
    return () => {
      alive = false;
    };
  }, [projectId, assetId]);

  const current = state?.id === assetId ? state : null;
  if (!current) return <ImagePlaceholder loading />;
  if (!current.url) {
    return (
      <ImagePlaceholder>
        <ImageOff className="size-4" aria-hidden />
        Imagen no disponible
      </ImagePlaceholder>
    );
  }
  return <ImageFrame src={current.url} alt={alt} lazy={false} />;
}

// react-markdown pasa `node` (el AST) como prop: se descarta para no
// volcarlo como atributo en el DOM.
const components: Components = {
  // Enlaces externos en pestaña nueva; los anclas internas se quedan.
  a: ({ node, href, ...props }) => {
    void node;
    const external = !href?.startsWith("#");
    return <a href={href} {...(external && { target: "_blank", rel: "noreferrer noopener" })} {...props} />;
  },
  // Concept art: imágenes del GDD (asset:), externas (https) o en subida.
  img: ({ node, src, alt }) => {
    void node;
    if (typeof src !== "string" || !src || src.startsWith("#subiendo")) {
      return <ImagePlaceholder loading>{alt || "Imagen"}</ImagePlaceholder>;
    }
    const assetId = assetIdFromSrc(src);
    if (assetId) return <GddAssetImage assetId={assetId} alt={alt ?? ""} />;
    return <ImageFrame src={src} alt={alt ?? ""} />;
  },
  // Las tablas anchas hacen scroll dentro del documento, no en la página.
  table: ({ node, ...props }) => {
    void node;
    return (
      <div className="scrollbar-subtle overflow-x-auto">
        <table {...props} />
      </div>
    );
  },
};

/**
 * Vista previa del Markdown del GDD (GFM: tablas, listas de tareas, tachado).
 * react-markdown no interpreta HTML crudo, así que el contenido es seguro.
 */
export function MarkdownPreview({
  content,
  onEdit,
  className,
}: {
  content: string;
  onEdit?: () => void;
  className?: string;
}) {
  if (!content.trim()) {
    return (
      <button
        type="button"
        onClick={onEdit}
        className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-12 text-center text-[13px] text-muted-foreground transition-colors hover:border-white/15 hover:text-foreground"
      >
        <SquarePen className="size-4" aria-hidden />
        Esta página está vacía
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground/80">
          Pulsa <Kbd>E</Kbd> o haz clic para empezar a escribir
        </span>
      </button>
    );
  }

  return (
    <div
      onDoubleClick={onEdit}
      className={cn("prose prose-sm prose-invert prose-gdd max-w-none", className)}
    >
      <Markdown remarkPlugins={[remarkGfm]} components={components} urlTransform={urlTransform}>
        {content}
      </Markdown>
    </div>
  );
}
