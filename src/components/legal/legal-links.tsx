import Link from "next/link";
import type { ReactNode } from "react";

import { LEGAL_LINKS } from "@/lib/legal";
import { cn } from "@/lib/utils";

/** Enlaces a los textos legales (pie del acceso, de Mi panel y de Mi cuenta). */
export function LegalLinks({ className }: { className?: string }) {
  return (
    <nav aria-label="Información legal" className={cn("flex flex-wrap gap-x-3 gap-y-1", className)}>
      {LEGAL_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="rounded-sm text-xs text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

/** Enlace legal dentro de un texto (se abre en otra pestaña para no perder el formulario). */
export function LegalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      target="_blank"
      className="rounded-sm text-foreground/85 underline underline-offset-2 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {children}
    </Link>
  );
}
