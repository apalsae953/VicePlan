import { cn } from "@/lib/utils";

/**
 * Medidor de un valor frente a un objetivo (horas registradas / estimadas).
 * El relleno lleva el estado: acento mientras no se supera el objetivo,
 * `warning` cuando lo excede. El carril es un paso más claro del mismo tono.
 */
export function Meter({
  value,
  max,
  label,
  className,
}: {
  value: number;
  max: number;
  label: string;
  className?: string;
}) {
  const ratio = max > 0 ? value / max : value > 0 ? 1 : 0;
  const over = max > 0 && value > max;
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn("h-2 overflow-hidden rounded-full", over ? "bg-warning/25" : "bg-primary/20", className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-300 ease-out", over ? "bg-warning" : "bg-primary")}
        style={{ width: `${Math.min(ratio, 1) * 100}%` }}
      />
    </div>
  );
}
