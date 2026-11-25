"use client";

import { useState, type KeyboardEvent } from "react";
import { Check, Eye, EyeOff, TriangleAlert } from "lucide-react";

import { Input } from "@/components/ui/input";
import { checkPassword, PASSWORD_RULES } from "@/lib/password";
import { cn } from "@/lib/utils";

/**
 * Campo de contraseña con botón para mostrarla/ocultarla y aviso de Bloq Mayús.
 * Se usa en todos los formularios con contraseña (acceso, registro, guardar
 * cuenta de invitado, cambiar contraseña).
 */
export function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  placeholder,
  invalid,
  className,
  autoFocus,
  label,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  placeholder?: string;
  invalid?: boolean;
  className?: string;
  autoFocus?: boolean;
  /** Para lectores de pantalla cuando no hay <Label> asociado. */
  label?: string;
}) {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  const trackCaps = (event: KeyboardEvent<HTMLInputElement>) => setCapsLock(event.getModifierState?.("CapsLock") ?? false);

  return (
    <div className="space-y-1">
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={trackCaps}
          onKeyUp={trackCaps}
          onBlur={() => setCapsLock(false)}
          aria-label={label}
          aria-invalid={invalid ? true : undefined}
          spellCheck={false}
          className={cn("h-9 pr-10", className)}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
          title={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {capsLock && (
        <p className="flex items-center gap-1 text-[11px] text-warning" role="status">
          <TriangleAlert className="size-3" aria-hidden /> Bloq Mayús está activado
        </p>
      )}
    </div>
  );
}

/** Lista de requisitos de la contraseña nueva, que se van marcando al escribir. */
export function PasswordChecklist({ password, confirm }: { password: string; confirm?: string }) {
  const result = checkPassword(password);
  const items = [
    ...PASSWORD_RULES.map((rule) => ({ label: rule.label, ok: result.rules[rule.id] })),
    ...(confirm !== undefined ? [{ label: "Las dos contraseñas coinciden", ok: password.length > 0 && password === confirm }] : []),
  ];
  return (
    <div className="space-y-1.5" aria-live="polite">
      <div className="flex gap-1" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full bg-muted transition-colors duration-200",
              password && i < result.score && (result.score <= 1 ? "bg-warning" : result.score === 2 ? "bg-foreground/50" : "bg-primary"),
            )}
          />
        ))}
      </div>
      {password && <p className="text-[11px] text-muted-foreground">Seguridad: {result.strength}</p>}
      <ul className="grid gap-0.5">
        {items.map((item) => (
          <li
            key={item.label}
            className={cn("flex items-center gap-1.5 text-[11px]", item.ok ? "text-foreground/80" : "text-muted-foreground")}
          >
            <Check className={cn("size-3", item.ok ? "text-primary" : "opacity-30")} aria-hidden />
            {item.label}
            <span className="sr-only">{item.ok ? "(cumplido)" : "(pendiente)"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
