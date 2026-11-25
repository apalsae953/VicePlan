"use client";

import { useState } from "react";
import { ArrowRight, FolderPlus, KeyRound, Loader2, Mail, Sparkles } from "lucide-react";

import { GuestSignOutDialog, SaveAccountDialog } from "@/components/auth/account-dialogs";
import { AccountSettingsDialog } from "@/components/auth/account-settings-dialog";
import { LegalLinks } from "@/components/legal/legal-links";
import { displayNameOf, useAuth, useCurrentUser } from "@/components/auth/auth-provider";
import { useProjects } from "@/components/auth/projects-provider";
import { DashboardSkeleton, DashboardView } from "@/components/dashboard/dashboard-view";
import { Button } from "@/components/ui/button";
import { useProjectCreation } from "@/hooks/use-project-creation";
import { CreateProjectDialog } from "./create-project-dialog";
import { JoinProjectDialog } from "./join-project";

/**
 * Inicio: "Mi panel" con las tareas de todos los proyectos. Sin proyectos,
 * bienvenida con el proyecto de ejemplo, uno vacío o unirse con un código.
 */
export function HomeView() {
  const { status, projects } = useProjects();
  if (status === "loading") return <DashboardSkeleton />;
  if (projects.length > 0) return <DashboardView projects={projects} />;
  return <Welcome failed={status === "error"} />;
}

function Welcome({ failed }: { failed: boolean }) {
  const user = useCurrentUser();
  const { signOut, isGuest } = useAuth();
  const { invitations, accept, decline, canReceiveInvitations } = useProjects();
  const { pending, loadSample } = useProjectCreation();
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [guestSignOutOpen, setGuestSignOutOpen] = useState(false);
  const firstName = isGuest ? null : user.displayName?.split(" ")[0];

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg space-y-8">
        <div className="space-y-1.5">
          <h1 className="text-lg font-medium">{firstName ? `Hola, ${firstName}` : "Te damos la bienvenida"}</h1>
          <p className="text-[13px] text-muted-foreground">
            {failed
              ? "No pudimos leer tus proyectos. Revisa que las reglas de Firestore estén publicadas."
              : "Todavía no tienes proyectos. Empieza con el de ejemplo para explorar la herramienta, o crea el tuyo."}
          </p>
        </div>

        {invitations.length > 0 && (
          <section className="grid gap-2">
            <h2 className="text-xs font-medium text-muted-foreground">Te han invitado</h2>
            {invitations.map((invitation) => (
              <div key={invitation.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background">
                  <Mail className="size-4 text-primary" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{invitation.name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{invitation.key}</p>
                </div>
                <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => void decline(invitation)}>
                  Rechazar
                </Button>
                <Button size="sm" onClick={() => void accept(invitation)}>
                  Unirme
                </Button>
              </div>
            ))}
          </section>
        )}

        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => void loadSample()}
            disabled={pending !== null}
            className="group flex items-start gap-4 rounded-xl border border-primary/30 bg-primary/[0.06] p-4 text-left transition-colors duration-150 hover:border-primary/50 hover:bg-primary/10 disabled:opacity-60"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              {pending === "sample" ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-medium">Cargar proyecto de ejemplo (Project: Aethelgard)</p>
              <p className="text-[13px] text-muted-foreground">
                Un Action RPG con 3 milestones, un GDD de 16 secciones en Markdown y 24 tareas vinculadas.
              </p>
            </div>
            <ArrowRight
              className="mt-2.5 size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5"
              aria-hidden
            />
          </button>

          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            disabled={pending !== null}
            className="group flex items-start gap-4 rounded-xl border bg-card p-4 text-left transition-colors duration-150 hover:border-white/15 disabled:opacity-60"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground">
              <FolderPlus className="size-4" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-medium">Crear un proyecto vacío</p>
              <p className="text-[13px] text-muted-foreground">Elige nombre y clave; el resto lo construyes tú.</p>
            </div>
            <ArrowRight
              className="mt-2.5 size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5"
              aria-hidden
            />
          </button>

          <button
            type="button"
            onClick={() => setJoinOpen(true)}
            className="group flex items-start gap-4 rounded-xl border bg-card p-4 text-left transition-colors duration-150 hover:border-white/15"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground">
              <KeyRound className="size-4" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-medium">Unirme con un código</p>
              <p className="text-[13px] text-muted-foreground">Si tu equipo ya usa VicePlan, pega su código o enlace.</p>
            </div>
            <ArrowRight
              className="mt-2.5 size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5"
              aria-hidden
            />
          </button>
        </div>

        <div className="space-y-1 text-xs text-muted-foreground">
          {isGuest ? (
            <p>
              Estás como <span className="text-foreground">invitado</span>: tus proyectos viven en este navegador.{" "}
              <Button variant="link" size="xs" className="h-auto px-0 text-xs" onClick={() => setSaveOpen(true)}>
                Guardar cuenta
              </Button>{" "}
              ·{" "}
              <Button variant="link" size="xs" className="h-auto px-0 text-xs text-muted-foreground" onClick={() => setAccountOpen(true)}>
                Mi cuenta
              </Button>{" "}
              ·{" "}
              <Button
                variant="link"
                size="xs"
                className="h-auto px-0 text-xs text-muted-foreground"
                onClick={() => setGuestSignOutOpen(true)}
              >
                Salir
              </Button>
            </p>
          ) : (
            <p>
              Sesión iniciada como <span className="text-foreground">{user.email ?? displayNameOf(user)}</span> ·{" "}
              <Button variant="link" size="xs" className="h-auto px-0 text-xs text-muted-foreground" onClick={() => setAccountOpen(true)}>
                Mi cuenta
              </Button>{" "}
              ·{" "}
              <Button variant="link" size="xs" className="h-auto px-0 text-xs text-muted-foreground" onClick={() => void signOut()}>
                Cerrar sesión
              </Button>
            </p>
          )}
          {!isGuest && !canReceiveInvitations && (
            <p>Verifica tu email (enlace en tu bandeja de entrada) para recibir invitaciones a proyectos.</p>
          )}
          <LegalLinks className="pt-3" />
        </div>
      </div>

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
      <JoinProjectDialog open={joinOpen} onOpenChange={setJoinOpen} />
      {isGuest && <SaveAccountDialog open={saveOpen} onOpenChange={setSaveOpen} />}
      <AccountSettingsDialog open={accountOpen} onOpenChange={setAccountOpen} onSaveAccount={() => setSaveOpen(true)} />
      <GuestSignOutDialog
        open={guestSignOutOpen}
        onOpenChange={setGuestSignOutOpen}
        onSaveAccount={() => setSaveOpen(true)}
      />
    </main>
  );
}
