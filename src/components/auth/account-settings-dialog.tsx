"use client";

import { useMemo, useState, useTransition, type FormEvent, type ReactNode } from "react";
import {
  Check,
  CloudUpload,
  Download,
  KeyRound,
  Loader2,
  MailCheck,
  MailWarning,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { LegalLinks } from "@/components/legal/legal-links";
import { MemberAvatar } from "@/components/members/member-avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  authErrorMessage,
  deleteAuthAccount,
  isAuthCancel,
  reauthenticate,
  resendVerification,
  sendPasswordReset,
  setAccountPassword,
  signInMethods,
  updateDisplayName,
} from "@/lib/auth";
import { clearLocalCache } from "@/lib/firebase";
import { deleteMyData, exportMyData, type OwnedProjectPlan } from "@/lib/firestore/account";
import { firestoreErrorMessage } from "@/lib/firestore/errors";
import { memberDisplayName } from "@/lib/firestore/mappers";
import { newPasswordError } from "@/lib/password";
import { cn } from "@/lib/utils";
import { displayNameOf, useAuth, useCurrentUser } from "./auth-provider";
import { GoogleIcon } from "./google-icon";
import { PasswordChecklist, PasswordInput } from "./password-field";
import { useProjects } from "./projects-provider";

type Tab = "profile" | "security" | "privacy";

const TABS: { value: Tab; label: string; icon: typeof UserRound }[] = [
  { value: "profile", label: "Perfil", icon: UserRound },
  { value: "security", label: "Seguridad", icon: KeyRound },
  { value: "privacy", label: "Datos y privacidad", icon: ShieldCheck },
];

/** "Mi cuenta": perfil, contraseña, descargar mis datos y borrar la cuenta. */
export function AccountSettingsDialog({
  open,
  onOpenChange,
  onSaveAccount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Abre "Guarda tu cuenta" (solo invitados). */
  onSaveAccount: () => void;
}) {
  const [tab, setTab] = useState<Tab>("profile");
  const [deleting, setDeleting] = useState(false);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[min(680px,calc(100svh-2rem))] grid-rows-[auto_auto_minmax(0,1fr)] gap-0 p-0 sm:max-w-lg">
          <DialogHeader className="gap-1 px-5 pt-5 pb-3">
            <DialogTitle className="text-sm">Mi cuenta</DialogTitle>
            <DialogDescription className="text-[13px]">Tu perfil, tu acceso y tus datos.</DialogDescription>
          </DialogHeader>
          <div role="tablist" aria-label="Secciones" className="flex gap-1 overflow-x-auto border-b px-4">
            {TABS.map((item) => {
              const Icon = item.icon;
              const active = tab === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(item.value)}
                  className={cn(
                    "-mb-px flex h-9 shrink-0 items-center gap-1.5 border-b-2 px-2 text-[13px] outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring/50",
                    active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5" aria-hidden />
                  {item.label}
                </button>
              );
            })}
          </div>
          <div className="min-h-0 overflow-y-auto px-5 py-4">
            {tab === "profile" && (
              <ProfileTab
                onSaveAccount={() => {
                  onOpenChange(false);
                  onSaveAccount();
                }}
              />
            )}
            {tab === "security" && <SecurityTab />}
            {tab === "privacy" && <PrivacyTab onDelete={() => setDeleting(true)} />}
          </div>
        </DialogContent>
      </Dialog>
      {deleting && <DeleteAccountDialog onClose={() => setDeleting(false)} />}
    </>
  );
}

// ─── Perfil ──────────────────────────────────────────────────────────────────

function ProfileTab({ onSaveAccount }: { onSaveAccount: () => void }) {
  const user = useCurrentUser();
  const { isGuest, refresh } = useAuth();
  const methods = signInMethods(user);
  const [name, setName] = useState(user.displayName ?? "");
  const [saving, startSaving] = useTransition();
  const [checking, startChecking] = useTransition();
  const changed = name.trim() !== (user.displayName ?? "");

  function saveName(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return void toast.error("Escribe un nombre");
    startSaving(async () => {
      try {
        await updateDisplayName(user, name);
        await refresh();
        toast.success("Nombre actualizado", { description: "Tu equipo lo verá en todos tus proyectos." });
      } catch (error) {
        toast.error(authErrorMessage(error, "No se pudo guardar el nombre."));
      }
    });
  }

  function resend() {
    void resendVerification(user)
      .then(() => toast.success("Email de verificación enviado", { description: "Si no llega, mira en spam." }))
      .catch((error) => toast.error(authErrorMessage(error, "No se pudo enviar el email.")));
  }

  function checkVerified() {
    startChecking(async () => {
      await refresh();
      if (user.emailVerified) toast.success("Email verificado");
      else toast("Todavía no está verificado", { description: "Abre el enlace del email y vuelve a comprobarlo." });
    });
  }

  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-3">
        <MemberAvatar
          size="lg"
          name={user.isAnonymous ? null : user.displayName}
          email={user.email}
          photoURL={user.photoURL}
        />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[13px]">{displayNameOf(user)}</p>
          <p className="truncate text-xs text-muted-foreground">{isGuest ? "Sesión de invitado" : user.email}</p>
        </div>
      </div>

      {isGuest ? (
        <div className="grid gap-3 rounded-lg border bg-card p-3 text-[13px] text-muted-foreground">
          <p>
            Tu sesión de invitado solo vive en este navegador. Guarda la cuenta con Google o con email para no perder tus
            proyectos, entrar desde otros dispositivos y poder recuperarla.
          </p>
          <Button type="button" size="sm" className="w-fit gap-1.5" onClick={onSaveAccount}>
            <CloudUpload /> Guardar cuenta
          </Button>
        </div>
      ) : (
        <form onSubmit={saveName} className="grid gap-1.5">
          <Label htmlFor="account-name" className="text-xs text-muted-foreground">
            Nombre
          </Label>
          <div className="flex gap-2">
            <Input
              id="account-name"
              autoComplete="name"
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8"
            />
            <Button type="submit" size="sm" disabled={!changed || saving} className="shrink-0">
              {saving && <Loader2 className="animate-spin" />}
              Guardar
            </Button>
          </div>
        </form>
      )}

      {!isGuest && user.email && (
        <section className="grid gap-1.5">
          <h3 className="text-xs text-muted-foreground">Email</h3>
          <div className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-[13px]">{user.email}</span>
            {user.emailVerified ? (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MailCheck className="size-3.5 text-primary" aria-hidden /> Verificado
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-warning">
                <MailWarning className="size-3.5" aria-hidden /> Sin verificar
              </span>
            )}
          </div>
          {!user.emailVerified && (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="xs" onClick={resend}>
                Reenviar verificación
              </Button>
              <Button type="button" variant="ghost" size="xs" onClick={checkVerified} disabled={checking}>
                {checking ? <Loader2 className="animate-spin" /> : <RefreshCw />} Ya lo he verificado
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Verificarlo te permite recuperar la cuenta si olvidas la contraseña y recibir invitaciones a proyectos.
          </p>
        </section>
      )}

      <section className="grid gap-1.5">
        <h3 className="text-xs text-muted-foreground">Métodos de acceso</h3>
        <ul className="grid divide-y rounded-lg border">
          <MethodRow icon={<GoogleIcon />} label="Google" active={methods.google} />
          <MethodRow
            icon={<KeyRound className="size-4 text-muted-foreground" aria-hidden />}
            label="Email y contraseña"
            active={methods.password}
          />
          {methods.guest && (
            <MethodRow icon={<UserRound className="size-4 text-muted-foreground" aria-hidden />} label="Invitado" active />
          )}
        </ul>
      </section>
    </div>
  );
}

function MethodRow({ icon, label, active }: { icon: ReactNode; label: string; active: boolean }) {
  return (
    <li className="flex items-center gap-2.5 px-3 py-2 text-[13px]">
      {icon}
      <span className={cn("flex-1", !active && "text-muted-foreground")}>{label}</span>
      {active ? (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Check className="size-3.5 text-primary" aria-hidden /> Activo
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">No vinculado</span>
      )}
    </li>
  );
}

// ─── Seguridad ───────────────────────────────────────────────────────────────

function SecurityTab() {
  const user = useCurrentUser();
  const { isGuest, refresh } = useAuth();
  const methods = signInMethods(user);
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (isGuest) {
    return (
      <p className="text-[13px] text-muted-foreground">
        Las sesiones de invitado no tienen contraseña. Guarda tu cuenta (en Perfil) para poder entrar con Google o con
        email y contraseña.
      </p>
    );
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (methods.password && !current) return setError("Escribe tu contraseña actual.");
    const problem = newPasswordError(password, confirm);
    if (problem) return setError(problem);
    if (methods.password && current === password) return setError("La contraseña nueva tiene que ser distinta.");
    setError(null);
    startTransition(async () => {
      try {
        await setAccountPassword(user, password, methods.password ? current : undefined);
        await refresh();
        setCurrent("");
        setPassword("");
        setConfirm("");
        toast.success(methods.password ? "Contraseña cambiada" : "Contraseña añadida", {
          description: methods.password ? undefined : "Ya puedes entrar también con tu email y esta contraseña.",
        });
      } catch (err) {
        if (!isAuthCancel(err)) setError(authErrorMessage(err, "No se pudo cambiar la contraseña."));
      }
    });
  }

  function forgot() {
    if (!user.email) return;
    void sendPasswordReset(user.email)
      .then(() => toast.success("Te hemos enviado un enlace", { description: `${user.email} · mira también en spam.` }))
      .catch((err) => toast.error(authErrorMessage(err, "No se pudo enviar el email.")));
  }

  return (
    <div className="grid gap-5">
      <form onSubmit={submit} className="grid gap-3" noValidate>
        <div className="space-y-1">
          <h3 className="text-[13px] font-medium">{methods.password ? "Cambiar contraseña" : "Añadir una contraseña"}</h3>
          {!methods.password && (
            <p className="text-xs text-muted-foreground">
              Entras con Google. Si añades una contraseña, también podrás entrar con {user.email} y ella.
            </p>
          )}
        </div>
        {methods.password && (
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="current-password" className="text-xs text-muted-foreground">
                Contraseña actual
              </Label>
              <button
                type="button"
                onClick={forgot}
                className="rounded-sm text-xs text-muted-foreground underline-offset-2 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                ¿No la recuerdas?
              </button>
            </div>
            <PasswordInput
              id="current-password"
              value={current}
              onChange={setCurrent}
              autoComplete="current-password"
              className="h-8"
            />
          </div>
        )}
        <div className="grid gap-1.5">
          <Label htmlFor="new-password" className="text-xs text-muted-foreground">
            Contraseña nueva
          </Label>
          <PasswordInput id="new-password" value={password} onChange={setPassword} autoComplete="new-password" className="h-8" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="new-password-confirm" className="text-xs text-muted-foreground">
            Repite la contraseña nueva
          </Label>
          <PasswordInput
            id="new-password-confirm"
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
        <Button type="submit" size="sm" className="w-fit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {methods.password ? "Cambiar contraseña" : "Añadir contraseña"}
        </Button>
      </form>

      <p className="flex gap-2 border-t pt-4 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-px size-3.5 shrink-0" aria-hidden />
        Las contraseñas las guarda Firebase Authentication cifradas con un hash: nadie puede verlas, tampoco quien
        administra ControlTrabajo. Al cambiarla, las demás sesiones abiertas se cierran en menos de una hora.
      </p>
    </div>
  );
}

// ─── Datos y privacidad ──────────────────────────────────────────────────────

function PrivacyTab({ onDelete }: { onDelete: () => void }) {
  const user = useCurrentUser();
  const [exporting, startExport] = useTransition();

  function download() {
    startExport(async () => {
      try {
        const data = await exportMyData(user);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `controltrabajo-mis-datos-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success("Datos descargados");
      } catch (error) {
        toast.error(firestoreErrorMessage(error, "No se pudieron descargar tus datos"));
      }
    });
  }

  return (
    <div className="grid gap-5">
      <section className="grid gap-2">
        <h3 className="text-[13px] font-medium">Descargar mis datos</h3>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Un archivo JSON con tu cuenta, tu perfil, los proyectos en los que estás, las tareas que creaste o tienes
          asignadas, tus comentarios y tu actividad.
        </p>
        <Button type="button" variant="outline" size="sm" className="w-fit gap-1.5" onClick={download} disabled={exporting}>
          {exporting ? <Loader2 className="animate-spin" /> : <Download />}
          Descargar (JSON)
        </Button>
      </section>

      <section className="grid gap-2">
        <h3 className="text-[13px] font-medium">Tus derechos</h3>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Puedes acceder a tus datos, corregirlos, llevártelos o borrarlos cuando quieras desde aquí. Más detalles en la
          política de privacidad.
        </p>
        <LegalLinks />
      </section>

      <section className="grid gap-2 rounded-lg border border-destructive/30 p-3">
        <h3 className="text-[13px] font-medium">Eliminar mi cuenta</h3>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Borra tu cuenta, tu perfil, tus comentarios y tus proyectos (o los transfiere a otro miembro). No se puede
          deshacer.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 /> Eliminar cuenta…
        </Button>
      </section>
    </div>
  );
}

// ─── Eliminar cuenta ─────────────────────────────────────────────────────────

const CONFIRM_WORD = "ELIMINAR";

function DeleteAccountDialog({ onClose }: { onClose: () => void }) {
  const user = useCurrentUser();
  const { projects } = useProjects();
  const methods = signInMethods(user);
  const [password, setPassword] = useState("");
  const [confirmWord, setConfirmWord] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const owned = useMemo(() => projects.filter((project) => project.ownerId === user.uid), [projects, user.uid]);
  const shared = useMemo(
    () => owned.filter((project) => Object.keys(project.members).some((uid) => uid !== user.uid)),
    [owned, user.uid],
  );
  const soloOwned = owned.filter((project) => !shared.includes(project));
  const memberOf = projects.filter((project) => project.ownerId !== user.uid);

  const [plan, setPlan] = useState<OwnedProjectPlan>(() =>
    Object.fromEntries(
      shared.map((project) => {
        const heir = Object.keys(project.members).find((uid) => uid !== user.uid)!;
        return [project.id, { action: "transfer" as const, to: heir }];
      }),
    ),
  );

  function submit(event: FormEvent) {
    event.preventDefault();
    if (confirmWord.trim().toUpperCase() !== CONFIRM_WORD) return setError(`Escribe ${CONFIRM_WORD} para confirmar.`);
    if (methods.password && !password) return setError("Escribe tu contraseña para confirmar que eres tú.");
    setError(null);
    startTransition(async () => {
      try {
        setProgress("Confirmando que eres tú…");
        await reauthenticate(user, methods.password ? password : undefined);
        await deleteMyData(user, plan, setProgress);
        setProgress("Eliminando la cuenta…");
        await deleteAuthAccount(user);
        await clearLocalCache();
        toast.success("Cuenta eliminada");
        window.location.replace("/login");
      } catch (err) {
        setProgress(null);
        if (isAuthCancel(err)) return;
        setError(
          err && typeof err === "object" && "code" in err && String(err.code).startsWith("auth/")
            ? authErrorMessage(err, "No se pudo eliminar la cuenta.")
            : firestoreErrorMessage(err, "No se pudo eliminar la cuenta"),
        );
      }
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="max-h-[min(680px,calc(100svh-2rem))] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">¿Eliminar tu cuenta?</DialogTitle>
          <DialogDescription className="text-[13px]">
            Se borrarán tu cuenta, tu perfil y tus comentarios. Esto no se puede deshacer.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4" noValidate>
          {(soloOwned.length > 0 || shared.length > 0 || memberOf.length > 0) && (
            <ul className="grid gap-2 text-[13px]">
              {soloOwned.map((project) => (
                <li key={project.id} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate">{project.name}</span>
                  <span className="shrink-0 text-xs text-destructive">Se elimina</span>
                </li>
              ))}
              {shared.map((project) => {
                const choice = plan[project.id];
                const value = choice?.action === "transfer" ? choice.to : "delete";
                const others = Object.entries(project.members).filter(([uid]) => uid !== user.uid);
                return (
                  <li key={project.id} className="grid gap-1.5 sm:flex sm:items-center sm:justify-between sm:gap-3">
                    <span className="min-w-0 truncate">{project.name}</span>
                    <Select
                      value={value}
                      onValueChange={(next) =>
                        setPlan((current) => ({
                          ...current,
                          [project.id]: next === "delete" ? { action: "delete" } : { action: "transfer", to: next },
                        }))
                      }
                    >
                      <SelectTrigger size="sm" className="w-full text-xs sm:w-56" aria-label={`Qué hacer con ${project.name}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {others.map(([uid, member]) => (
                          <SelectItem key={uid} value={uid} className="text-xs">
                            Transferir a {memberDisplayName(member)}
                          </SelectItem>
                        ))}
                        <SelectItem value="delete" className="text-xs text-destructive">
                          Eliminar el proyecto
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </li>
                );
              })}
              {memberOf.map((project) => (
                <li key={project.id} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate">{project.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">Sales del proyecto</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs leading-relaxed text-muted-foreground">
            En los proyectos que siguen existiendo, las tareas que creaste se quedan para el equipo, sin tu nombre ni tu
            email, y las que tenías asignadas quedan sin responsable.
          </p>

          {methods.password && (
            <div className="grid gap-1.5">
              <Label htmlFor="delete-password" className="text-xs text-muted-foreground">
                Tu contraseña
              </Label>
              <PasswordInput
                id="delete-password"
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
                className="h-8"
              />
            </div>
          )}
          {!methods.password && methods.google && (
            <p className="text-xs text-muted-foreground">Te pediremos que confirmes con Google.</p>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="delete-confirm" className="text-xs text-muted-foreground">
              Escribe <span className="font-mono text-foreground">{CONFIRM_WORD}</span> para confirmar
            </Label>
            <Input
              id="delete-confirm"
              autoComplete="off"
              value={confirmWord}
              onChange={(e) => setConfirmWord(e.target.value)}
              className="h-8 font-mono"
            />
          </div>

          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
          {progress && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
              <Loader2 className="size-3.5 animate-spin" aria-hidden /> {progress}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" size="sm" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Eliminar mi cuenta
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
