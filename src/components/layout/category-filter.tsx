"use client";

import { useMemo } from "react";
import { Settings2, X } from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { CategoryGlyph } from "@/components/tasks/category-glyph";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspace-store-provider";

/**
 * Filtro rápido por disciplina (multi-selección), con las categorías del
 * proyecto. Afecta al tablero y al progreso del header. Los contadores son del
 * hito visible.
 */
export function CategoryFilter() {
  const tasks = useWorkspaceStore((s) => s.tasks);
  const milestoneId = useWorkspaceStore((s) => s.milestoneId);
  const selected = useWorkspaceStore((s) => s.categoryFilter);
  const toggleCategory = useWorkspaceStore((s) => s.toggleCategory);
  const clearCategories = useWorkspaceStore((s) => s.clearCategories);
  const categories = useWorkspaceStore((s) => s.project.categories);
  const openProjectSettings = useWorkspaceStore((s) => s.openProjectSettings);

  const counts = useMemo(() => {
    const result = new Map<string, number>();
    for (const task of Object.values(tasks)) {
      if (task.milestoneId === milestoneId) result.set(task.category, (result.get(task.category) ?? 0) + 1);
    }
    return result;
  }, [tasks, milestoneId]);

  const filtering = selected.length > 0;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Categorías</SidebarGroupLabel>
      {filtering ? (
        <SidebarGroupAction title="Quitar filtros" onClick={clearCategories}>
          <X />
          <span className="sr-only">Quitar filtros de categoría</span>
        </SidebarGroupAction>
      ) : (
        <SidebarGroupAction title="Gestionar categorías" onClick={() => openProjectSettings("categories")}>
          <Settings2 />
          <span className="sr-only">Gestionar categorías</span>
        </SidebarGroupAction>
      )}
      <SidebarGroupContent>
        <SidebarMenu>
          {categories.map(({ id: value, name: label, color, icon }) => {
            const isSelected = selected.includes(value);
            const count = counts.get(value) ?? 0;
            return (
              <SidebarMenuItem key={value}>
                <SidebarMenuButton
                  isActive={isSelected}
                  aria-pressed={isSelected}
                  tooltip={`${label} · ${count}`}
                  onClick={() => toggleCategory(value)}
                  className={cn(
                    "text-[13px]",
                    filtering && !isSelected && "text-sidebar-foreground/55",
                    !filtering && count === 0 && "text-sidebar-foreground/60",
                  )}
                >
                  <CategoryGlyph
                    icon={icon}
                    style={{ color }}
                    className={cn("transition-opacity", filtering && !isSelected && "opacity-45")}
                    aria-hidden
                  />
                  <span className="truncate">{label}</span>
                </SidebarMenuButton>
                <SidebarMenuBadge className="font-mono text-[11px] text-muted-foreground">
                  {count}
                </SidebarMenuBadge>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
