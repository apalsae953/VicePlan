"use client";

import { useEffect, useRef } from "react";

export function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.getAttribute("role") === "combobox"
  );
}

type HotkeyOptions = {
  enabled?: boolean;
  /** Requiere Ctrl (o ⌘ en macOS). */
  mod?: boolean;
  /** Dispara también con el foco en un campo de texto. */
  allowInInputs?: boolean;
};

/** Atajo de teclado global de una sola tecla (estilo Linear: C, /, ⌘K…). */
export function useHotkey(
  key: string,
  handler: (event: KeyboardEvent) => void,
  { enabled = true, mod = false, allowInInputs = false }: HotkeyOptions = {},
) {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.altKey) return;
      if (mod !== (event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() !== key) return;
      if (!allowInInputs && isTypingTarget(event.target)) return;
      handlerRef.current(event);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [key, enabled, mod, allowInInputs]);
}
