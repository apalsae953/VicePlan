/*
 * Requisitos de contraseña. Son los mismos que impone Firebase Auth en el
 * servidor (política de contraseñas del proyecto: mínimo 8 caracteres, con
 * letras y números); aquí se comprueban al escribir para avisar antes.
 */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const PASSWORD_RULES = [
  { id: "length", label: `Al menos ${PASSWORD_MIN_LENGTH} caracteres` },
  { id: "letter", label: "Una letra minúscula" },
  { id: "number", label: "Un número" },
] as const;

type RuleId = (typeof PASSWORD_RULES)[number]["id"];

/** Contraseñas demasiado obvias que no deberían aceptarse aunque cumplan las reglas. */
const COMMON = ["password1", "contraseña1", "qwerty123", "12345678a", "abc12345", "controltrabajo1", "viceplan1", "iloveyou1"];

export function checkPassword(password: string) {
  const rules: Record<RuleId, boolean> = {
    length: password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH,
    letter: /\p{Ll}/u.test(password),
    number: /\d/.test(password),
  };
  const valid = Object.values(rules).every(Boolean) && !COMMON.includes(password.toLowerCase());

  // Puntuación 0–4: longitud, variedad de caracteres y nada obvio.
  let score = 0;
  if (password.length >= PASSWORD_MIN_LENGTH) score += 1;
  if (password.length >= 12) score += 1;
  const kinds = [/\p{Ll}/u, /\p{Lu}/u, /\d/, /[^\p{L}\d]/u].filter((re) => re.test(password)).length;
  if (kinds >= 3) score += 1;
  if (kinds === 4 || password.length >= 16) score += 1;
  if (!valid) score = Math.min(score, 1);

  const strength = score <= 1 ? "débil" : score === 2 ? "aceptable" : score === 3 ? "buena" : "muy buena";
  return { rules, valid, score, strength };
}

/** Mensaje de error del formulario, o null si la contraseña nueva es válida. */
export function newPasswordError(password: string, confirm: string) {
  const { valid } = checkPassword(password);
  if (!valid) return "La contraseña no cumple los requisitos.";
  if (password !== confirm) return "Las contraseñas no coinciden.";
  return null;
}
