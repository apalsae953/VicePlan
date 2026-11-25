import { createElement } from "react";
import type { LucideProps } from "lucide-react";

import { categoryIcon } from "@/lib/constants";

/**
 * Icono de una categoría a partir de su clave guardada en Firestore. Los
 * iconos son componentes estáticos de lucide; createElement evita declarar
 * un "componente nuevo" en cada render.
 */
export function CategoryGlyph({ icon, ...props }: { icon: string } & LucideProps) {
  return createElement(categoryIcon(icon), props);
}
