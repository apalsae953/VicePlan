"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronsUpDown, FolderPlus, KeyRound, LayoutDashboard, Mail, Settings2, Sparkles, UserPlus, X } from "lucide-react";

import { useProjects } from "@/components/auth/projects-provider";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { useProjectCreation } from "@/hooks/use-project-creation";
import { useWorkspaceStore } from "@/stores/workspace-store-provider";
import { ProjectAvatar } from "./project-avatar";

export function ProjectSwitcher() {
  const { isMobile } = useSidebar();
  const { projects, invitations, accept, decline } = useProjects();
  const project = useWorkspaceStore((s) => s.project);
  const tasks = useWorkspaceStore((s) => s.tasks);
  const openProjectSettings = useWorkspaceStore((s) => s.openProjectSettings);
  const setJoinOpen = useWorkspaceStore((s) => s.setJoinOpen);
  const { loadSample, pending } = useProjectCreation();
  const [createOpen, setCreateOpen] = useState(false);
  const [createKey, setCreateKey] = useState(0);

  // Contador en vivo: refleja los cambios del tablero (también los de otros miembros).
  const openTasks = useMemo(
    () => Object.values(tasks).filter((task) => task.status !== "DONE").length,
    [tasks],
  );

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              tooltip={project.name}
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <span className="relative">
                <ProjectAvatar
                  projectKey={project.key}
                  projectId={project.id}
                  logo={project.logo}
                  className="size-8 rounded-lg text-sm"
                />
                {invitations.length > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary ring-2 ring-sidebar"
                    aria-label={`${invitations.length} invitaciones pendientes`}
                  />
                )}
              </span>
              <span className="grid min-w-0 flex-1 text-left leading-tight">
                <span className="truncate text-[13px] font-medium">{project.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {openTasks} {openTasks === 1 ? "tarea abierta" : "tareas abiertas"}
                </span>
              </span>
              <ChevronsUpDown className="ml-auto text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side={isMobile ? "bottom" : "right"} sideOffset={6} className="w-72">
            {invitations.length > 0 && (
              <>
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Invitaciones</DropdownMenuLabel>
                {invitations.map((invitation) => (
                  <div key={invitation.id} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px]">
                    <Mail className="size-4 shrink-0 text-primary" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{invitation.name}</span>
                    <Button size="xs" onClick={() => void accept(invitation)}>
                      Unirme
                    </Button>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      className="text-muted-foreground"
                      aria-label={`Rechazar la invitación a ${invitation.name}`}
                      onClick={() => void decline(invitation)}
                    >
                      <X />
                    </Button>
                  </div>
                ))}
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem asChild>
              <Link href="/" className="gap-2.5">
                <LayoutDashboard /> Mi panel
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Proyectos</DropdownMenuLabel>
            {projects.map((item) => (
              <DropdownMenuItem key={item.id} asChild>
                <Link href={`/projects/${item.id}/board`} className="gap-2.5">
                  <ProjectAvatar projectKey={item.key} projectId={item.id} logo={item.logo} className="size-5 text-[10px]" />
                  <span className="truncate">{item.name}</span>
                  {item.id === project.id ? (
                    <Check className="ml-auto" aria-label="Proyecto actual" />
                  ) : (
                    <span className="ml-auto font-mono text-[11px] text-muted-foreground">{item.key}</span>
                  )}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => openProjectSettings("members")}>
              <UserPlus /> Invitar al equipo
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openProjectSettings("general")}>
              <Settings2 /> Configuración del proyecto
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                setCreateKey((key) => key + 1);
                setCreateOpen(true);
              }}
            >
              <FolderPlus /> Nuevo proyecto
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setJoinOpen(true)}>
              <KeyRound /> Unirme con un código…
            </DropdownMenuItem>
            <DropdownMenuItem disabled={pending !== null} onSelect={() => void loadSample()}>
              <Sparkles /> Cargar proyecto de ejemplo
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <CreateProjectDialog key={createKey} open={createOpen} onOpenChange={setCreateOpen} />
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
