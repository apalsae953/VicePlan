"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MailPlus, Settings2, Shapes, Users, X } from "lucide-react";
import { toast } from "sonner";

import { useCurrentUser } from "@/components/auth/auth-provider";
import { MemberAvatar } from "@/components/members/member-avatar";
import { ClickableMemberAvatar } from "@/components/members/member-photo";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { firestoreErrorMessage } from "@/lib/firestore/errors";
import { memberDisplayName } from "@/lib/firestore/mappers";
import {
  cancelInvitation,
  inviteByEmail,
  isValidEmail,
  MAX_MEMBERS,
  normalizeEmail,
  removeMember,
} from "@/lib/firestore/members";
import { deleteProjectCompletely, transferOwnership } from "@/lib/firestore/account";
import { updateProjectDetails } from "@/lib/firestore/projects";
import type { ProjectMember } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { ProjectSettingsTab } from "@/stores/workspace-store";
import { CategoriesTab } from "./categories-tab";
import { InviteCodeSection } from "./invite-code-section";
import { ProjectImageField } from "./project-image-field";
import { useWorkspaceStore } from "@/stores/workspace-store-provider";
import { notify } from "@/lib/notify";

const TABS: { value: ProjectSettingsTab; label: string; icon: typeof Users }[] = [
  { value: "general", label: "General", icon: Settings2 },
  { value: "members", label: "Miembros", icon: Users },
  { value: "categories", label: "Categorías", icon: Shapes },
];

/** Configuración del proyecto: datos generales y equipo (miembros e invitaciones). */
export function ProjectSettingsDialog() {
  const tab = useWorkspaceStore((s) => s.projectSettings);
  const openProjectSettings = useWorkspaceStore((s) => s.openProjectSettings);
  const closeProjectSettings = useWorkspaceStore((s) => s.closeProjectSettings);
  const projectName = useWorkspaceStore((s) => s.project.name);

  return (
    <Dialog open={tab !== null} onOpenChange={(open) => !open && closeProjectSettings()}>
      <DialogContent className="max-h-[min(640px,calc(100svh-2rem))] grid-rows-[auto_auto_minmax(0,1fr)] gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="gap-1 px-5 pt-5 pb-3">
          <DialogTitle className="text-sm">Configuración del proyecto</DialogTitle>
          <DialogDescription className="truncate text-[13px]">{projectName}</DialogDescription>
        </DialogHeader>
        <div role="tablist" aria-label="Secciones" className="flex gap-1 border-b px-4">
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.value;
            return (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => openProjectSettings(item.value)}
                className={cn(
                  "-mb-px flex h-9 items-center gap-1.5 border-b-2 px-2 text-[13px] outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring/50",
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" aria-hidden />
                {item.label}
              </button>
            );
          })}
        </div>
        <div className="min-h-0 overflow-y-auto px-5 py-4">
          {tab === "general" && <GeneralTab />}
          {tab === "members" && <MembersTab />}
          {tab === "categories" && <CategoriesTab />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── General ─────────────────────────────────────────────────────────────────

function GeneralTab() {
  const project = useWorkspaceStore((s) => s.project);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [pending, startTransition] = useTransition();
  const changed = name.trim() !== project.name || (description.trim() || null) !== project.description;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return void toast.error("El proyecto necesita un nombre");
    startTransition(async () => {
      try {
        await updateProjectDetails(project.id, { name, description });
        toast.success("Proyecto actualizado");
      } catch (error) {
        toast.error(firestoreErrorMessage(error, "No se pudo guardar"));
      }
    });
  }

  return (
    <div className="grid gap-4">
      <ProjectImageField />
      <form onSubmit={submit} className="grid gap-4">
        <div className="grid grid-cols-[1fr_6rem] gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="settings-name" className="text-xs text-muted-foreground">
              Nombre
            </Label>
            <Input
              id="settings-name"
              value={name}
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
              className="h-8"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="settings-key" className="text-xs text-muted-foreground">
              Clave
            </Label>
            <Input
              id="settings-key"
              value={project.key}
              readOnly
              aria-describedby="settings-key-hint"
              className="h-8 font-mono text-muted-foreground"
            />
          </div>
        </div>
        <p id="settings-key-hint" className="-mt-2 text-xs text-muted-foreground">
          La clave identifica las tareas ({project.key}-12) y no se puede cambiar.
        </p>
        <div className="grid gap-1.5">
          <Label htmlFor="settings-description" className="text-xs text-muted-foreground">
            Descripción
          </Label>
          <Textarea
            id="settings-description"
            value={description}
            maxLength={2000}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-20 text-[13px]"
            placeholder="De qué va el juego, plataforma, público…"
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={!changed || pending}>
            {pending && <Loader2 className="animate-spin" />}
            Guardar cambios
          </Button>
        </div>
      </form>
      <OwnerZone />
    </div>
  );
}

/** Solo el propietario: ceder el proyecto a otro miembro o eliminarlo entero. */
function OwnerZone() {
  const user = useCurrentUser();
  const router = useRouter();
  const project = useWorkspaceStore((s) => s.project);
  const closeProjectSettings = useWorkspaceStore((s) => s.closeProjectSettings);
  const others = project.members.filter((member) => member.uid !== user.uid);
  const [heir, setHeir] = useState<string>("");
  const [confirming, setConfirming] = useState<"transfer" | "delete" | null>(null);
  const [typedKey, setTypedKey] = useState("");
  const [busy, startBusy] = useTransition();

  // El diálogo de confirmación se queda montado aunque deje de ser propietario
  // (tras transferir): desmontarlo abierto deja la página sin clics (Radix).
  const isOwner = project.ownerId === user.uid;
  const heirMember = others.find((member) => member.uid === heir);
  const keyMatches = typedKey.trim().toUpperCase() === project.key;

  function transfer() {
    if (!heirMember) return;
    startBusy(async () => {
      try {
        await transferOwnership(project.id, heirMember.uid);
        notify({ type: "owner", projectId: project.id });
        setConfirming(null);
        setHeir("");
        toast.success("Propiedad transferida", {
          description: memberDisplayName(heirMember) + " es ahora el propietario.",
        });
      } catch (error) {
        toast.error(firestoreErrorMessage(error, "No se pudo transferir el proyecto"));
      }
    });
  }

  function remove() {
    if (!keyMatches) return;
    startBusy(async () => {
      try {
        await deleteProjectCompletely(project.id, project.inviteCode);
        closeProjectSettings();
        toast("«" + project.name + "» eliminado");
        router.replace("/");
      } catch (error) {
        toast.error(firestoreErrorMessage(error, "No se pudo eliminar el proyecto"));
      }
    });
  }

  return (
    <>
      {isOwner && (
        <section className="mt-2 grid gap-3 border-t pt-4">
          <h3 className="text-xs font-medium text-muted-foreground">Propiedad del proyecto</h3>
          {others.length > 0 && (
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">Transferir a otro miembro</Label>
              <div className="flex gap-2">
                <Select value={heir} onValueChange={setHeir}>
                  <SelectTrigger className="min-w-0 flex-1 text-[13px]" aria-label="Nuevo propietario">
                    <SelectValue placeholder="Elige un miembro" />
                  </SelectTrigger>
                  <SelectContent>
                    {others.map((member) => (
                      <SelectItem key={member.uid} value={member.uid} className="text-[13px]">
                        {memberDisplayName(member)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!heirMember}
                  onClick={() => setConfirming("transfer")}
                >
                  Transferir
                </Button>
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 p-3">
            <p className="min-w-0 flex-1 text-xs leading-relaxed text-muted-foreground">
              Eliminar el proyecto borra sus tareas, hitos, documento de diseño, imágenes y actividad para todo el
              equipo.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                setTypedKey("");
                setConfirming("delete");
              }}
            >
              Eliminar proyecto…
            </Button>
          </div>
        </section>
      )}

      <AlertDialog open={confirming !== null} onOpenChange={(open) => !open && !busy && setConfirming(null)}>
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">
              {confirming === "transfer"
                ? "¿Transferir «" + project.name + "» a " + memberDisplayName(heirMember) + "?"
                : "¿Eliminar «" + project.name + "»?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px]">
              {confirming === "transfer"
                ? "Pasará a ser el propietario: podrá quitar miembros y eliminar el proyecto. Tú seguirás como miembro."
                : "Se borrará todo su contenido para todos los miembros. No se puede deshacer."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirming === "delete" && (
            <div className="grid gap-1.5">
              <Label htmlFor="delete-project-key" className="text-xs text-muted-foreground">
                Escribe la clave <span className="font-mono text-foreground">{project.key}</span> para confirmar
              </Label>
              <Input
                id="delete-project-key"
                autoComplete="off"
                value={typedKey}
                onChange={(e) => setTypedKey(e.target.value)}
                className="h-8 font-mono"
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel size="sm" disabled={busy}>
              Cancelar
            </AlertDialogCancel>
            <Button
              type="button"
              size="sm"
              variant={confirming === "delete" ? "destructive" : "default"}
              disabled={busy || (confirming === "delete" && !keyMatches)}
              onClick={confirming === "delete" ? remove : transfer}
            >
              {busy && <Loader2 className="animate-spin" />}
              {confirming === "delete" ? "Eliminar proyecto" : "Transferir"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Miembros ────────────────────────────────────────────────────────────────

function MembersTab() {
  const user = useCurrentUser();
  const router = useRouter();
  const project = useWorkspaceStore((s) => s.project);
  const closeProjectSettings = useWorkspaceStore((s) => s.closeProjectSettings);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [inviting, startInvite] = useTransition();
  const [removing, setRemoving] = useState<ProjectMember | null>(null);
  const isOwner = project.ownerId === user.uid;
  const seats = project.memberIds.length + project.invitedEmails.length;

  function invite(event: FormEvent) {
    event.preventDefault();
    const target = normalizeEmail(email);
    if (!isValidEmail(target)) return setError("Escribe un email válido.");
    if (user.email && normalizeEmail(user.email) === target) return setError("Ya formas parte del proyecto.");
    if (project.members.some((member) => member.email === target)) return setError("Esa persona ya es miembro.");
    if (project.invitedEmails.includes(target)) return setError("Ya tiene una invitación pendiente.");
    if (seats >= MAX_MEMBERS) return setError(`Un proyecto admite hasta ${MAX_MEMBERS} personas.`);
    setError(null);
    startInvite(async () => {
      try {
        await inviteByEmail(project.id, target);
        notify({ type: "invited", projectId: project.id, email: target });
        setEmail("");
        toast.success("Invitación enviada", {
          description: `Le llegará un email a ${target} y la verá al entrar.`,
        });
      } catch (err) {
        toast.error(firestoreErrorMessage(err, "No se pudo invitar"));
      }
    });
  }

  async function cancel(target: string) {
    try {
      await cancelInvitation(project.id, target);
      toast("Invitación cancelada", { description: target });
    } catch (err) {
      toast.error(firestoreErrorMessage(err, "No se pudo cancelar la invitación"));
    }
  }

  async function confirmRemove(member: ProjectMember) {
    const leaving = member.uid === user.uid;
    try {
      await removeMember(project.id, member.uid);
      if (leaving) {
        closeProjectSettings();
        toast(`Has salido de «${project.name}»`);
        router.replace("/");
      } else {
        toast(`${memberDisplayName(member)} ya no es miembro`, {
          description: "Sus tareas han quedado sin responsable.",
        });
      }
    } catch (err) {
      toast.error(
        firestoreErrorMessage(err, leaving ? "No se pudo salir del proyecto" : "No se pudo quitar al miembro"),
      );
    }
  }

  return (
    <div className="grid gap-5">
      <InviteCodeSection />
      <form onSubmit={invite} className="grid gap-1.5" noValidate>
        <Label htmlFor="invite-email" className="text-xs text-muted-foreground">
          Invitar por email
        </Label>
        <div className="flex gap-2">
          <Input
            id="invite-email"
            type="email"
            autoComplete="off"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            placeholder="compi@estudio.com"
            className="h-8"
            aria-invalid={error ? true : undefined}
          />
          <Button type="submit" size="sm" disabled={inviting || !email.trim()} className="shrink-0 gap-1.5">
            {inviting ? <Loader2 className="animate-spin" /> : <MailPlus />}
            Invitar
          </Button>
        </div>
        <p
          className={cn("text-xs", error ? "text-destructive" : "text-muted-foreground")}
          role={error ? "alert" : undefined}
        >
          {error ?? "Le avisamos por email; la verá al entrar con ese email (Google, o email verificado)."}
        </p>
      </form>

      <section className="grid gap-1">
        <h3 className="flex items-center justify-between px-1 text-xs font-medium text-muted-foreground">
          Miembros
          <span className="font-mono tabular-nums">{project.members.length}</span>
        </h3>
        <ul className="grid">
          {project.members.map((member) => {
            const self = member.uid === user.uid;
            const canRemove = (isOwner && !self) || (!member.isOwner && self);
            return (
              <li key={member.uid} className="flex items-center gap-3 rounded-md px-1 py-1.5 hover:bg-accent/40">
                <ClickableMemberAvatar member={member} />
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-[13px]">
                    {memberDisplayName(member)}
                    {self && <span className="text-muted-foreground"> (tú)</span>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{member.email ?? "Cuenta de invitado"}</p>
                </div>
                {member.isOwner ? (
                  <span className="rounded-sm border px-1.5 py-px text-[11px] text-muted-foreground">Propietario</span>
                ) : (
                  canRemove && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setRemoving(member)}
                    >
                      {self ? "Salir" : "Quitar"}
                    </Button>
                  )
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {project.invitedEmails.length > 0 && (
        <section className="grid gap-1">
          <h3 className="flex items-center justify-between px-1 text-xs font-medium text-muted-foreground">
            Invitaciones pendientes
            <span className="font-mono tabular-nums">{project.invitedEmails.length}</span>
          </h3>
          <ul className="grid">
            {project.invitedEmails.map((invited) => (
              <li key={invited} className="flex items-center gap-3 rounded-md px-1 py-1.5 hover:bg-accent/40">
                <MemberAvatar size="lg" email={invited} className="opacity-60" />
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-[13px]">{invited}</p>
                  <p className="text-xs text-muted-foreground">Pendiente de aceptar</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground"
                  aria-label={`Cancelar la invitación a ${invited}`}
                  onClick={() => void cancel(invited)}
                >
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <AlertDialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">
              {removing?.uid === user.uid
                ? `¿Salir de «${project.name}»?`
                : `¿Quitar a ${memberDisplayName(removing)}?`}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px]">
              {removing?.uid === user.uid
                ? "Dejarás de ver el proyecto. Para volver, alguien tendrá que invitarte de nuevo."
                : "Perderá el acceso al proyecto y sus tareas quedarán sin responsable."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size="sm">Cancelar</AlertDialogCancel>
            <AlertDialogAction size="sm" variant="destructive" onClick={() => removing && void confirmRemove(removing)}>
              {removing?.uid === user.uid ? "Salir del proyecto" : "Quitar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
