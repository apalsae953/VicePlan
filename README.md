# VicePlan

Gestión ágil de proyectos para estudios de videojuegos: tableros Kanban por
milestone, tareas por disciplina con responsable y registro de horas, un GDD
jerárquico (con concept art) enlazado a las tareas y métricas de producción.
Multiusuario y en tiempo real sobre Firebase (Auth + Firestore), con
invitaciones por email, acceso como invitado y paleta de comandos (Ctrl/⌘ + K).

**Todo funciona en el plan gratuito de Firebase (Spark), sin tarjeta:** las
imágenes del GDD se comprimen en el navegador y se guardan en Firestore.

Inspirado en HacknPlan:

- **Mi panel**: tus tareas de todos los proyectos por urgencia, invitaciones y actividad.
- **Tablero** por hito con filtros (categoría, responsable, prioridad, etiqueta,
  fecha límite), orden y menú contextual en cada tarjeta.
- **Tareas** con fechas, etiquetas, subtareas, dependencias, comentarios,
  registro de horas e historial de actividad.
- **Categorías** configurables por proyecto (nombre, color, icono y orden).
- **Equipo**: invitación por email o por código / enlace `/unirse/CÓDIGO`.
- **Documento de diseño** jerárquico con imágenes, enlazado a las tareas.
- **Métricas**: horas por disciplina, estados, burndown y velocidad.
- **Imágenes**: foto de perfil y del proyecto (opcionales), imágenes en tareas (portada en la tarjeta, visor en grande) y en el documento de diseño.
- **Avisos por email** (asignaciones, comentarios, invitaciones, seguridad), configurables en Mi cuenta → Notificaciones. Necesitan `SMTP_USER` y `SMTP_PASS` (contraseña de aplicación de Gmail) en Vercel.

## Cuentas, seguridad y privacidad

- Acceso con **Google** (sin contraseña que perder), **email y contraseña**
  (mín. 8 caracteres con minúscula y número; ojo para verla y confirmación al
  crearla) o **invitado**. Recuperar la contraseña envía un email gratis desde
  Firebase (puede llegar a spam).
- **Mi cuenta**: cambiar nombre y contraseña, descargar tus datos (JSON) y
  eliminar la cuenta. El propietario de un proyecto puede transferirlo o
  eliminarlo.
- Reglas de Firestore por pertenencia, cabeceras de seguridad (CSP, sin
  iframes ajenos) y caché local borrada al cerrar sesión.
- Textos legales en `/legal/*` (RGPD, LOPDGDD y LSSI). **Antes de abrir la app
  al público, rellena tus datos en `src/lib/legal.ts`** y revisa los textos con
  un profesional. Si la publicas en un dominio propio, añádelo en Firebase →
  Authentication → Configuración → Dominios autorizados.

## Puesta en marcha

En producción: **https://viceplan.vercel.app** (Vercel, desde la rama `main`
de GitHub; la configuración de Firebase va en las variables de entorno del
proyecto de Vercel).

### Con el proyecto de Firebase (`controltrabajo-2xdnk`)

`.env.local` ya contiene la configuración. Para usar la app a diario, en modo
producción (mucho más rápido que el modo desarrollo):

```bash
npm install
npm run preview              # build + start → http://localhost:3000
```

Para desarrollar: `npm run dev`. Tras cambiar las reglas: `npm run rules:deploy`.

### Con otro proyecto de Firebase

```bash
cp .env.example .env.local   # pega la configuración de tu app web
npx firebase use <id>        # proyecto por defecto para los deploys
npx firebase deploy --only firestore:rules,firestore:indexes,auth
```

### Sin cuenta (emuladores locales, requiere Java 11+)

```bash
npm run emulators            # terminal 1: Auth + Firestore locales
npm run dev:emulators        # terminal 2: la app contra los emuladores
```

Stack, arquitectura, modelo de datos y reglas de diseño: ver [CLAUDE.md](CLAUDE.md).
