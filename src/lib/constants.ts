import {
  AudioLines,
  Box,
  Bug,
  Clapperboard,
  ClipboardList,
  CodeXml,
  Feather,
  FileText,
  Gamepad2,
  Gauge,
  Globe,
  Languages,
  Lightbulb,
  Map,
  Megaphone,
  Music,
  Network,
  Palette,
  PanelsTopLeft,
  PersonStanding,
  Shield,
  Sparkles,
  Swords,
  Tag,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import type { MilestoneStatus, TaskPriority, TaskStatus } from "@/lib/domain";
import type { ProjectCategory } from "@/lib/types";

/**
 * Metadatos de presentación de los enums del dominio.
 * Única fuente de verdad para etiquetas, orden, icono y color de cada valor:
 * los componentes leen de aquí en lugar de codificar strings sueltos.
 * `color` es un acento para iconos, puntos y badges tintados sobre fondo
 * oscuro; nunca para rellenar superficies grandes.
 */

type EnumMeta<T extends string> = {
  value: T;
  label: string;
  color: string;
};

/**
 * Columnas del tablero, en orden. En curso / En pruebas / Hecho son también una
 * paleta categórica de gráficos (barra segmentada de Métricas), validada con
 * dataviz/validate_palette en modo oscuro sobre `--card`: banda L 0.48–0.67,
 * croma ≥ 0.10, CVD ΔE ≥ 10.8, visión normal ΔE ≥ 19. Por hacer es el gris
 * neutro (en los gráficos, el carril sin rellenar). No cambiar sin revalidar.
 */
export const TASK_STATUSES = [
  { value: "TODO", label: "Por hacer", color: "#8a8f98" },
  { value: "IN_PROGRESS", label: "En curso", color: "#bc8a27" },
  { value: "TESTING", label: "En pruebas", color: "#14907a" },
  { value: "DONE", label: "Hecho", color: "#5e6ad2" },
] as const satisfies ReadonlyArray<EnumMeta<TaskStatus>>;

/** De mayor a menor urgencia (orden de los selectores). */
export const TASK_PRIORITIES = [
  { value: "CRITICAL", label: "Crítica", color: "#f2994a" },
  { value: "HIGH", label: "Alta", color: "#d0d6e0" },
  { value: "MEDIUM", label: "Media", color: "#d0d6e0" },
  { value: "LOW", label: "Baja", color: "#d0d6e0" },
] as const satisfies ReadonlyArray<EnumMeta<TaskPriority>>;

export const MILESTONE_STATUSES = [
  { value: "ACTIVE", label: "En curso", color: "#5e6ad2" },
  { value: "PLANNED", label: "Planificado", color: "#8a8f98" },
  { value: "COMPLETED", label: "Completado", color: "#4cb782" },
] as const satisfies ReadonlyArray<EnumMeta<MilestoneStatus>>;

function indexBy<T extends { value: string }>(items: readonly T[]) {
  return Object.fromEntries(items.map((item) => [item.value, item])) as Record<T["value"], T>;
}

export const STATUS_META = indexBy(TASK_STATUSES);
export const PRIORITY_META = indexBy(TASK_PRIORITIES);
export const MILESTONE_STATUS_META = indexBy(MILESTONE_STATUSES);

/** Separación entre posiciones consecutivas (índice fraccional en Task/GddNode). */
export const POSITION_STEP = 1000;

// ─── Categorías (disciplinas) ────────────────────────────────────────────────

/**
 * Colores permitidos para las categorías: acentos medios pensados para puntos,
 * iconos y badges tintados sobre `#0f1011`. Las categorías personalizadas solo
 * pueden elegir de esta lista.
 */
export const CATEGORY_COLORS = [
  { value: "#4ea7fc", label: "Azul" },
  { value: "#26b5ce", label: "Cian" },
  { value: "#2fc4b2", label: "Turquesa" },
  { value: "#4cb782", label: "Verde" },
  { value: "#a3c95b", label: "Lima" },
  { value: "#e9a23b", label: "Ámbar" },
  { value: "#f2994a", label: "Naranja" },
  { value: "#eb5757", label: "Rojo" },
  { value: "#f26ca7", label: "Rosa" },
  { value: "#c084fc", label: "Lila" },
  { value: "#a78bfa", label: "Violeta" },
  { value: "#8a8f98", label: "Gris" },
] as const;

/** Iconos elegibles para una categoría (clave guardada en Firestore → componente). */
export const CATEGORY_ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  code: { icon: CodeXml, label: "Código" },
  palette: { icon: Palette, label: "Arte" },
  box: { icon: Box, label: "3D" },
  clapperboard: { icon: Clapperboard, label: "Animación" },
  gamepad: { icon: Gamepad2, label: "Jugabilidad" },
  swords: { icon: Swords, label: "Combate" },
  map: { icon: Map, label: "Niveles" },
  feather: { icon: Feather, label: "Narrativa" },
  person: { icon: PersonStanding, label: "Personajes" },
  audio: { icon: AudioLines, label: "Audio" },
  music: { icon: Music, label: "Música" },
  panels: { icon: PanelsTopLeft, label: "Interfaz" },
  sparkles: { icon: Sparkles, label: "Efectos" },
  bug: { icon: Bug, label: "Errores" },
  shield: { icon: Shield, label: "Calidad" },
  gauge: { icon: Gauge, label: "Rendimiento" },
  network: { icon: Network, label: "Online" },
  wrench: { icon: Wrench, label: "Herramientas" },
  languages: { icon: Languages, label: "Localización" },
  globe: { icon: Globe, label: "Web" },
  megaphone: { icon: Megaphone, label: "Marketing" },
  clipboard: { icon: ClipboardList, label: "Producción" },
  document: { icon: FileText, label: "Documentación" },
  lightbulb: { icon: Lightbulb, label: "Ideas" },
  tag: { icon: Tag, label: "Genérico" },
};

/**
 * Categorías de serie de un proyecto nuevo. Las seis primeras conservan los
 * ids históricos (las tareas antiguas siguen encajando sin migrar nada).
 */
export const DEFAULT_CATEGORIES: ProjectCategory[] = [
  { id: "PROGRAMMING", name: "Programación", color: "#4ea7fc", icon: "code" },
  { id: "ART", name: "Arte", color: "#f26ca7", icon: "palette" },
  { id: "ANIMATION", name: "Animación", color: "#26b5ce", icon: "clapperboard" },
  { id: "DESIGN", name: "Diseño de juego", color: "#e9a23b", icon: "gamepad" },
  { id: "NARRATIVE", name: "Narrativa", color: "#4cb782", icon: "feather" },
  { id: "AUDIO", name: "Audio", color: "#2fc4b2", icon: "audio" },
  { id: "UI_UX", name: "Interfaz (UI/UX)", color: "#a78bfa", icon: "panels" },
  { id: "VFX", name: "Efectos visuales", color: "#f2994a", icon: "sparkles" },
  { id: "QA", name: "Control de calidad", color: "#eb5757", icon: "bug" },
  { id: "PRODUCTION", name: "Producción", color: "#8a8f98", icon: "clipboard" },
];

/** Categoría que ya no existe en el proyecto (se borró): gris y genérica. */
export const UNKNOWN_CATEGORY: ProjectCategory = { id: "", name: "Sin categoría", color: "#8a8f98", icon: "tag" };

export const MAX_CATEGORIES = 30;

export function categoryIcon(icon: string): LucideIcon {
  return CATEGORY_ICONS[icon]?.icon ?? Tag;
}

/** Busca una categoría por id, con respaldo para las borradas. */
export function findCategory(categories: ProjectCategory[], id: string) {
  return categories.find((category) => category.id === id) ?? UNKNOWN_CATEGORY;
}
