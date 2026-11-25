"use client";

import type { ReactNode } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type BarPart = {
  key: string;
  value: number;
  /** Color de la marca; `null` = carril neutro (la parte "sin empezar"). */
  color: string | null;
  label: string;
  /** Contenido del tooltip (nombre, cantidad, cuota…). */
  detail: ReactNode;
};

type SegmentedBarProps = {
  parts: BarPart[];
  /** `thin`: 8 px, sin texto. `tall`: 28 px con la cifra dentro si cabe. */
  size?: "thin" | "tall";
  /** Etiqueta accesible del conjunto (resumen de todas las partes). */
  label: string;
  /** Marca vertical opcional (0–1), p. ej. el tiempo transcurrido del plazo. */
  marker?: { at: number; label: string } | null;
  className?: string;
};

/** Texto blanco o casi negro sobre un relleno, el de mejor contraste (WCAG). */
function textOn(hex: string) {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
  const vsWhite = 1.05 / (luminance + 0.05);
  const vsBlack = (luminance + 0.05) / (0.0024 + 0.05);
  return vsBlack >= vsWhite ? "#08090a" : "#ffffff";
}

/**
 * Barra segmentada (un todo dividido en partes), según dataviz:
 * separación de 2 px entre partes (el `gap`), extremos redondeados, y cada
 * parte con tooltip y foco de teclado. Las partes a cero no se pintan.
 */
export function SegmentedBar({ parts, size = "thin", label, marker, className }: SegmentedBarProps) {
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  const visible = parts.filter((part) => part.value > 0);
  const tall = size === "tall";

  return (
    <div className={cn("relative", className)}>
      <div
        role="img"
        aria-label={label}
        className={cn("flex w-full gap-0.5", tall ? "h-7" : "h-2")}
      >
        {total === 0 ? (
          <div className={cn("w-full bg-muted", tall ? "rounded" : "rounded-full")} />
        ) : (
          visible.map((part) => {
            const share = part.value / total;
            // Cifra dentro solo si cabe con holgura (≥ 9 % del ancho).
            const showValue = tall && share >= 0.09;
            return (
              <Tooltip key={part.key}>
                <TooltipTrigger asChild>
                  <div
                    tabIndex={0}
                    aria-label={`${part.label}: ${part.value}`}
                    className={cn(
                      "flex min-w-1 items-center overflow-visible outline-none transition-[filter] duration-150 hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring",
                      tall ? "rounded px-2" : "rounded-full",
                      part.color === null && "bg-muted",
                    )}
                    style={{
                      flexGrow: part.value,
                      flexBasis: 0,
                      ...(part.color && { backgroundColor: part.color }),
                    }}
                  >
                    {showValue && (
                      <span
                        className="text-xs font-medium tabular-nums"
                        style={{ color: part.color ? textOn(part.color) : "var(--foreground)" }}
                      >
                        {part.value}
                      </span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">{part.detail}</TooltipContent>
              </Tooltip>
            );
          })
        )}
      </div>

      {marker && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              tabIndex={0}
              aria-label={marker.label}
              className={cn(
                "absolute top-1/2 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/80 outline-none ring-2 ring-card focus-visible:ring-ring",
                tall ? "h-9" : "h-4",
              )}
              style={{ left: `${marker.at * 100}%` }}
            />
          </TooltipTrigger>
          <TooltipContent side="top">{marker.label}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
