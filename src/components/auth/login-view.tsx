"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Mail, MailCheck, ShieldCheck, SquareKanban, UserRound } from "lucide-react";

import { LegalLink, LegalLinks } from "@/components/legal/legal-links";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  authErrorMessage,
  isAuthCancel,
  sendPasswordReset,
  signInAsGuest,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "@/lib/auth";
import { usingEmulators } from "@/lib/firebase";
import { markTermsAccepted, MIN_AGE } from "@/lib/legal";
import { newPasswordError } from "@/lib/password";
import { cn } from "@/lib/utils";
import { useAuth } from "./auth-provider";
import { FirebaseSetupNotice } from "./firebase-setup-notice";
import { GoogleIcon } from "./google-icon";
import { LoginPreview } from "./login-preview";
import { PasswordChecklist, PasswordInput } from "./password-field";

type Step = "choose" | "email" | "reset";
type Mode = "signin" | "signup";
type Pending = "google" | "guest" | "email" | "reset" | null;

/** Segundos de espera antes de poder pedir otro email de recuperación. */
const RESEND_COOLDOWN = 60;

/**
 * Destino tras iniciar sesión: solo rutas de esta misma web. Se resuelve
 * con `URL` para cerrar trucos como `/\evil.com` o `//evil.com`
 * (redirecciones abiertas).
 */
function nextPath() {
  const next = new URLSearchParams(window.location.search).get("next");
  if (!next) return "/";
  try {
    const url = new URL(next, window.location.origin);
    if (url.origin !== window.location.origin || !next.startsWith("/") || next.startsWith("//")) return "/";
    if (url.pathname.startsWith("/login")) return "/";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/";
  }
}

/**
 * Acceso estilo Linear: primero se elige el método (Google, email o
 * invitado) y el formulario de email aparece solo si hace falta.
 */
export function LoginView() {
  const { status } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>("choose");
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (status === "signed-in") router.replace(nextPath());
  }, [status, router]);

  if (status === "unconfigured") return <FirebaseSetupNotice />;
  // Mientras Firebase restaura la sesión (o ya hay una y vamos a redirigir),
  // no se enseña el formulario: evita el parpadeo para quien ya entró.
  if (status !== "signed-out") return <main className="flex-1 bg-background" aria-busy />;

  function run(kind: Exclude<Pending, null>, action: () => Promise<unknown>, onDone?: () => void) {
    setError(null);
    setPending(kind);
    startTransition(async () => {
      try {
        await action();
        onDone?.();
      } catch (err) {
        if (!isAuthCancel(err)) setError(authErrorMessage(err));
      } finally {
        setPending(null);
      }
    });
  }

  /** Entrar implica aceptar los términos (aviso visible en cada paso). */
  function signIn(kind: Exclude<Pending, null>, action: () => Promise<unknown>) {
    markTermsAccepted();
    run(kind, action);
  }

  function go(next: Step, nextMode: Mode = mode) {
    setError(null);
    setMode(nextMode);
    setStep(next);
  }

  return (
    <div className="grid min-h-svh flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <main className="flex min-w-0 flex-col px-6 py-6 sm:px-10">
        <header className="flex items-center gap-2 text-[13px] font-medium">
          <span className="flex size-6 items-center justify-center rounded-md border bg-card">
            <SquareKanban className="size-3.5 text-primary" aria-hidden />
          </span>
          ControlTrabajo
          {usingEmulators && (
            <span className="ml-1 rounded-sm border px-1.5 py-px font-mono text-[10px] font-normal text-warning">
              emulador
            </span>
          )}
        </header>

        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-[340px]">
            {step === "choose" && (
              <ChooseStep
                pending={pending}
                error={error}
                onGoogle={() => signIn("google", signInWithGoogle)}
                onEmail={() => go("email", "signin")}
                onGuest={() => signIn("guest", signInAsGuest)}
              />
            )}
            {step === "email" && (
              <EmailStep
                key={mode}
                mode={mode}
                email={email}
                onEmailChange={setEmail}
                pending={pending === "email"}
                error={error}
                onError={setError}
                onBack={() => go("choose")}
                onToggleMode={() => go("email", mode === "signin" ? "signup" : "signin")}
                onForgot={() => go("reset")}
                onSubmit={({ name, password }) =>
                  signIn("email", () =>
                    mode === "signin" ? signInWithEmail(email, password) : signUpWithEmail(name, email, password),
                  )
                }
              />
            )}
            {step === "reset" && (
              <ResetStep
                email={email}
                onEmailChange={setEmail}
                pending={pending === "reset"}
                error={error}
                onError={setError}
                onBack={() => go("email", "signin")}
                onSend={(done) => run("reset", () => sendPasswordReset(email), done)}
              />
            )}
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span>Tableros, documento de diseño y métricas para estudios de videojuegos.</span>
          <LegalLinks />
        </footer>
      </main>

      <LoginPreview />
    </div>
  );
}

// ─── Pasos ───────────────────────────────────────────────────────────────────

function ChooseStep({
  pending,
  error,
  onGoogle,
  onEmail,
  onGuest,
}: {
  pending: Pending;
  error: string | null;
  onGoogle: () => void;
  onEmail: () => void;
  onGuest: () => void;
}) {
  const busy = pending !== null;
  return (
    <StepLayout title="Inicia sesión en ControlTrabajo" description="Elige cómo quieres entrar.">
      <div className="space-y-2">
        <Button type="button" variant="outline" className="h-9 w-full gap-2.5" onClick={onGoogle} disabled={busy}>
          {pending === "google" ? <Loader2 className="animate-spin" /> : <GoogleIcon />}
          Continuar con Google
        </Button>
        <Button type="button" variant="outline" className="h-9 w-full gap-2.5" onClick={onEmail} disabled={busy}>
          <Mail className="text-muted-foreground" />
          Continuar con email
        </Button>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Con Google no necesitas contraseña: si pierdes el acceso, lo recuperas desde tu cuenta de Google.
      </p>

      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground" aria-hidden>
        <span className="h-px flex-1 bg-border" />o<span className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="ghost"
        className="h-9 w-full gap-2.5 text-muted-foreground hover:text-foreground"
        onClick={onGuest}
        disabled={busy}
      >
        {pending === "guest" ? <Loader2 className="animate-spin" /> : <UserRound />}
        Entrar como invitado
      </Button>
      <p className="mt-2 text-center text-xs leading-relaxed text-muted-foreground">
        Sin registro. Tus proyectos quedan en este navegador y puedes guardar la cuenta cuando quieras sin perder nada.
      </p>

      <FormError message={error} />
      <ConsentNotice />
    </StepLayout>
  );
}

function EmailStep({
  mode,
  email,
  onEmailChange,
  pending,
  error,
  onError,
  onBack,
  onToggleMode,
  onForgot,
  onSubmit,
}: {
  mode: Mode;
  email: string;
  onEmailChange: (email: string) => void;
  pending: boolean;
  error: string | null;
  onError: (message: string | null) => void;
  onBack: () => void;
  onToggleMode: () => void;
  onForgot: () => void;
  onSubmit: (values: { name: string; password: string }) => void;
}) {
  const signUp = mode === "signup";
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [touched, setTouched] = useState(false);
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => firstField.current?.focus(), []);

  const mismatch = signUp && confirm.length > 0 && confirm !== password;
  /** Al corregir, el error anterior deja de tener sentido. */
  const edited = () => {
    if (error) onError(null);
  };

  function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!email.trim()) return onError("Escribe tu email.");
    if (!password) return onError("Escribe tu contraseña.");
    if (signUp) {
      const problem = newPasswordError(password, confirm);
      if (problem) return onError(problem);
      if (!accepted) return onError("Para crear la cuenta tienes que aceptar los términos y la política de privacidad.");
    }
    onSubmit({ name, password });
  }

  return (
    <StepLayout
      onBack={onBack}
      title={signUp ? "Crea tu cuenta" : "Inicia sesión con tu email"}
      description={signUp ? "Te enviaremos un email para verificarla y poder recuperarla si olvidas la contraseña." : undefined}
    >
      <form onSubmit={submit} className="space-y-3" noValidate>
        {signUp && (
          <Field id="name" label="Nombre">
            <Input
              ref={firstField}
              id="name"
              autoComplete="name"
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9"
              placeholder="Cómo te verá tu equipo"
            />
          </Field>
        )}
        <Field id="email" label="Email">
          <Input
            ref={signUp ? undefined : firstField}
            id="email"
            type="email"
            inputMode="email"
            autoComplete={signUp ? "email" : "username"}
            autoCapitalize="none"
            spellCheck={false}
            required
            maxLength={320}
            value={email}
            onChange={(e) => {
              onEmailChange(e.target.value);
              edited();
            }}
            className="h-9"
            placeholder="tu@estudio.com"
          />
        </Field>
        <Field
          id="password"
          label="Contraseña"
          action={
            !signUp && (
              <button
                type="button"
                onClick={onForgot}
                className="rounded-sm text-xs text-muted-foreground underline-offset-2 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                ¿La has olvidado?
              </button>
            )
          }
        >
          <PasswordInput
            id="password"
            value={password}
            onChange={(value) => {
              setPassword(value);
              edited();
            }}
            autoComplete={signUp ? "new-password" : "current-password"}
          />
        </Field>

        {signUp && (
          <>
            <Field id="password-confirm" label="Repite la contraseña">
              <PasswordInput
                id="password-confirm"
                value={confirm}
                onChange={(value) => {
                  setConfirm(value);
                  edited();
                }}
                autoComplete="new-password"
                invalid={mismatch || (touched && !confirm)}
              />
            </Field>
            <PasswordChecklist password={password} confirm={confirm} />
            <label htmlFor="accept-terms" className="flex cursor-pointer items-start gap-2.5 pt-1 text-xs leading-relaxed text-muted-foreground">
              <Checkbox
                id="accept-terms"
                checked={accepted}
                onCheckedChange={(value) => {
                  setAccepted(value === true);
                  edited();
                }}
                aria-labelledby="accept-terms-text"
                aria-invalid={touched && !accepted ? true : undefined}
                className="mt-0.5"
              />
              <span id="accept-terms-text">
                Tengo al menos {MIN_AGE} años y acepto los <LegalLink href="/legal/terminos">términos de uso</LegalLink> y la{" "}
                <LegalLink href="/legal/privacidad">política de privacidad</LegalLink>.
              </span>
            </label>
          </>
        )}

        <FormError message={error} />

        <Button type="submit" className="h-9 w-full" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {signUp ? "Crear cuenta" : "Iniciar sesión"}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        {signUp ? "¿Ya tienes cuenta?" : "¿Primera vez aquí?"}{" "}
        <button
          type="button"
          onClick={onToggleMode}
          className="rounded-sm font-medium text-foreground underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {signUp ? "Inicia sesión" : "Crea una cuenta"}
        </button>
      </p>
      {!signUp && <ConsentNotice />}
    </StepLayout>
  );
}

function ResetStep({
  email,
  onEmailChange,
  pending,
  error,
  onError,
  onBack,
  onSend,
}: {
  email: string;
  onEmailChange: (email: string) => void;
  pending: boolean;
  error: string | null;
  onError: (message: string | null) => void;
  onBack: () => void;
  onSend: (done: () => void) => void;
}) {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  function send() {
    if (!email.trim()) return onError("Escribe el email de tu cuenta.");
    onSend(() => {
      setSentTo(email.trim());
      setCooldown(RESEND_COOLDOWN);
    });
  }

  if (sentTo) {
    return (
      <StepLayout onBack={onBack} title="Revisa tu correo">
        <div className="flex gap-3 rounded-lg border bg-card p-3 text-[13px] text-muted-foreground">
          <MailCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <div className="space-y-2">
            <p>
              Si existe una cuenta con <span className="break-all text-foreground">{sentTo}</span>, te llegará un email de
              ControlTrabajo con un enlace para elegir una contraseña nueva.
            </p>
            <p className="text-xs">
              Tarda uno o dos minutos. Si no lo ves, mira en <span className="text-foreground">spam</span> o{" "}
              <span className="text-foreground">promociones</span>. El enlace caduca en una hora.
            </p>
          </div>
        </div>
        <FormError message={error} />
        <div className="mt-4 grid gap-2">
          <Button type="button" className="h-9 w-full" onClick={onBack}>
            Volver a iniciar sesión
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-9 w-full text-muted-foreground hover:text-foreground"
            disabled={pending || cooldown > 0}
            onClick={send}
          >
            {pending && <Loader2 className="animate-spin" />}
            {cooldown > 0 ? (
              <>
                Reenviar en <span className="font-mono tabular-nums">{cooldown}</span> s
              </>
            ) : (
              "Reenviar el email"
            )}
          </Button>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          ¿Creaste la cuenta con Google? Entonces no tienes contraseña: vuelve y pulsa «Continuar con Google».
        </p>
      </StepLayout>
    );
  }

  return (
    <StepLayout
      onBack={onBack}
      title="Recupera tu contraseña"
      description="Te enviaremos un enlace para elegir una nueva. No hace falta recordar la anterior."
    >
      <form
        className="space-y-3"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <Field id="reset-email" label="Email de tu cuenta">
          <Input
            autoFocus
            id="reset-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={320}
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            className="h-9"
            placeholder="tu@estudio.com"
          />
        </Field>
        <FormError message={error} />
        <Button type="submit" className="h-9 w-full" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Enviar enlace
        </Button>
      </form>
      <p className="mt-4 flex gap-2 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-px size-3.5 shrink-0" aria-hidden />
        Por seguridad no te diremos si el email tiene cuenta: si la tiene, el enlace llegará igualmente.
      </p>
    </StepLayout>
  );
}

// ─── Piezas ──────────────────────────────────────────────────────────────────

function StepLayout({
  title,
  description,
  onBack,
  children,
}: {
  title: string;
  description?: string;
  onBack?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="animate-in fade-in-0 duration-200 motion-reduce:animate-none">
      {onBack && (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={onBack}
          className="mb-5 -ml-2 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft /> Volver
        </Button>
      )}
      <div className="mb-6 space-y-1">
        <h1 className="text-base font-medium">{title}</h1>
        {description && <p className="text-[13px] text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ id, label, action, children }: { id: string; label: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-xs text-muted-foreground">
          {label}
        </Label>
        {action}
      </div>
      {children}
    </div>
  );
}

function FormError({ message }: { message: string | null }) {
  return (
    <p role="alert" aria-live="polite" className={cn("text-xs text-destructive", message ? "mt-3" : "sr-only")}>
      {message}
    </p>
  );
}

/** Aviso de aceptación implícita al entrar (Google, invitado o inicio de sesión). */
function ConsentNotice() {
  return (
    <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground">
      Al continuar aceptas los <LegalLink href="/legal/terminos">términos de uso</LegalLink> y la{" "}
      <LegalLink href="/legal/privacidad">política de privacidad</LegalLink>.
    </p>
  );
}
