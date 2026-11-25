"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authErrorMessage, isAuthCancel, saveGuestWithEmail, saveGuestWithGoogle } from "@/lib/auth";
import { newPasswordError } from "@/lib/password";
import { useAuth, useCurrentUser } from "./auth-provider";
import { GoogleIcon } from "./google-icon";
import { PasswordChecklist, PasswordInput } from "./password-field";

/**
 * Convierte la sesión de invitado en una cuenta (Google o email) sin cambiar
 * de uid: proyectos, tareas y GDD siguen siendo suyos.
 */
export function SaveAccountDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const user = useCurrentUser();
  const { refresh } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"google" | "email" | null>(null);
  const [, startTransition] = useTransition();

  function run(kind: "google" | "email", action: () => Promise<unknown>) {
    setError(null);
    setPending(kind);
    startTransition(async () => {
      try {
        await action();
        await refresh();
        toast.success("Cuenta guardada", {
          description:
            kind === "email" ? "Te hemos enviado un email para verificarla." : "Ya puedes entrar con Google desde cualquier sitio.",
        });
        onOpenChange(false);
      } catch (err) {
        if (!isAuthCancel(err)) setError(authErrorMessage(err, "No se pudo guardar la cuenta."));
      } finally {
        setPending(null);
      }
    });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) return setError("Escribe tu email.");
    const problem = newPasswordError(password, confirm);
    if (problem) return setError(problem);
    run("email", () => saveGuestWithEmail(user, name, email, password));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle className="text-sm">Guarda tu cuenta</DialogTitle>
          <DialogDescription className="text-[13px]">
            Conserva tus proyectos y entra desde cualquier dispositivo. También podrán invitarte a otros proyectos.
          </DialogDescription>
        </DialogHeader>

        <Button
          type="button"
          variant="outline"
          className="h-9 w-full gap-2.5"
          disabled={pending !== null}
          onClick={() => run("google", () => saveGuestWithGoogle(user))}
        >
          {pending === "google" ? <Loader2 className="animate-spin" /> : <GoogleIcon />}
          Continuar con Google
        </Button>

        <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden>
          <span className="h-px flex-1 bg-border" />o con email<span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-3" noValidate>
          <div className="grid gap-1.5">
            <Label htmlFor="save-name" className="text-xs text-muted-foreground">
              Nombre
            </Label>
            <Input id="save-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="h-8" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="save-email" className="text-xs text-muted-foreground">
              Email
            </Label>
            <Input
              id="save-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-8"
              placeholder="tu@estudio.com"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="save-password" className="text-xs text-muted-foreground">
              Contraseña
            </Label>
            <PasswordInput id="save-password" value={password} onChange={setPassword} autoComplete="new-password" className="h-8" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="save-password-confirm" className="text-xs text-muted-foreground">
              Repite la contraseña
            </Label>
            <PasswordInput
              id="save-password-confirm"
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
              className="h-8"
              invalid={confirm.length > 0 && confirm !== password}
            />
          </div>
          <PasswordChecklist password={password} confirm={confirm} />
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="sm" className="w-full" disabled={pending !== null}>
            {pending === "email" && <Loader2 className="animate-spin" />}
            Guardar cuenta
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Cerrar sesión siendo invitado pierde el acceso a sus proyectos: se avisa antes. */
export function GuestSignOutDialog({
  open,
  onOpenChange,
  onSaveAccount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveAccount: () => void;
}) {
  const { signOut } = useAuth();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-sm">¿Salir de la sesión de invitado?</AlertDialogTitle>
          <AlertDialogDescription className="text-[13px]">
            Los proyectos de invitado solo se pueden abrir desde esta sesión. Si sales sin guardar tu cuenta, perderás el
            acceso a ellos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel size="sm">Cancelar</AlertDialogCancel>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onOpenChange(false);
              onSaveAccount();
            }}
          >
            Guardar cuenta
          </Button>
          <AlertDialogAction
            size="sm"
            variant="destructive"
            onClick={() => void signOut().catch(() => toast.error("No se pudo cerrar la sesión."))}
          >
            Salir igualmente
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
