# ControlTrabajo

Herramienta de gestión ágil de proyectos orientada al desarrollo de videojuegos
(inspirada en HacknPlan): tableros Kanban por milestone, tareas por disciplina
(programación, arte, diseño, audio, UI/UX, QA), registro de horas y un Game
Design Document (GDD) jerárquico enlazado a las tareas. UX inspirada en Linear.
Multiusuario sobre **Firebase (Auth + Firestore), siempre en el plan gratuito
Spark** (sin tarjeta) y con sincronización en tiempo real: equipos con
invitaciones por email o código, responsables, acceso como invitado, imágenes en
el GDD, categorías configurables, comentarios, registro de actividad, fechas,
etiquetas, subtareas, dependencias, "Mi panel" personal, burndown y velocidad, y
paleta de comandos (Ctrl/⌘ + K). Se inspira en HacknPlan (ver sus docs públicas).

@AGENTS.md

## Regla de diseño (estricta, no negociable)

La interfaz es **minimalista, oscura y al estilo Linear**. Todo componente nuevo
debe respetarlo; ante la duda, menos.

- **Modo oscuro siempre.** La clase `dark` está fija en `<html>` (`src/app/layout.tsx`).
  No añadir selector de tema ni estilos solo-claro salvo petición explícita.
- **Solo tokens semánticos** (`bg-background`, `bg-card`, `bg-popover`, `bg-muted`,
  `bg-accent`, `text-foreground`, `text-muted-foreground`, `border-border`,
  `bg-primary`, `ring-ring`…), definidos en `src/app/globals.css` (bloque `.dark`).
  Nada de colores Tailwind crudos (`bg-zinc-900`, `text-blue-500`) ni hex sueltos
  en componentes. Los únicos colores de dato permitidos (estado, categoría,
  prioridad) salen de `src/lib/constants.ts`, y se usan en puntos/iconos pequeños,
  nunca rellenando superficies grandes.
- **Paleta:** fondo casi negro `#08090a`, superficies `#0f1011` / `#141516`,
  texto `#f7f8f8`, secundario `#8a8f98`, **un único acento índigo `#5e6ad2`**
  (`primary`). Sin degradados, sin glow, sin glassmorphism.
- **Profundidad por bordes, no por sombras:** bordes de 1px a baja opacidad
  (`border-border` ≈ blanco 8%). Sombras solo en elementos flotantes (popover,
  dialog, tarjeta arrastrándose) y siempre sutiles.
- **Densidad alta y tipografía contenida:** Inter (`font-sans`), Geist Mono
  (`font-mono`) para IDs, horas y atajos. Texto base `text-sm` (14px), secundario
  `text-xs`/`text-[13px]`. Títulos de página `text-sm`/`text-base font-medium`,
  nunca enormes. `tabular-nums` en cifras. Controles de `h-7`/`h-8`.
- **Radios pequeños** (`--radius: 0.5rem`; `rounded-md`/`rounded-lg`).
- **Iconos:** solo `lucide-react`, `size-4` (o `size-3.5` en texto pequeño),
  color `text-muted-foreground` salvo estado activo. Decorativos con `aria-hidden`.
- **Avatares:** siempre `MemberAvatar` (`components/members/member-avatar.tsx`):
  foto, iniciales sobre `bg-accent` o icono neutro. Sin colores por persona.
- **Movimiento:** transiciones de 120–200 ms en color/opacity/transform, sin
  rebotes. Respetar `prefers-reduced-motion`.
- **Interacción tipo Linear:** hover con `bg-accent/50`, foco visible con `ring`,
  navegación por teclado y atajos donde tenga sentido, estados vacíos discretos,
  skeletons en lugar de spinners.
- **Idioma:** toda la interfaz en español de España, también las columnas (Por
  hacer, En curso, En pruebas, Hecho). Vocabulario: **hito** (no milestone),
  **trabajo pendiente** (no backlog), **documento de diseño** (no Game Design
  Doc; "GDD" vale como sigla), **tablero**. Los identificadores de código y las
  rutas siguen en inglés (`milestoneId`, `/milestones`).
- **Avisos:** `text-warning`/`bg-warning` (token de `globals.css`) para horas que
  exceden la estimación y estados pendientes (email sin verificar, sesión de
  invitado); `destructive` solo para borrar/quitar y errores.
- **Responsive:** todo debe funcionar a 375 px. En móvil el header del tablero
  pasa la búsqueda a una segunda fila (lupa) y la barra lateral es un Sheet.

## Stack

| Capa | Tecnología |
| --- | --- |
| Framework | Next.js 16.4 (App Router, Turbopack, **Cache Components** y Partial Prefetching activos) + React 19 + TypeScript |
| Estilos | Tailwind CSS v4 (vía `@tailwindcss/turbopack`, sin `tailwind.config`) + `tw-animate-css` |
| UI | shadcn/ui (base **Radix**, preset **Nova**, `components.json`) + `cn` (sustituto de clsx + tailwind-merge) + `cmdk` (paleta) |
| Iconos | lucide-react |
| Estado cliente | Zustand 5, sincronizado con Firestore por `onSnapshot` |
| Drag & Drop | `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` |
| Backend | **Firebase** (SDK web modular `firebase` 13, solo en el navegador): Authentication (Google, email/contraseña e **invitado** anónimo) y **Cloud Firestore** (también las imágenes del GDD, comprimidas). **Sin Cloud Storage** |
| Seguridad de datos | `firestore.rules` (pertenencia por `memberIds`, invitaciones, responsable válido, imágenes ≤ 800 KB, actividad acotada) + `firestore.indexes.json` + cabeceras CSP/seguridad en `next.config.ts` |
| Desarrollo local | Firebase Emulator Suite (`firebase-tools`, proyecto `demo-controltrabajo`: Auth y Firestore) |
| Markdown (GDD) | `react-markdown` + `remark-gfm` (tablas, checklists) + `@tailwindcss/typography` (`prose prose-invert prose-gdd`) |

## Proyecto de Firebase

- Proyecto real: **`controltrabajo-2xdnk`** (alias `default` en `.firebaserc`),
  Firestore `(default)` en `eur3`, app web "ControlTrabajo Web". Su configuración
  está en `.env.local` (no se versiona).
- Proveedores de acceso activos: Google, email/contraseña y anónimo. Se gestionan
  con la sección `auth` de `firebase.json` (`firebase deploy --only auth`); Google
  necesita además `supportEmail`, que no se guarda en el repo.
- **Configuración de Auth** (no está en `firebase.json`; se cambió por la API
  `identitytoolkit admin/v2 …/config`): dominios autorizados `localhost`,
  `127.0.0.1`, `*.firebaseapp.com`, `*.web.app` (al publicar la app en otro
  dominio, **añadirlo** o Google fallará con `auth/unauthorized-domain`);
  política de contraseñas ENFORCE (mín. 8, minúscula + número, igual que
  `lib/password.ts`); protección contra enumeración de emails activa; emails en
  español (`defaultLocale es`, remitente "ControlTrabajo"). El texto de las
  plantillas no se puede cambiar por API (solo en la consola).
- **Emails (verificar, recuperar contraseña):** los envía Firebase Auth gratis
  en Spark desde `noreply@controltrabajo-2xdnk.firebaseapp.com`; pueden caer
  en spam (la UI lo avisa). Vuelven a `/login` (`actionCodeSettings`).
- **Plan Spark (gratis, sin tarjeta) — requisito del usuario.** No añadir nada que
  exija Blaze (Cloud Storage, Functions, etc.). Por eso las imágenes del GDD se
  guardan comprimidas en Firestore (`gddAssets`). Spark nunca cobra: si se
  supera la cuota diaria, Firestore deja de responder hasta el día siguiente.

## Comandos

```bash
npm run dev            # desarrollo contra el proyecto real (.env.local)
npm run preview        # build + start: la versión rápida para usar la app a diario
npm run emulators      # Auth + Firestore locales (Java 11+); UI en http://127.0.0.1:4000
npm run dev:emulators  # next dev contra los emuladores (fija TODAS las NEXT_PUBLIC_FIREBASE_*)
npm run build          # build de producción (también valida tipos)
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit (genera antes los tipos de rutas)
npm run rules:deploy   # publica firestore.rules + firestore.indexes.json en el proyecto por defecto
```

**Rendimiento: dev ≠ producción.** En `next dev` cada vista se compila la
primera vez que se abre (~2 s) y cada cambio de vista hace una petición al
servidor (~250–400 ms, sin precarga). Con `npm run preview` la app carga en
~200 ms y cambiar de vista tarda 30–110 ms. Si "va lenta" en local, comprobar
primero que no se está en modo dev y que no quedan emuladores/servidores viejos
escuchando (puertos 3000, 3001, 4000, 4400, 8080, 9099, 9150).

## Arquitectura de carpetas

```
firestore.rules                  # reglas de seguridad (fuente de verdad del acceso)
firestore.indexes.json           # índice de grupo comments.authorId (mis comentarios)
firebase.json  .firebaserc       # reglas, proveedores de Auth, emuladores y proyecto por defecto
scripts/dev-emulators.mjs        # next dev con las variables del emulador
src/
  app/
    layout.tsx           # raíz: <AuthProvider>, tooltips y toasts
    login/               # acceso: Google / email (pasos) / invitado
    legal/               # privacidad, términos, cookies, aviso legal (públicas, estáticas)
    (app)/               # zona protegida (el grupo no cambia las URLs)
      layout.tsx         # <AuthGate> + <ProjectsProvider> + <TermsGate>
      page.tsx           # `/`: "Mi panel" o, sin proyectos, bienvenida
      unirse/[code]/     # enlace de invitación /unirse/CÓDIGO
      projects/[projectId]/
        layout.tsx       # <Suspense> + <ProjectWorkspace> (NO lee params en servidor)
        board/ gdd/[[...nodeId]]/ milestones/ metrics/   # páginas estáticas con metadata
  components/
    ui/                  # primitivas shadcn (ver "Personalizaciones de shadcn")
    auth/                # AuthProvider, AuthGate, ProjectsProvider, login (+ preview), PasswordInput,
                         #   Mi cuenta (perfil, seguridad, datos y privacidad), guardar cuenta de invitado
    legal/               # LegalLinks, LegalPage, TermsGate (aceptación de términos)
    dashboard/           # "Mi panel" (inicio con proyectos)
    activity/            # ActivityItem (línea del registro de actividad)
    members/             # MemberAvatar
    command/             # paleta de comandos (Ctrl/⌘ + K)
    projects/            # bienvenida, nuevo proyecto, unirse con código, configuración
                         #   (general, miembros + código, categorías)
    layout/              # ProjectWorkspace, sidebar, selector de proyecto, menú de usuario…
    board/ gdd/ milestones/ metrics/ charts/ tasks/   # vistas
  hooks/
    use-workspace-subscription.ts  # 4 listeners onSnapshot → store del proyecto
    use-task-actions.ts / use-gdd-actions.ts / use-milestone-actions.ts  # mutaciones
    use-content-autosave.ts  # autoguardado del Markdown (store al instante, Firestore a 700 ms)
    use-project-creation.ts  # crear proyecto vacío / cargar el de ejemplo
    use-hotkey.ts        # atajos globales (C, /, M, E, N, Ctrl/⌘+K)
    use-my-dashboard.ts  # mis tareas + actividad de todos mis proyectos (listeners por proyecto)
  lib/
    firebase.ts          # init perezosa (solo navegador) de app/auth/firestore + emuladores
    auth.ts              # Google, email, invitado, guardar cuenta, reautenticar, contraseña, borrar cuenta
    password.ts          # requisitos de contraseña (espejo de la política de Firebase)
    legal.ts             # datos del titular (a rellenar), TERMS_VERSION, enlaces legales
    images.ts            # compresión en el navegador (≤ 2048 px, WebP, ≤ 750 KB)
    firestore/           # capa de datos: refs, mappers, tasks, gdd, gdd-assets (imágenes),
                         #   milestones, projects (+ categorías), members (invitaciones por email),
                         #   invites (código), comments, activity, dashboard, users (+ términos),
                         #   account (exportar / borrar mis datos, transferir y eliminar proyecto),
                         #   sample-project, errors
    sample-data/         # Project: Aethelgard declarativo (para el proyecto de ejemplo)
    domain.ts / types.ts / board.ts / metrics.ts / constants.ts / preferences.ts
  stores/
    workspace-store.ts   # store Zustand del proyecto (vanilla, uno por proyecto)
    workspace-store-provider.tsx  # contexto + useWorkspaceStore(selector)
```

## Firestore: modelo de datos

```
users/{uid}                          displayName, email, photoURL, createdAt, lastSeenAt,
                                     termsVersion, acceptedTermsAt (solo él; lo borra al eliminar la cuenta)
inviteCodes/{código}                 projectId, projectName, createdBy, createdAt (get sí, list no)
projects/{projectId}                 name, key, description, ownerId, memberIds[],
                                     members{uid: {name, email, photoURL}}, invitedEmails[],
                                     categories[{id, name, color, icon}], inviteCode,
                                     taskCounter, createdAt, updatedAt
projects/{projectId}/milestones/{id} title, description, status, startDate, endDate (YYYY-MM-DD)
projects/{projectId}/tasks/{id}      number, title, description, status, category, priority,
                                     estimatedHours, loggedHours, position, milestoneId,
                                     gddNodeId, assigneeId, startDate, dueDate (YYYY-MM-DD),
                                     tags[], subtasks[{id, title, done}], blockedBy[] (ids),
                                     completedAt (al pasar a Hecho), createdBy, timestamps
projects/{projectId}/tasks/{id}/comments/{id}  authorId, body, createdAt, editedAt
projects/{projectId}/activity/{id}   actorId, type, taskId, data{}, createdAt (inmutable)
projects/{projectId}/joins/{uid}     code, createdAt (prueba del código al unirse)
projects/{projectId}/gddNodes/{id}   title, content (Markdown), parentId, position, timestamps
projects/{projectId}/gddAssets/{id}  nodeId, name, mimeType, width, height, size,
                                     data (bytes ≤ 800 KB), createdBy, createdAt — inmutable
```

- **Acceso por pertenencia:** un proyecto es visible para los uid de `memberIds`.
  "Mis proyectos" = `where("memberIds", "array-contains", uid)` ordenado en
  cliente (sin índice compuesto).
- **Perfiles desnormalizados:** `members` guarda nombre/email/foto de cada
  miembro (así `users/` sigue siendo privado). Cada usuario solo escribe su
  propia entrada; `ProjectsProvider` la mantiene al día.
- **`key` + `number`** forman `AET-12`. El número sale de `taskCounter` dentro de
  una **transacción** (`createTask`): nunca se repite aunque creen dos a la vez.
- **Sin cascadas en Firestore:** borrar un milestone o un subárbol del GDD, o
  quitar a un miembro, es un `writeBatch` que también desvincula sus tareas
  (`milestoneId`/`gddNodeId`/`assigneeId` = null).
- **`assigneeId`** debe ser miembro (`getAfter` del proyecto) o no cambiar.
- **Fechas de milestone** como "YYYY-MM-DD" (fecha de calendario, sin zona
  horaria); los mappers las convierten a ISO a medianoche local.
- **`position`** (número) en Task y GddNode: índice fraccional. Al soltar entre A
  y B se guarda `(A + B) / 2`; un drag & drop actualiza **un solo documento**.
- Escribir siempre **todos** los campos al crear (null si están vacíos): las
  reglas validan el documento completo con `keys().hasOnly(...)`.

## Categorías

- Por proyecto en `projects/{id}.categories` (orden = array). Sin campo, el
  mapper devuelve `DEFAULT_CATEGORIES` (10 de serie; las 6 primeras con los ids
  históricos PROGRAMMING, ART…). `task.category` es un id libre; una categoría
  borrada se pinta como `UNKNOWN_CATEGORY`.
- Color solo de `CATEGORY_COLORS` e icono de `CATEGORY_ICONS` (clave → lucide).
  Para pintar el icono, `<CategoryGlyph icon=…>` (createElement; asignar el
  componente en render rompe la regla `react-hooks/static-components`).
- Dentro de un proyecto: `useCategory(id)` / `findCategory(categories, id)`.
- Borrar una categoría con tareas = batch que las pasa a otra (`deleteCategory`).

## Equipo, invitaciones y cuentas

- **Invitar** = añadir el email (minúsculas) a `invitedEmails` (cualquier
  miembro). No se envía correo: la persona ve la invitación al entrar con ese
  email **verificado** (Google siempre lo está; email/contraseña recibe el
  enlace de verificación al registrarse). Aceptar: entra su uid en `memberIds`,
  sale su email y publica su perfil (rama `acceptsInvitation` de las reglas).
- **Código / enlace:** `projects/{id}.inviteCode` + `inviteCodes/{código}`
  (8 caracteres sin 0/O/1/I, se muestra K7QX-3MPA). Unirse = batch con
  `joins/{uid}` {code} + `memberIds` + perfil propio + evento de actividad; la
  regla `joinsWithCode` compara el código con el vigente (getAfter). Renovar o
  desactivar invalida el anterior. Vale también para cuentas de invitado.
- **Quitar:** el propietario a cualquiera; cada miembro puede salir. La clave del
  proyecto y el propietario no cambian.
- **Invitado:** Firebase Anonymous Auth. Sus proyectos son suyos mientras no
  cierre sesión; "Guardar cuenta" enlaza Google o email al mismo uid
  (`linkWithPopup` / `linkWithCredential`) sin perder datos. Cerrar sesión como
  invitado pide confirmación. No puede recibir invitaciones.
- `AuthProvider` usa `onIdTokenChanged` y expone `version`: el objeto `User`
  muta por dentro (verificar email, guardar cuenta) y `version` fuerza el
  re-render. `refresh()` recarga el usuario y el token.
- Cerrar sesión recarga a `/login` (sin `?next=`): limpia stores y listeners.

## Acceso, cuenta, seguridad y legal

- **Contraseñas:** `PasswordInput` (`components/auth/password-field.tsx`) en
  TODOS los campos: ojo para mostrar/ocultar y aviso de Bloq Mayús.
  Registro, guardar cuenta y cambiar contraseña piden **repetirla** y muestran
  `PasswordChecklist`; `newPasswordError` valida antes de enviar.
- **Recuperar contraseña:** paso "¿La has olvidado?" del login (aviso de spam y
  reenvío con espera de 60 s). Nunca revela si un email tiene cuenta (en el
  emulador se trata `user-not-found` como éxito).
- **Mi cuenta** (menú de usuario de la barra lateral, de Mi panel y la
  bienvenida): nombre, estado del email, métodos de acceso; cambiar contraseña
  (reautentica) o **añadir una** a cuentas de Google; **descargar mis datos**
  (JSON) y **eliminar cuenta**: borra sus comentarios (consulta de grupo), sale
  de los proyectos ajenos, en los propios compartidos **transfiere o elimina**
  según elija, borra los propios sin más miembros, rechaza invitaciones, borra
  `users/{uid}` y por último la cuenta de Auth. Cerrar sesión o borrar la
  cuenta limpia la caché local de Firestore (`clearLocalCache`).
- **Propietario** (Configuración → General): transferir la propiedad a otro
  miembro (rama `transfersOwnership` de las reglas) o eliminar el proyecto
  entero (`deleteProjectCompletely`: subcolecciones primero, el doc al final).
- **Legal (RGPD, LOPDGDD, LSSI):** páginas `/legal/*` con los datos de
  `lib/legal.ts` (titular, NIF, domicilio y email están a `null` → se marcan
  en amarillo hasta rellenarlos). Registro: casilla obligatoria (≥ 14 años +
  términos + privacidad); Google/invitado/inicio de sesión: aviso "Al continuar
  aceptas…". La aceptación se guarda en `users/{uid}.termsVersion`
  (`TermsGate`); subir `TERMS_VERSION` vuelve a pedirla. Sin banner de cookies:
  solo almacenamiento técnico/preferencias (ver `/legal/cookies`; si se añade
  analítica o publicidad, hará falta banner y consentimiento).
- **Cabeceras** (`next.config.ts`): CSP sin nonces (Next lo documenta así para
  páginas estáticas), `frame-ancestors 'none'`, nosniff, Referrer-Policy,
  Permissions-Policy, COOP `same-origin-allow-popups` (la ventana de Google la
  necesita) y HSTS solo en producción. Si se añade un servicio externo, hay que
  abrirlo en la CSP (`connect-src`, `frame-src`…).
- **Redirecciones:** `?next=` del login solo acepta rutas de la propia web
  (resuelto con `URL`, rechaza `//` y `/\`).

## Flujo de datos y sincronización

1. `AuthProvider` (raíz) resuelve la sesión; `AuthGate` redirige a `/login?next=…`
   sin sesión. Esto es experiencia de navegación: **la seguridad real la imponen
   las reglas**.
2. El layout del proyecto **no lee `params` en el servidor**: `ProjectWorkspace`
   usa `useParams()` (dentro de `<Suspense>`). Así toda la ruta es estática y Next
   la precarga: cambiar de vista no espera al servidor y el workspace (con sus
   listeners) persiste entre vistas. Un `key={projectId}` interno lo recrea al
   cambiar de proyecto.
3. `useWorkspaceSubscription(projectId)`: 4 listeners (proyecto, milestones,
   tareas, GDD). Con el primer snapshot de los cuatro crea el store; después cada
   snapshot llama a `syncProject/syncMilestones/syncTasks/syncGdd`. Las tareas se
   aplican por `docChanges()`; `syncProject` conserva la lista de miembros si no
   cambió (cada tarea nueva toca `taskCounter`) para no re-renderizar avatares.
4. **Mutaciones** (`hooks/use-*-actions.ts` → `lib/firestore/*`): aplican el cambio
   en el store y escriben en Firestore (latency compensation). Si las reglas lo
   rechazan, el listener devuelve el estado real y se muestra un toast.
5. **GDD sin pisar lo que escribes:** `gddDirty` marca páginas con cambios aún no
   enviados; `syncGdd` conserva ese texto local frente a snapshots remotos.
6. Caché persistente de Firestore (IndexedDB, multipestaña) en producción; con el
   emulador, en memoria.
7. Drag & drop (`components/board/kanban-board.tsx`): copia local de columnas
   durante el arrastre; al soltar, **un único** `updateTask(status, position)`.
8. Selectores de Zustand: devolver campos del estado, nunca arrays/objetos
   nuevos (bucle infinito en Zustand 5). Derivar con `useMemo`.

## Mi panel, tareas y actividad

- `/` = **Mi panel**: mis tareas de todos los proyectos (vencidas, vencen esta
  semana, en curso, por hacer), invitaciones, proyectos y actividad reciente.
  Un listener de tareas por proyecto (`assigneeId == uid`) y otro de actividad.
  Los enlaces van a `/projects/{id}/board?tarea=<id>`, que abre esa tarea.
- **Panel de tarea:** propiedades (+ inicio, fecha límite, etiquetas), subtareas
  (checklist), "Bloqueada por" (dependencias), tiempo y pestañas Comentarios /
  Actividad (cargadas solo con el panel abierto).
- **Actividad:** `logActivity` (fire-and-forget) en crear, cambiar estado,
  asignar, cambiar de hito, borrar, comentar, registrar horas y unirse. La de
  una tarea se consulta por `taskId` sin orderBy (sin índice compuesto).
- **Tarjeta:** fecha límite (vencida en `warning`), subtareas, etiquetas,
  "Bloqueada" si una dependencia sigue abierta, responsable. Clic derecho =
  menú contextual (estado, prioridad, responsable, hito, fecha, horas,
  duplicar, copiar id, eliminar).

## Tablero, filtros y paleta

- Filtros del tablero en el store: hito visible, categorías (sidebar),
  **responsable** (`assigneeFilter`: null = todos, `UNASSIGNED`, o un uid),
  prioridad, etiquetas, fecha límite (`dueFilter`) y texto; más el orden
  (`boardSort`: manual, prioridad, fecha límite, estimación, actualización). `filterTasks`/`matchesAssignee` en `lib/board.ts`; el progreso del
  header respeta categoría y responsable. Una tarea nueva nace dentro de los
  filtros activos (categoría única, responsable).
- Atajos: `C` nueva tarea, `/` buscar, `M` mis tareas, `Ctrl/⌘+K` paleta,
  `E`/`N` en el GDD. El editor Markdown hace `stopPropagation` de sus atajos
  (Ctrl+K = enlace dentro del editor).
- **Paleta** (`components/command/command-palette.tsx`, montada en
  `ProjectWorkspace`, estado `paletteOpen` en el store): acciones, vistas,
  milestone del tablero, proyectos, búsqueda de tareas y páginas del GDD y
  "Crear tarea «texto»" (siempre visible al escribir, al final).

## Game Design Doc

- **Datos:** la estructura del árbol (`gddNodes`) y el Markdown (`gddContent`,
  por id) van en campos separados del store. `gddCollapsed` guarda los plegados.
- **Numeración** ("2.1", "2.4.1") calculada por `flattenGddTree`; nunca se guarda.
- **Navegación:** la sección activa sale de la URL (`/gdd/<nodeId>`). Dentro del
  GDD se navega con `window.history.pushState`.
- **Edición:** vista previa / editar (`E`). Contenido al store en cada tecla y a
  Firestore tras 700 ms (límite 200 000 caracteres por página).
- **Imágenes (gratis, sin Storage):** botón, arrastrar o pegar en el editor →
  marcador `![Subiendo …](#subiendo-…)` → `compressImage` (≤ 2048 px, WebP,
  ≤ 750 KB; las pequeñas y los GIF pequeños se guardan tal cual) →
  `uploadGddImage` crea un doc en `gddAssets` con los bytes → `![alt](asset:<id>)`.
  El visor deja pasar `asset:` (`urlTransform`) y `loadGddImage` lo convierte en
  una URL `blob:` (primero la caché de Firestore, luego red; memoria por sesión).
- **Borrar** una sección borra su subárbol, sus imágenes (`gddAssets` por
  `nodeId`) y desvincula sus tareas, todo en un batch. Una imagen quitada del
  texto a mano se queda guardada (no hay limpieza de huérfanas).
- **Vinculación bidireccional** tarea ↔ sección (`GddSelect`, botón ↗, `C`).
- **Visor:** `react-markdown` no interpreta HTML crudo (seguro).

## Milestones, backlog y métricas

- **Milestones:** agrupados por estado; reparto por estado, aviso "por detrás del
  calendario" (>15 puntos) y horas registradas frente a estimadas.
- **Completar** un milestone es un batch que mueve sus tareas abiertas.
- **Backlog** = tareas con `milestoneId = null`.
- **Registro de horas** +0,5/+1/+2/+4 h (o libre) con deshacer.
- **Métricas:** un selector de ámbito; gráficos HTML/SVG a medida con vista de
  tabla (skill de dataviz): horas por disciplina, estados, **burndown** del hito
  (horas pendientes por día a partir de `completedAt`, alcance actual, línea
  ideal) y **velocidad** (horas cerradas por hito y media). **Colores de estado** = paleta validada (`TASK_STATUSES`);
  si se cambian, revalidar con `validate_palette.js` en oscuro sobre `#0f1011`.
- **Fechas en render:** cálculos con "ahora" por días (`daysUntil`,
  `elapsedRatio`), nunca por milisegundos (hidratación).

## Reglas de datos y estado

1. **Firebase solo en el navegador.** `getFirebase()` lanza en el servidor; se
   llama desde efectos y handlers, nunca durante el render.
2. **Toda lectura/escritura pasa por `src/lib/firestore/*` o `lib/auth.ts`.**
   Los componentes no importan el SDK de Firebase.
3. **Mappers defensivos:** un documento raro nunca rompe la UI.
4. **Cambiar el modelo** = actualizar a la vez: tipos (`lib/types.ts`), mappers,
   escrituras (`lib/firestore/*`), `firestore.rules` (`hasOnly` y validaciones),
   enums en `lib/domain.ts` si aplica, y el proyecto de ejemplo.
5. **Errores:** `firestoreErrorMessage()`, `authErrorMessage()` e
   `imageErrorMessage()` traducen a toasts; `permission-denied` en un listener
   se muestra como "sin acceso", no se registra como error.
6. **Enums:** valores/tipos desde `@/lib/domain`; etiquetas/colores desde
   `@/lib/constants`.
7. **Toasts discretos** al crear/guardar/invitar/quitar; no en cada cambio de
   propiedad de una tarea (eso se guarda en silencio, como en Linear).

## Notas de Next.js 16

- Leer la guía correspondiente en `node_modules/next/dist/docs/` antes de usar
  APIs de Next (ver `AGENTS.md`): `params`/`searchParams` son Promises, existen los
  helpers globales `PageProps<"/ruta">` y `LayoutProps<"/ruta">`, `middleware`
  pasa a llamarse `proxy`.
- **Validación de navegación instantánea:** `experimental.instantInsights.
  validationLevel = "manual-warning"` en `next.config.ts` (los datos viven en el
  navegador y el servidor nunca puede prerenderizarlos). Solo se validan los
  segmentos que exporten `instant`; las páginas ya no necesitan `instant = false`.
- **Instancias ocultas:** con Cache Components, Next conserva páginas visitadas
  en un `<Activity>` oculto (`display: none`, efectos y refs desmontados). Puede
  haber dos `GddView` en el DOM: en pruebas automáticas, actuar solo sobre
  elementos visibles (`offsetParent`), nunca sobre el primer `querySelector`.
- `allowedDevOrigins: ["127.0.0.1"]`: el servidor de desarrollo funciona también
  en 127.0.0.1 (útil para probar con dos cuentas a la vez: localhost y 127.0.0.1).
- Las `NEXT_PUBLIC_*` se incrustan en el build: leerlas una a una (sin acceso
  dinámico a `process.env`) y reiniciar `next dev` al cambiarlas.

## Personalizaciones de shadcn

Al regenerar un componente con `npx shadcn add --overwrite` se pierden; reaplicarlas.
`shadcn add` pregunta si sobrescribir `dialog.tsx` (dependencia de `command`):
responder **No**.
- `tooltip.tsx`: oscuro con borde (`bg-popover`), sin flecha, `sideOffset` 6.
- `kbd.tsx`: sin estilos para tooltip invertido.
- `sheet.tsx`: overlay `bg-black/40` sin blur; textos en español.
- `alert-dialog.tsx`: overlay `bg-black/40` sin blur.
- `dialog.tsx`: overlay `bg-black/40` sin blur; "Cerrar" en español.
- `command.tsx`: escrito a mano sobre cmdk (no generado): `CommandDialog` sin
  botón de cerrar, título accesible en español, filas `h-9`, `top-[18vh]`.
- `context-menu.tsx` y `popover.tsx`: escritos a mano sobre Radix con el
  aspecto de `dropdown-menu.tsx` (no generados).
- `sonner.tsx`: `theme="dark"` fijo (sin `next-themes`).
- `sidebar.tsx`: textos del toggle en español.
- `hooks/use-mobile.ts`: reescrito con `useSyncExternalStore` (el original no pasa el lint).
