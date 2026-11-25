"use client";

import { useEffect, useState } from "react";

import { loadStoredImage } from "@/lib/firestore/stored-images";

/**
 * URL `blob:` de una imagen guardada en Firestore (`path`), o null mientras
 * carga, si falla o si no hay ninguna. Las imágenes se comparten en memoria:
 * diez avatares de la misma persona son una sola lectura.
 */
export function useStoredImage(path: string | null, version?: number | null) {
  const [state, setState] = useState<{ key: string; url: string | null } | null>(null);
  const key = path ? `${path}?v=${version ?? 0}` : null;

  useEffect(() => {
    if (!path || !key) return;
    let cancelled = false;
    loadStoredImage(path, version)
      .then((url) => !cancelled && setState({ key, url }))
      .catch(() => !cancelled && setState({ key, url: null }));
    return () => {
      cancelled = true;
    };
  }, [path, version, key]);

  return state && state.key === key ? state.url : null;
}
