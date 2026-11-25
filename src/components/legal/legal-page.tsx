import type { ReactNode } from "react";
import { TriangleAlert } from "lucide-react";

import { LEGAL, legalIncomplete } from "@/lib/legal";

/** Fecha de calendario "2026-11-25" → "25 de noviembre de 2026". */
function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(year, month - 1, day),
  );
}

/** Dato legal aún sin rellenar en `src/lib/legal.ts`: se marca para no publicarlo así. */
export function Fill({ value, label }: { value: string | null; label: string }) {
  if (value) return <>{value}</>;
  return <span className="rounded-sm bg-warning/10 px-1 text-warning">[{label}]</span>;
}

export function ContactEmail() {
  return LEGAL.contactEmail ? (
    <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>
  ) : (
    <Fill value={null} label="email de contacto" />
  );
}

/** Tabla que se desplaza en horizontal en móvil en vez de desbordar la página. */
export function TableScroll({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="region" aria-label="Tabla" tabIndex={0}>
      {children}
    </div>
  );
}

/** Página de texto legal: título, fecha de revisión y aviso si faltan datos. */
export function LegalPage({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <article className="prose prose-sm prose-invert prose-gdd max-w-none prose-headings:font-medium prose-h2:mt-8 prose-h2:mb-2 prose-h2:text-sm prose-lead:text-[15px] prose-lead:leading-relaxed prose-lead:text-muted-foreground prose-table:text-[13px]">
      <h1 className="mb-1 text-base font-medium">{title}</h1>
      <p className="mt-0 text-xs text-muted-foreground">Última actualización: {formatDate(LEGAL.updatedAt)}</p>
      {legalIncomplete && (
        <div className="not-prose my-5 flex gap-2.5 rounded-lg border bg-card p-3 text-xs leading-relaxed text-muted-foreground">
          <TriangleAlert className="mt-px size-3.5 shrink-0 text-warning" aria-hidden />
          <p>
            Faltan los datos del titular (marcados en amarillo; se rellenan en{" "}
            <code className="font-mono text-foreground">src/lib/legal.ts</code>). Estos textos son una base pensada para
            España y la UE: revísalos con un profesional antes de abrir la app al público.
          </p>
        </div>
      )}
      {intro && <p className="lead">{intro}</p>}
      {children}
    </article>
  );
}
