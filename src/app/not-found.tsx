import Link from "next/link";
import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
      <SearchX className="size-5 text-muted-foreground" aria-hidden />
      <h1 className="text-sm font-medium">No encontramos esta página</h1>
      <p className="max-w-sm text-[13px] text-muted-foreground">
        Puede que el proyecto ya no exista (por ejemplo, tras volver a cargar los datos de demo).
      </p>
      <Button asChild size="sm" variant="secondary" className="mt-1">
        <Link href="/">Ir al último proyecto</Link>
      </Button>
    </main>
  );
}
