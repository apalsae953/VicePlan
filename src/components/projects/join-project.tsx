"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, KeyRound, Loader2, SearchX } from "lucide-react";
import { toast } from "sonner";

import { useCurrentUser } from "@/components/auth/auth-provider";
import { useProjects } from "@/components/auth/projects-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { firestoreErrorMessage } from "@/lib/firestore/errors";
import { formatInviteCode, joinWithCode, parseInviteCode, resolveInviteCode } from "@/lib/firestore/invites";

type Target = { code: string; projectId: string; projectName: string };

/** Resolver un código y unirse; compartido por el diálogo y la página /unirse. */
function useJoin() {
  const user = useCurrentUser();
  const router = useRouter();
  const { projects } = useProjects();
  const [pending, startTransition] = useTransition();

  function join(target: Target) {
    if (projects.some((project) => project.id === target.projectId)) {
      router.push(`/projects/${target.projectId}/board`);
      return;
    }
    startTransition(async () => {
      try {
        await joinWithCode(target.code, user, target.projectId);
        toast.success(`Te has unido a «${target.projectName}»`);
        router.push(`/projects/${target.projectId}/board`);
      } catch (error) {
        toast.error(firestoreErrorMessage(error, "No se pudo unir al proyecto. Puede que el código haya cambiado."));
      }
    });
  }

  return { join, pending, isMember: (projectId: string) => projects.some((p) => p.id === projectId) };
}

/** Diálogo "Unirme con un código" (selector de proyectos, inicio, paleta). */
export function JoinProjectDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { join, pending } = useJoin();
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, startCheck] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    const code = parseInviteCode(input);
    if (!code) return setError("El código tiene 8 caracteres, por ejemplo K7QX-3MPA.");
    setError(null);
    startCheck(async () => {
      try {
        const found = await resolveInviteCode(code);
        if (!found) return setError("Ese código no existe o se ha desactivado.");
        join({ code, ...found });
        onOpenChange(false);
        setInput("");
      } catch (err) {
        setError(firestoreErrorMessage(err, "No se pudo comprobar el código"));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Unirme con un código</DialogTitle>
          <DialogDescription className="text-[13px]">
            Pega el código o el enlace que te han compartido.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-2" noValidate>
          <Input
            autoFocus
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setError(null);
            }}
            placeholder="K7QX-3MPA"
            aria-label="Código o enlace de invitación"
            aria-invalid={error ? true : undefined}
            className="h-9 font-mono tracking-wider uppercase"
          />
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="sm" disabled={!input.trim() || checking || pending}>
            {(checking || pending) && <Loader2 className="animate-spin" />}
            Unirme
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Página /unirse/CÓDIGO: muestra a qué proyecto lleva y deja unirse con un clic. */
export function JoinView() {
  const params = useParams<{ code: string }>();
  const code = parseInviteCode(decodeURIComponent(params.code ?? ""));
  const { join, pending, isMember } = useJoin();
  const [state, setState] = useState<{ code: string; target: Target | null } | null>(null);

  useEffect(() => {
    if (!code) return;
    let alive = true;
    resolveInviteCode(code)
      .then((found) => alive && setState({ code, target: found ? { code, ...found } : null }))
      .catch(() => alive && setState({ code, target: null }));
    return () => {
      alive = false;
    };
  }, [code]);

  const current = state?.code === code ? state : null;
  const loading = code !== null && current === null;
  const target = current?.target ?? null;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6">
        {loading ? (
          <div className="space-y-3" aria-busy>
            <Skeleton className="size-9 rounded-lg" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-64" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : target ? (
          <div className="space-y-4">
            <div className="flex size-9 items-center justify-center rounded-lg border bg-background">
              <KeyRound className="size-4 text-primary" aria-hidden />
            </div>
            <div className="space-y-1">
              <h1 className="text-sm font-medium">Te han invitado a «{target.projectName}»</h1>
              <p className="text-[13px] text-muted-foreground">
                Código <span className="font-mono text-foreground">{formatInviteCode(target.code)}</span>. Entrarás como
                miembro del proyecto.
              </p>
            </div>
            <Button className="w-full gap-1.5" size="sm" disabled={pending} onClick={() => join(target)}>
              {pending ? <Loader2 className="animate-spin" /> : <ArrowRight />}
              {isMember(target.projectId) ? "Abrir el proyecto" : "Unirme al proyecto"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex size-9 items-center justify-center rounded-lg border bg-background">
              <SearchX className="size-4 text-muted-foreground" aria-hidden />
            </div>
            <div className="space-y-1">
              <h1 className="text-sm font-medium">Este enlace ya no funciona</h1>
              <p className="text-[13px] text-muted-foreground">
                El código no existe o se ha renovado. Pide un enlace nuevo a quien te invitó.
              </p>
            </div>
            <Button asChild size="sm" variant="secondary" className="w-full">
              <Link href="/">Ir a mi panel</Link>
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
