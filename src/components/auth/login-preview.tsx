import { CategoryGlyph } from "@/components/tasks/category-glyph";
import { DEFAULT_CATEGORIES, findCategory, STATUS_META } from "@/lib/constants";
import type { TaskCategory, TaskStatus } from "@/lib/domain";

type PreviewCard = { id: string; title: string; category: TaskCategory; hours: string };

const COLUMNS: { status: TaskStatus; cards: PreviewCard[] }[] = [
  {
    status: "TODO",
    cards: [
      { id: "AET-5", title: "Parry con ventana de 150 ms y stagger", category: "PROGRAMMING", hours: "8h" },
      { id: "AET-13", title: "Tema musical de la cripta con capas adaptativas", category: "AUDIO", hours: "14h" },
    ],
  },
  {
    status: "IN_PROGRESS",
    cards: [
      { id: "AET-4", title: "Sistema de combos de espada (3 golpes + finisher)", category: "PROGRAMMING", hours: "7/12h" },
      { id: "AET-7", title: "Modelo 3D de Kael: retopología y UVs", category: "ART", hours: "11/20h" },
    ],
  },
  {
    status: "TESTING",
    cards: [
      { id: "AET-10", title: "Balanceo de la curva de daño (niveles 1–5)", category: "DESIGN", hours: "4/6h" },
      { id: "AET-14", title: "HUD diegético: vida y stamina en el brazal", category: "UI_UX", hours: "7/6h" },
    ],
  },
];

/**
 * Vista previa decorativa del tablero en la pantalla de acceso (solo en
 * pantallas anchas). Es estática y oculta para lectores de pantalla.
 */
export function LoginPreview() {
  return (
    <aside aria-hidden className="relative hidden overflow-hidden border-l bg-card lg:block">
      <div className="absolute inset-y-0 left-12 right-0 flex flex-col justify-center">
        <div className="mb-6 max-w-sm space-y-1.5">
          <p className="text-[13px] font-medium text-foreground">Del GDD a la build, en un solo tablero</p>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Tablero por hito, tareas por disciplina, horas frente a estimación y un documento de diseño enlazado a
            cada tarea. En tiempo real con tu equipo.
          </p>
        </div>

        <div className="-mr-24 rounded-l-xl border border-r-0 bg-background">
          <div className="flex h-10 items-center gap-3 border-b px-4 text-xs">
            <span className="size-2 rounded-full" style={{ background: STATUS_META.DONE.color }} />
            <span className="font-medium text-foreground">Vertical Slice v0.2</span>
            <span className="text-muted-foreground">12 días restantes</span>
            <span className="ml-2 h-1 w-24 overflow-hidden rounded-full bg-muted">
              <span className="block h-full w-[22%] rounded-full bg-primary" />
            </span>
            <span className="font-mono text-muted-foreground tabular-nums">28/125h</span>
          </div>
          <div className="flex gap-3 p-4">
            {COLUMNS.map((column) => {
              const status = STATUS_META[column.status];
              return (
                <div key={column.status} className="w-60 shrink-0 space-y-2">
                  <div className="flex items-center gap-2 px-1 pb-1 text-xs">
                    <span className="size-2 rounded-full" style={{ background: status.color }} />
                    <span className="font-medium text-foreground">{status.label}</span>
                    <span className="text-muted-foreground tabular-nums">{column.cards.length}</span>
                  </div>
                  {column.cards.map((card) => {
                    const category = findCategory(DEFAULT_CATEGORIES, card.category);
                    return (
                      <div key={card.id} className="space-y-2.5 rounded-lg border bg-card p-3">
                        <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
                          <span>{card.id}</span>
                          <span className="tabular-nums">{card.hours}</span>
                        </div>
                        <p className="text-[13px] leading-snug text-foreground">{card.title}</p>
                        <span className="inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[11px] text-muted-foreground">
                          <CategoryGlyph icon={category.icon} className="size-3" style={{ color: category.color }} />
                          {category.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
