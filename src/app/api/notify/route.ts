import { createRemoteJWKSet, decodeJwt, jwtVerify, type JWTPayload } from "jose";
import nodemailer, { type Transporter } from "nodemailer";

/*
 * Avisos por email (gratis): el navegador llama aquí tras asignar una tarea,
 * comentar, invitar, transferir un proyecto o cambiar la contraseña.
 *
 * Seguridad — nadie puede usar esto para enviar correos arbitrarios:
 * 1. El token de Firebase del que llama se verifica (firma de Google).
 * 2. Cada hecho se comprueba en Firestore por REST **con ese mismo token**:
 *    las reglas solo dejan leer proyectos de los que es miembro.
 * 3. El destinatario sale de los datos (responsable, autor, invitado), no
 *    de la petición, y nunca es quien hace la acción.
 * 4. Límite de envíos por usuario y sin repetir el mismo aviso seguido.
 *
 * Envío por SMTP (Gmail con contraseña de aplicación: 500 correos/día gratis).
 * Sin SMTP_USER/SMTP_PASS no se envía nada (en el emulador se registra).
 */

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";
const USING_EMULATORS = process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATORS === "true";
const FIRESTORE = USING_EMULATORS
  ? `http://127.0.0.1:8080/v1/projects/${PROJECT_ID}/databases/(default)/documents`
  : `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const GOOGLE_KEYS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

type NotifyEvent =
  | { type: "assigned"; projectId: string; taskId: string }
  | { type: "comment"; projectId: string; taskId: string; commentId: string }
  | { type: "invited"; projectId: string; email: string }
  | { type: "owner"; projectId: string }
  | { type: "password" };

type Mail = { to: string; subject: string; heading: string; lines: string[]; cta?: { label: string; url: string } };

// ─── Límites (por instancia del servidor) ────────────────────────────────────

const sentBy = new Map<string, number[]>();
const recent = new Map<string, number>();
const MAX_PER_WINDOW = 30;
const WINDOW_MS = 10 * 60 * 1000;
const DEDUPE_MS = 2 * 60 * 1000;

function allowed(uid: string) {
  const now = Date.now();
  const times = (sentBy.get(uid) ?? []).filter((t) => now - t < WINDOW_MS);
  if (times.length >= MAX_PER_WINDOW) return false;
  times.push(now);
  sentBy.set(uid, times);
  return true;
}

function duplicate(key: string) {
  const now = Date.now();
  const last = recent.get(key);
  recent.set(key, now);
  return last !== undefined && now - last < DEDUPE_MS;
}

// ─── Firestore por REST con el token del que llama ───────────────────────────

type Value = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  nullValue?: null;
  timestampValue?: string;
  arrayValue?: { values?: Value[] };
  mapValue?: { fields?: Record<string, Value> };
};

function decode(value: Value | undefined): unknown {
  if (!value) return null;
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return Number(value.integerValue);
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.timestampValue !== undefined) return value.timestampValue;
  if (value.arrayValue) return (value.arrayValue.values ?? []).map(decode);
  if (value.mapValue) return decodeFields(value.mapValue.fields);
  return null;
}

function decodeFields(fields: Record<string, Value> | undefined) {
  return Object.fromEntries(Object.entries(fields ?? {}).map(([key, value]) => [key, decode(value)]));
}

/** Documento leído con los permisos del usuario; null si no existe o no puede verlo. */
async function readDoc(path: string, token: string): Promise<Record<string, unknown> | null> {
  const response = await fetch(`${FIRESTORE}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const body = (await response.json()) as { fields?: Record<string, Value> };
  return decodeFields(body.fields);
}

type Member = { name: string | null; email: string | null };

function membersOf(project: Record<string, unknown>) {
  return (project.members ?? {}) as Record<string, Member>;
}

type SettingKind = "assigned" | "comments" | "projects";

/** Sin documento de preferencias, se avisa de todo. */
async function wants(uid: string, kind: SettingKind, token: string) {
  const settings = await readDoc(`notificationSettings/${uid}`, token);
  return settings?.[kind] !== false;
}

// ─── Correo ──────────────────────────────────────────────────────────────────

function escape(text: string) {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function render(mail: Mail, origin: string) {
  const lines = mail.lines.map((line) => `<p style="margin:0 0 12px">${line}</p>`).join("");
  const button = mail.cta
    ? `<p style="margin:20px 0"><a href="${mail.cta.url}" style="background:#5e6ad2;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;display:inline-block;font-weight:600">${escape(mail.cta.label)}</a></p>`
    : "";
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f4f5f7;padding:24px;font-family:Inter,Segoe UI,Arial,sans-serif;color:#1b1d22">
<div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e3e5ea;border-radius:12px;padding:24px">
<p style="margin:0 0 16px;font-weight:600;color:#5e6ad2">VicePlan</p>
<h1 style="margin:0 0 16px;font-size:18px">${mail.heading}</h1>
${lines}${button}
<p style="margin:24px 0 0;font-size:12px;color:#7a7f8a">Recibes este aviso porque tienes cuenta en VicePlan o te han invitado. Puedes elegir qué avisos recibir en <a href="${origin}/" style="color:#5e6ad2">Mi cuenta → Notificaciones</a>.</p>
</div></body></html>`;
}

let transport: Transporter | null = null;

async function send(mail: Mail, origin: string) {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    // Sin configurar: no se envía. En local se deja ver qué se habría mandado.
    if (USING_EMULATORS) console.info("[email simulado]", mail.to, "·", mail.subject);
    return false;
  }
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: (process.env.SMTP_PORT ?? "465") === "465",
    auth: { user, pass },
  });
  const text = [mail.heading, ...mail.lines.map((l) => l.replace(/<[^>]+>/g, "")), mail.cta?.url ?? ""].join("\n\n");
  await transport.sendMail({
    from: process.env.MAIL_FROM ?? `"VicePlan" <${user}>`,
    to: mail.to,
    subject: mail.subject,
    text,
    html: render(mail, origin),
  });
  return true;
}

// ─── Verificación del usuario ────────────────────────────────────────────────

async function verify(token: string): Promise<JWTPayload | null> {
  try {
    // El emulador de Auth emite tokens sin firmar: solo en local se aceptan tal cual.
    if (USING_EMULATORS) return decodeJwt(token);
    const { payload } = await jwtVerify(token, GOOGLE_KEYS, {
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
    });
    return payload;
  } catch {
    return null;
  }
}

function validEvent(body: unknown): body is NotifyEvent {
  if (!body || typeof body !== "object") return false;
  const e = body as Record<string, unknown>;
  const id = (v: unknown) => typeof v === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(v);
  switch (e.type) {
    case "assigned":
      return id(e.projectId) && id(e.taskId);
    case "comment":
      return id(e.projectId) && id(e.taskId) && id(e.commentId);
    case "invited":
      return id(e.projectId) && typeof e.email === "string" && e.email.length <= 320;
    case "owner":
      return id(e.projectId);
    case "password":
      return true;
    default:
      return false;
  }
}

// ─── Qué correo corresponde a cada hecho ─────────────────────────────────────

async function mailsFor(event: NotifyEvent, uid: string, token: string, claims: JWTPayload, origin: string) {
  if (event.type === "password") {
    const email = typeof claims.email === "string" ? claims.email : null;
    if (!email) return [];
    return [
      {
        to: email,
        subject: "Tu contraseña de VicePlan ha cambiado",
        heading: "Se ha cambiado tu contraseña",
        lines: [
          "Acabas de cambiar (o añadir) la contraseña de tu cuenta de VicePlan.",
          "Si no has sido tú, recupera la cuenta ahora con «¿La has olvidado?» en la pantalla de acceso y cambia la contraseña.",
        ],
        cta: { label: "Ir a VicePlan", url: `${origin}/login` },
      } satisfies Mail,
    ];
  }

  const project = await readDoc(`projects/${event.projectId}`, token);
  if (!project) return [];
  const members = membersOf(project);
  const projectName = escape(String(project.name ?? "un proyecto"));
  const actor = escape(members[uid]?.name || members[uid]?.email?.split("@")[0] || "Alguien del equipo");
  const key = String(project.key ?? "");

  if (event.type === "invited") {
    const email = event.email.trim().toLowerCase();
    const invited = Array.isArray(project.invitedEmails) ? (project.invitedEmails as string[]) : [];
    if (!invited.includes(email)) return [];
    return [
      {
        to: email,
        subject: `${actor} te ha invitado a «${String(project.name ?? "")}» en VicePlan`,
        heading: `Te han invitado a ${projectName}`,
        lines: [
          `<strong>${actor}</strong> te ha invitado a su proyecto en VicePlan, una herramienta de gestión de proyectos para videojuegos.`,
          `Entra con <strong>${escape(email)}</strong> (con Google o creando una cuenta con este email) y acepta la invitación.`,
        ],
        cta: { label: "Ver la invitación", url: `${origin}/login` },
      } satisfies Mail,
    ];
  }

  if (event.type === "owner") {
    const owner = String(project.ownerId ?? "");
    const email = members[owner]?.email;
    if (!owner || owner === uid || !email || !(await wants(owner, "projects", token))) return [];
    return [
      {
        to: email,
        subject: `Ahora eres propietario de «${String(project.name ?? "")}»`,
        heading: `Ahora eres el propietario de ${projectName}`,
        lines: [`<strong>${actor}</strong> te ha transferido la propiedad del proyecto. Ya puedes gestionar sus miembros y su configuración.`],
        cta: { label: "Abrir el proyecto", url: `${origin}/projects/${event.projectId}/board` },
      } satisfies Mail,
    ];
  }

  const task = await readDoc(`projects/${event.projectId}/tasks/${event.taskId}`, token);
  if (!task) return [];
  const taskId = `${key}-${task.number}`;
  const title = escape(String(task.title ?? ""));
  const link = `${origin}/projects/${event.projectId}/board?tarea=${event.taskId}`;

  if (event.type === "assigned") {
    const target = typeof task.assigneeId === "string" ? task.assigneeId : null;
    const email = target ? members[target]?.email : null;
    if (!target || target === uid || !email || !(await wants(target, "assigned", token))) return [];
    return [
      {
        to: email,
        subject: `${taskId}: te han asignado «${String(task.title ?? "")}»`,
        heading: `Te han asignado ${escape(taskId)}`,
        lines: [`<strong>${actor}</strong> te ha asignado <strong>${title}</strong> en ${projectName}.`],
        cta: { label: "Ver la tarea", url: link },
      } satisfies Mail,
    ];
  }

  // Comentario: avisa al responsable y a quien creó la tarea (menos al autor).
  const comment = await readDoc(`projects/${event.projectId}/tasks/${event.taskId}/comments/${event.commentId}`, token);
  if (!comment || comment.authorId !== uid) return [];
  const excerpt = escape(String(comment.body ?? "").slice(0, 400));
  const targets = [...new Set([task.assigneeId, task.createdBy].filter((v): v is string => typeof v === "string"))].filter(
    (t) => t !== uid && members[t]?.email,
  );
  const mails: Mail[] = [];
  for (const target of targets) {
    if (!(await wants(target, "comments", token))) continue;
    mails.push({
      to: members[target].email!,
      subject: `${taskId}: nuevo comentario de ${members[uid]?.name || "tu equipo"}`,
      heading: `Nuevo comentario en ${escape(taskId)}`,
      lines: [
        `<strong>${actor}</strong> ha comentado en <strong>${title}</strong> (${projectName}):`,
        `<span style="display:block;border-left:3px solid #5e6ad2;padding-left:12px;color:#3d4049;white-space:pre-wrap">${excerpt}</span>`,
      ],
      cta: { label: "Responder", url: link },
    });
  }
  return mails;
}

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const claims = token ? await verify(token) : null;
  const uid = typeof claims?.sub === "string" ? claims.sub : null;
  if (!claims || !uid) return Response.json({ error: "No autorizado" }, { status: 401 });

  const body: unknown = await request.json().catch(() => null);
  if (!validEvent(body)) return Response.json({ error: "Aviso no válido" }, { status: 400 });

  const origin = process.env.APP_URL ?? new URL(request.url).origin;
  let sent = 0;
  try {
    const mails = await mailsFor(body, uid, token, claims, origin);
    for (const mail of mails) {
      const key = `${uid}:${body.type}:${"taskId" in body ? body.taskId : ""}:${mail.to}`;
      if (duplicate(key) || !allowed(uid)) continue;
      if (await send(mail, origin)) sent++;
    }
  } catch (error) {
    console.error("[avisos]", error);
    return Response.json({ error: "No se pudo enviar" }, { status: 500 });
  }
  return Response.json({ sent });
}
