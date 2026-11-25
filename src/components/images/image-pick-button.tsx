"use client";

import { useRef, type ComponentProps, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/images";

/**
 * Botón que abre el selector de archivos del sistema para elegir imágenes
 * (foto de perfil, imagen del proyecto, imágenes de una tarea).
 */
export function ImagePickButton({
  onFiles,
  multiple = false,
  children,
  ...props
}: Omit<ComponentProps<typeof Button>, "onClick" | "type"> & {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  children: ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button type="button" {...props} onClick={() => input.current?.click()}>
        {children}
      </Button>
      <input
        ref={input}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        multiple={multiple}
        hidden
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          // Vaciar para poder elegir el mismo archivo otra vez.
          event.target.value = "";
          if (files.length) onFiles(files);
        }}
      />
    </>
  );
}

/** Imágenes que vienen en un evento de pegar o soltar. */
export function imageFilesFrom(list: FileList | null | undefined) {
  return Array.from(list ?? []).filter((file) => file.type.startsWith("image/"));
}
