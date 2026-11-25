"use client";

import { useState, useTransition } from "react";
import { Copy, KeyRound, Link2, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { useCurrentUser } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { firestoreErrorMessage } from "@/lib/firestore/errors";
import { createInviteCode, disableInviteCode, formatInviteCode, inviteLink } from "@/lib/firestore/invites";
import { useWorkspaceStore } from "@/stores/workspace-store-provider";

/**
 * Invitar con código o enlace (/unirse/CÓDIGO): para compartir por Discord o
 * WhatsApp sin saber el email de nadie. Renovarlo invalida el anterior.
 */
export function InviteCodeSection() {
  const user = useCurrentUser();
  const project = useWorkspaceStore((s) => s.project);
  const [pending, startTransition] = useTransition();
  const [action, setAction] = useState<"create" | "disable" | null>(null);
  const code = project.inviteCode;

  function run(kind: "create" | "disable") {
    setAction(kind);
    startTransition(async () => {
      try {
        if (kind === "create") {
          const next = await createInviteCode(project.id, project.name, user.uid, code);
          toast.success(code ? "Código renovado" : "Código creado", {
            description: `${formatInviteCode(next)} · el anterior deja de funcionar.`,
          });
        } else if (code) {
          await disableInviteCode(project.id, code);
          toast("Código desactivado", { description: "Ya nadie puede unirse con él." });
        }
      } catch (error) {
        toast.error(firestoreErrorMessage(error, "No se pudo actualizar el código"));
      } finally {
        setAction(null);
      }
    });
  }

  function copy(text: string, what: string) {
    void navigator.clipboard
      ?.writeText(text)
      .then(() => toast.success(`${what} copiado`))
      .catch(() => toast.error("No se pudo copiar"));
  }

  return (
    <section className="grid gap-2 rounded-lg border bg-card/40 p-3">
      <div className="flex items-center gap-2">
        <KeyRound className="size-4 text-muted-foreground" aria-hidden />
        <h3 className="text-[13px] font-medium">Código de invitación</h3>
      </div>
      {code ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border bg-background px-2.5 py-1 font-mono text-base tracking-[0.18em] tabular-nums select-all">
              {formatInviteCode(code)}
            </span>
            <Button size="xs" variant="outline" className="gap-1" onClick={() => copy(formatInviteCode(code), "Código")}>
              <Copy /> Copiar código
            </Button>
            <Button size="xs" variant="outline" className="gap-1" onClick={() => copy(inviteLink(code), "Enlace")}>
              <Link2 /> Copiar enlace
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Quien tenga el código o el enlace entra como miembro, también con una cuenta de invitado.
          </p>
          <div className="flex gap-1.5">
            <Button size="xs" variant="ghost" className="gap-1 text-muted-foreground" disabled={pending} onClick={() => run("create")}>
              {pending && action === "create" ? <Loader2 className="animate-spin" /> : <RefreshCw />} Renovar
            </Button>
            <Button
              size="xs"
              variant="ghost"
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              disabled={pending}
              onClick={() => run("disable")}
            >
              {pending && action === "disable" && <Loader2 className="animate-spin" />} Desactivar
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">Crea un código para que tu equipo se una sin invitación por email.</p>
          <Button size="xs" className="gap-1" disabled={pending} onClick={() => run("create")}>
            {pending && <Loader2 className="animate-spin" />} Crear código
          </Button>
        </div>
      )}
    </section>
  );
}
