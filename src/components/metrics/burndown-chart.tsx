"use client";

import { useMemo, useState, type MouseEvent } from "react";

import { formatHours } from "@/lib/board";
import { burndown, type BurndownPoint } from "@/lib/metrics";
import type { BoardMilestone, BoardTask } from "@/lib/types";
import { ChartCard, DataTable } from "./chart-card";

const W = 640;
const H = 220;
const PAD = { top: 12, right: 12, bottom: 24, left: 40 };

const dayLabel = new Intl.DateTimeFormat("es", { day: "numeric", month: "short" });
function formatDay(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return dayLabel.format(new Date(year, month - 1, day)).replace(".", "");
}

/**
 * Burndown del hito (horas estimadas pendientes por día) frente a la línea
 * ideal, como el de HacknPlan. Una sola serie de datos en el acento, la ideal
 * discontinua y recesiva; cruceta y tooltip al pasar por encima.
 */
export function BurndownChart({ milestone, tasks }: { milestone: BoardMilestone; tasks: BoardTask[] }) {
  const points = useMemo(() => burndown(milestone, tasks), [milestone, tasks]);
  const [hover, setHover] = useState<number | null>(null);

  if (!points) {
    return (
      <ChartCard
        title="Burndown"
        description={`Horas pendientes · ${milestone.title}`}
        chart={<p className="py-10 text-center text-[13px] text-muted-foreground">Pon fechas de inicio y fin al hito para ver su burndown.</p>}
        table={<p className="py-10 text-center text-[13px] text-muted-foreground">Sin datos.</p>}
      />
    );
  }

  const max = Math.max(1, ...points.map((p) => Math.max(p.ideal, p.remaining ?? 0)));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (value: number) => PAD.top + innerH - (value / max) * innerH;
  const ticks = [0, 0.5, 1].map((f) => Math.round(max * f));
  const actual = points.map((p, i) => (p.remaining === null ? null : `${x(i)},${y(p.remaining)}`)).filter(Boolean).join(" ");
  const ideal = points.map((p, i) => `${x(i)},${y(p.ideal)}`).join(" ");
  const lastActual = points.reduce((last, p, i) => (p.remaining !== null ? i : last), -1);
  const current = lastActual >= 0 ? points[lastActual] : null;
  const behind = current && current.remaining !== null && current.remaining > current.ideal + max * 0.1;

  function onMove(event: MouseEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const relative = ((event.clientX - rect.left) / rect.width) * W;
    const index = Math.round(((relative - PAD.left) / innerW) * (points!.length - 1));
    setHover(Math.min(points!.length - 1, Math.max(0, index)));
  }

  const hovered: BurndownPoint | null = hover !== null ? points[hover] : null;

  const chart = (
    <div className="space-y-3">
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full touch-none"
          role="img"
          aria-label={`Burndown de ${milestone.title}: ${current ? `${formatHours(current.remaining ?? 0)} h pendientes hoy frente a ${formatHours(current.ideal)} h ideales` : "sin datos aún"}`}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} stroke="currentColor" className="text-white/[0.06]" />
              <text x={PAD.left - 8} y={y(tick) + 4} textAnchor="end" className="fill-muted-foreground font-mono text-[11px]">
                {formatHours(tick)}
              </text>
            </g>
          ))}
          {[0, Math.floor((points.length - 1) / 2), points.length - 1].map((i, k) => (
            <text
              key={k}
              x={x(i)}
              y={H - 6}
              textAnchor={k === 0 ? "start" : k === 2 ? "end" : "middle"}
              className="fill-muted-foreground text-[11px]"
            >
              {formatDay(points[i].date)}
            </text>
          ))}
          <polyline points={ideal} fill="none" stroke="var(--muted-foreground)" strokeWidth={1.5} strokeDasharray="4 4" opacity={0.6} />
          {actual && <polyline points={actual} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinejoin="round" />}
          {current && current.remaining !== null && (
            <circle cx={x(lastActual)} cy={y(current.remaining)} r={4} fill="var(--primary)" stroke="var(--card)" strokeWidth={2} />
          )}
          {hovered && hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--muted-foreground)" strokeWidth={1} opacity={0.5} />
              {hovered.remaining !== null && (
                <circle cx={x(hover)} cy={y(hovered.remaining)} r={4} fill="var(--primary)" stroke="var(--card)" strokeWidth={2} />
              )}
            </g>
          )}
        </svg>
        {hovered && hover !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 w-40 -translate-x-1/2 rounded-md bg-popover px-2.5 py-2 text-xs shadow-md ring-1 ring-foreground/10"
            style={{ left: `${(x(hover) / W) * 100}%` }}
          >
            <p className="mb-1 font-medium text-foreground">{formatDay(hovered.date)}</p>
            <p className="flex justify-between text-muted-foreground">
              Pendiente <span className="font-mono text-foreground tabular-nums">{hovered.remaining === null ? "—" : `${formatHours(hovered.remaining)} h`}</span>
            </p>
            <p className="flex justify-between text-muted-foreground">
              Ideal <span className="font-mono text-foreground tabular-nums">{formatHours(hovered.ideal)} h</span>
            </p>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-primary" aria-hidden /> Horas pendientes
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 border-t border-dashed border-muted-foreground" aria-hidden /> Ritmo ideal
        </span>
        {behind && <span className="ml-auto text-warning">Va por detrás del ritmo ideal</span>}
      </div>
    </div>
  );

  const table = (
    <DataTable
      head={["Día", "Pendiente", "Ideal"]}
      rows={points
        .filter((p) => p.remaining !== null)
        .map((p) => [formatDay(p.date), `${formatHours(p.remaining ?? 0)} h`, `${formatHours(p.ideal)} h`])}
    />
  );

  return (
    <ChartCard
      title="Burndown"
      description={`Horas estimadas pendientes por día · ${milestone.title}`}
      chart={chart}
      table={table}
    />
  );
}
