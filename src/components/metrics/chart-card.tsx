"use client";

import { useId, useState, type ReactNode } from "react";
import { ChartColumn, Table } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Tarjeta de gráfico con su vista de tabla equivalente (accesible, sin
 * depender del color ni del hover). El conmutador va en la cabecera.
 */
export function ChartCard({
  title,
  description,
  chart,
  table,
  className,
}: {
  title: string;
  description?: string;
  chart: ReactNode;
  table: ReactNode;
  className?: string;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className={cn("flex flex-col rounded-xl border bg-card", className)}>
      <header className="flex items-start gap-3 px-5 pt-4">
        <div className="min-w-0 flex-1">
          <h2 id={headingId} className="text-[13px] font-medium">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        <div role="radiogroup" aria-label="Vista" className="flex h-7 shrink-0 items-center rounded-md border p-0.5">
          {(
            [
              { value: "chart", label: "Gráfico", icon: ChartColumn },
              { value: "table", label: "Tabla", icon: Table },
            ] as const
          ).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={view === value}
              aria-label={label}
              title={label}
              onClick={() => setView(value)}
              className={cn(
                "flex h-full items-center rounded-[5px] px-1.5 transition-colors duration-150",
                view === value ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
            </button>
          ))}
        </div>
      </header>
      <div className="flex-1 px-5 pt-4 pb-5">{view === "chart" ? chart : table}</div>
    </section>
  );
}

/** Tabla compacta para la vista de datos de un gráfico. */
export function DataTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="scrollbar-subtle overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            {head.map((cell, i) => (
              <th key={cell} scope="col" className={cn("py-2 font-medium", i === 0 ? "text-left" : "text-right")}>
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, i) => (
                <td key={i} className={cn("py-2", i === 0 ? "text-left" : "text-right font-mono text-xs tabular-nums")}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
