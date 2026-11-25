"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookText, ChartColumn, Milestone, SquareKanban } from "lucide-react";

import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useWorkspaceStore } from "@/stores/workspace-store-provider";
import { CategoryFilter } from "./category-filter";
import { ProjectSwitcher } from "./project-switcher";
import { UserMenu } from "./user-menu";

const NAV_ITEMS = [
  { segment: "board", label: "Tablero", icon: SquareKanban },
  { segment: "gdd", label: "Documento de diseño", icon: BookText },
  { segment: "milestones", label: "Hitos", icon: Milestone },
  { segment: "metrics", label: "Métricas", icon: ChartColumn },
] as const;

export function AppSidebar() {
  const projectId = useWorkspaceStore((s) => s.project.id);
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <ProjectSwitcher />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map(({ segment, label, icon: Icon }) => {
                const href = `/projects/${projectId}/${segment}`;
                return (
                  <SidebarMenuItem key={segment}>
                    <SidebarMenuButton asChild isActive={pathname.startsWith(href)} tooltip={label}>
                      <Link href={href}>
                        <Icon />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <CategoryFilter />
      </SidebarContent>

      <SidebarFooter>
        <dl className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 rounded-lg border border-sidebar-border px-3 py-2.5 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          <dt>Nueva tarea</dt>
          <dd><Kbd>C</Kbd></dd>
          <dt>Paleta de comandos</dt>
          <dd>
            <KbdGroup>
              <Kbd>Ctrl</Kbd>
              <Kbd>K</Kbd>
            </KbdGroup>
          </dd>
          <dt>Mis tareas</dt>
          <dd><Kbd>M</Kbd></dd>
          <dt>Barra lateral</dt>
          <dd>
            <KbdGroup>
              <Kbd>Ctrl</Kbd>
              <Kbd>B</Kbd>
            </KbdGroup>
          </dd>
        </dl>
        <UserMenu />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
