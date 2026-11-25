/*
 * Datos legales de la app (RGPD, LOPDGDD y LSSI-CE). Los textos de
 * /legal/* los leen de aquí. Completa los campos a `null` antes de publicar
 * la app para otras personas: mientras falten, las páginas lo indican.
 */

export const LEGAL = {
  appName: "ControlTrabajo",
  /** Nombre y apellidos (o razón social) de quien ofrece la app: responsable del tratamiento. */
  owner: "Snoker Studios" as string | null,
  /**
   * NIF o CIF y domicilio: obligatorios en el aviso legal solo si la app pasa a
   * ser una actividad económica (cobro, publicidad…). Mientras estén a null, no
   * se muestran.
   */
  taxId: null as string | null,
  address: null as string | null,
  /** Email de contacto para privacidad y ejercicio de derechos. */
  contactEmail: "jefesupremogm@gmail.com" as string | null,
  country: "España",
  /** Fecha de la última revisión de los textos (YYYY-MM-DD). */
  updatedAt: "2026-11-25",
};

/**
 * Versión de los términos y la política de privacidad. Al cambiarla, la app
 * pide a cada persona que los acepte de nuevo al entrar.
 */
export const TERMS_VERSION = "2026-11-25";

/** Edad mínima para crear una cuenta sin consentimiento paterno (art. 7 LOPDGDD). */
export const MIN_AGE = 14;

export const LEGAL_LINKS = [
  { href: "/legal/privacidad", label: "Privacidad" },
  { href: "/legal/terminos", label: "Términos" },
  { href: "/legal/cookies", label: "Cookies" },
  { href: "/legal/aviso-legal", label: "Aviso legal" },
] as const;

export const legalIncomplete = !LEGAL.owner || !LEGAL.contactEmail;

/**
 * Quien acepta en la pantalla de acceso (casilla al registrarse, o aviso
 * "Al continuar…" en Google/invitado) lo deja anotado para esta pestaña; la
 * app lo guarda en su perfil al entrar (ver `TermsGate`).
 */
const PENDING_KEY = "controltrabajo:terms-accepted";

export function markTermsAccepted() {
  try {
    window.sessionStorage.setItem(PENDING_KEY, TERMS_VERSION);
  } catch {
    // Sin almacenamiento: la app pedirá la aceptación en un diálogo.
  }
}

export function takePendingTermsAcceptance() {
  try {
    const value = window.sessionStorage.getItem(PENDING_KEY);
    window.sessionStorage.removeItem(PENDING_KEY);
    return value === TERMS_VERSION;
  } catch {
    return false;
  }
}
