import Link from "next/link";
import { SquareKanban } from "lucide-react";

import { LegalLinks } from "@/components/legal/legal-links";

/** Textos legales: públicos (sin sesión), estáticos y legibles en móvil. */
export default function LegalLayout({ children }: LayoutProps<"/legal">) {
  return (
    <div className="flex min-h-svh flex-1 flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-12 w-full max-w-3xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-md text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <span className="flex size-6 items-center justify-center rounded-md border bg-card">
              <SquareKanban className="size-3.5 text-primary" aria-hidden />
            </span>
            VicePlan
          </Link>
          <LegalLinks className="hidden sm:flex" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">{children}</main>
      <footer className="border-t">
        <div className="mx-auto w-full max-w-3xl px-4 py-4 sm:px-6">
          <LegalLinks />
        </div>
      </footer>
    </div>
  );
}
