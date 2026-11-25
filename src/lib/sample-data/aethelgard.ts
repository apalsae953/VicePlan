import { md, type SeedProject } from "./types";

/**
 * Project: Aethelgard — Action RPG indie en tercera persona.
 * Proyecto principal de demo: el milestone activo es "Vertical Slice v0.2"
 * con 12 tareas repartidas entre todas las disciplinas y estados, y un GDD de
 * 6 secciones (con subpáginas) enlazado a las tareas que lo implementan.
 */
export const aethelgard: SeedProject = {
  key: "AET",
  name: "Project: Aethelgard",
  description:
    "Action RPG en tercera persona. Un caballero sin juramento recorre un reino que se desmorona tras la caída de su rey.",

  milestones: [
    {
      ref: "preprod",
      title: "Prototipo Core v0.1",
      description: "Pilares de diseño, concept art y prototipo jugable del combate en greybox.",
      status: "COMPLETED",
      startInDays: -60,
      endInDays: -19,
    },
    {
      ref: "vs",
      title: "Vertical Slice v0.2",
      description:
        "La Cripta de los Juramentos jugable de principio a fin, con calidad final de arte, audio y UI.",
      status: "ACTIVE",
      startInDays: -18,
      endInDays: 12,
    },
    {
      ref: "alpha",
      title: "Alpha Jugable v0.3",
      description: "Los tres primeros biomas completos, el primer jefe y el bucle de progresión.",
      status: "PLANNED",
      startInDays: 13,
      endInDays: 75,
    },
  ],

  gdd: [
    // ─── 1. Visión general ───────────────────────────────────────────────────
    {
      ref: "vision",
      title: "Visión general",
      content: md`
        ## Pitch

        > *Un caballero sin juramento recorre un reino que se desmorona, recuperando las almas de quienes juraron lealtad a un rey que ya no existe.*

        **Aethelgard** es un Action RPG en tercera persona de combate deliberado y exploración interconectada, pensado para sesiones de 30–60 minutos.

        ## Pilares de diseño

        | Pilar | Qué significa | Qué descartamos |
        | --- | --- | --- |
        | **Combate con peso** | Cada golpe compromete al jugador; leer al enemigo importa más que reaccionar rápido | Combos de 20 golpes, cancelaciones infinitas |
        | **Exploración que recompensa** | Atajos, secretos y lore escondidos en la arquitectura | Iconos en el mapa, marcadores de objetivo |
        | **Un mundo que se cuenta solo** | La historia se descubre en objetos, escenarios y enemigos | Cinemáticas largas, diálogos expositivos |

        ## Público objetivo

        - Jugadores de *soulslike* que buscan una experiencia más compacta (12–15 h).
        - Fans del RPG de acción que valoran la exploración por encima del grindeo.
        - Plataformas: **PC (Steam)** y **Steam Deck** como objetivo de rendimiento.

        ## Loop principal

        1. Explorar una zona y abrir atajos hacia el último santuario.
        2. Enfrentarse a enemigos que castigan los errores de lectura.
        3. Recuperar **Fragmentos de Juramento** y gastarlos en mejoras de postura y armas.
        4. Derrotar al guardián de la zona para desbloquear el siguiente bioma.
      `,
    },

    // ─── 2. Mecánicas de combate ─────────────────────────────────────────────
    {
      ref: "combat",
      title: "Mecánicas de combate",
      content: md`
        ## Principios

        El combate gira en torno a **tres recursos**: vida, stamina y postura. Todas las acciones ofensivas y defensivas consumen stamina; romper la postura del enemigo abre una ventana de daño crítico.

        ## Controles (mando)

        | Acción | Botón | Coste de stamina |
        | --- | --- | --- |
        | Ataque ligero | \`RB\` | 12 |
        | Ataque pesado | \`RT\` (mantener para cargar) | 28 |
        | Esquiva | \`B\` | 18 |
        | Parry / bloqueo | \`LB\` | 0 / 8 por golpe bloqueado |
        | Fijar objetivo | \`R3\` | — |

        ## Reglas generales

        - Sin *animation cancel* salvo los casos definidos en el sistema de combos.
        - El daño recibido durante una acción ofensiva aplica **+15 %** (contragolpe).
        - Los enemigos comunes mueren en **6–8 golpes ligeros** al nivel recomendado.

        Ver las subpáginas para el detalle de cada sistema.
      `,
      children: [
        {
          ref: "combos",
          title: "Sistema de combos",
          content: md`
            ## Cadena ligera

            Tres golpes y un *finisher*. Los tiempos se exponen en un \`ScriptableObject\` para que diseño pueda ajustarlos sin tocar código.

            | Golpe | Startup | Activo | Recovery | Daño |
            | --- | --- | --- | --- | --- |
            | 1 | 8 f | 4 f | 14 f | 100 % |
            | 2 | 7 f | 4 f | 16 f | 110 % |
            | 3 | 10 f | 5 f | 18 f | 125 % |
            | Finisher | 14 f | 6 f | 28 f | 180 % + 30 postura |

            ## Reglas

            - **Buffer de entrada:** 200 ms durante el recovery del golpe anterior.
            - **Cancelación en esquiva** a partir del 2.º golpe (no durante los frames activos).
            - El finisher no se puede cancelar: es el compromiso que equilibra su daño.

            ## Criterios de aceptación

            - [x] Cadena de 3 golpes con buffer
            - [ ] Finisher con hit-stop de 80 ms
            - [ ] Tiempos editables en caliente desde el inspector
          `,
        },
        {
          ref: "parry",
          title: "Sistema de parry",
          content: md`
            ## Ventana

            Pulsar \`LB\` en los **150 ms** previos al impacto produce un parry perfecto. Fuera de esa ventana, la acción se convierte en un bloqueo normal.

            ## Recompensa

            | Resultado | Efecto en el enemigo | Efecto en el jugador |
            | --- | --- | --- |
            | Parry perfecto | +45 postura, *stagger* 0,6 s | +20 stamina |
            | Bloqueo | +10 postura | −8 stamina |
            | Fallo | — | Daño completo + contragolpe |

            ## Feedback

            - Hit-stop de **90 ms** y chispa blanca en el punto de contacto.
            - SFX metálico agudo, distinto del bloqueo (ver *Audio y UI*).
            - Vibración corta en ambos motores del mando.

            > ⚠️ Los ataques **marcados en rojo** (agarres, golpes de jefe en fase 3) no se pueden parrear y deben esquivarse.
          `,
        },
        {
          ref: "stamina",
          title: "Stamina y postura",
          content: md`
            ## Stamina

            - Máximo base: **100**. Regenera **35/s** tras 0,8 s sin consumir.
            - A 0 stamina el jugador queda *exhausto* 1,2 s: no puede esquivar ni atacar.

            ## Postura

            Cada enemigo tiene una barra de postura que se llena con golpes, bloqueos y parrys. Al llenarse queda **vulnerable a un golpe crítico** (×2,5 daño).

            | Tipo de enemigo | Postura máx. | Recuperación |
            | --- | --- | --- |
            | Común | 60 | 12/s |
            | Élite | 120 | 8/s |
            | Guardián (jefe) | 300 | 4/s |
          `,
        },
        {
          ref: "enemy-ai",
          title: "IA enemiga",
          content: md`
            ## Guardián de Ruinas

            Enemigo élite de la Cripta. Árbol de comportamiento con cuatro estados:

            1. **Patrulla** por waypoints con pausas aleatorias (2–4 s).
            2. **Alerta** al detectar al jugador en un cono de 70° y 12 m.
            3. **Combate**: alterna golpe de escudo (parreable) y barrido (no parreable).
            4. **Abandono** si el jugador se aleja más de 15 m durante 5 s.

            ## Directrices generales

            - Nunca más de **dos enemigos** atacando a la vez (sistema de tokens de agresión).
            - Todo ataque tiene un *tell* visual de al menos 300 ms.
          `,
        },
      ],
    },

    // ─── 3. Exploración y niveles ────────────────────────────────────────────
    {
      ref: "levels",
      title: "Exploración y niveles",
      content: md`
        ## Principios de diseño de niveles

        - **Interconexión:** cada zona tiene al menos dos atajos que vuelven al santuario.
        - **Señalización por arquitectura:** la luz, la verticalidad y los materiales guían; nunca un icono.
        - **Recompensa por curiosidad:** cada desvío opcional esconde lore, un objeto o un atajo.

        ## Métricas

        | Elemento | Valor |
        | --- | --- |
        | Altura de salto | 1,2 m |
        | Hueco máximo saltable | 3 m |
        | Ancho mínimo de pasillo en combate | 4 m |
        | Rejilla de construcción | 2 m |
      `,
      children: [
        {
          ref: "crypt",
          title: "Cripta de los Juramentos",
          content: md`
            ## Resumen

            Zona del Vertical Slice. Duración objetivo: **25–35 minutos** en la primera partida.

            ## Recorrido

            | Sala | Propósito | Enemigos |
            | --- | --- | --- |
            | 1. Nártex | Tutorial de fijar objetivo | 2 comunes |
            | 2. Galería de estatuas | Primer atajo (puerta lateral) | 3 comunes |
            | 3. Osario | Combate en espacio estrecho | 1 élite |
            | 4. Capilla inundada | Sala secreta tras pared falsa | 2 comunes |
            | 5. Cámara del Juramento | Jefe: Guardián de Ruinas | — |

            ## Secretos

            - Pared falsa en la Capilla inundada → **Fragmento de Juramento** y nota de lore.
            - Cadena de la lámpara en la Galería → atajo directo a la sala 5.
          `,
        },
      ],
    },

    // ─── 4. Lore y mundo ─────────────────────────────────────────────────────
    {
      ref: "lore",
      title: "Lore y mundo",
      content: md`
        ## Premisa

        El **Juramento de Plata** unía a los caballeros de Aethelgard con su rey: mientras él viviera, sus almas no podían corromperse. Cuando el rey murió en circunstancias nunca aclaradas, el juramento se rompió… y con él, la voluntad de sus caballeros.

        **Kael** es el único caballero que nunca llegó a jurar. Por eso sigue siendo él mismo.

        ## Temas

        - El peso de las promesas heredadas.
        - La lealtad a una idea frente a la lealtad a una persona.
        - La decadencia como algo bello y triste a la vez.

        ## Reglas de escritura

        - Ninguna línea de lore supera **3 frases**.
        - El jugador nunca recibe la respuesta completa: siempre falta una pieza.
      `,
      children: [
        {
          ref: "biomes",
          title: "Biomas",
          content: md`
            | Bioma | Ambiente | Enemigo característico | Milestone |
            | --- | --- | --- | --- |
            | **Ruinas de Velmora** | Ciudad derrumbada, niebla matinal | Caballero vacío | Alpha |
            | **Bosque de Ceniza** | Árboles calcinados, brasas flotantes | Lobo de ceniza | Alpha |
            | **Cripta de los Juramentos** | Piedra húmeda, velas, agua estancada | Guardián de Ruinas | Vertical Slice |

            Cada bioma usa un kit modular propio construido sobre la rejilla de 2 m.
          `,
        },
      ],
    },

    // ─── 5. Dirección de arte ────────────────────────────────────────────────
    {
      ref: "art",
      title: "Dirección de arte",
      content: md`
        ## Estilo

        Realismo **pictórico**: formas legibles a distancia, texturas pintadas a mano sobre una base PBR y siluetas exageradas en enemigos importantes.

        ## Paleta

        | Uso | Color | Notas |
        | --- | --- | --- |
        | Ambiente | Grises fríos y verdes musgo | Saturación < 25 % |
        | Acento del jugador | Plata | Armadura y efectos de Kael |
        | Peligro | Brasa (naranja rojizo) | Reservado a ataques no parreables |
        | Lore / secretos | Azul pálido | Luz de los Fragmentos de Juramento |

        ## Referencias

        - Pintura romántica del s. XIX (Friedrich, Turner) para cielos y escala.
        - Arquitectura gótica tardía para la Cripta.
      `,
      children: [
        {
          ref: "characters",
          title: "Personajes",
          content: md`
            ## Kael, el caballero sin juramento

            - Armadura incompleta: la hombrera izquierda nunca llegó a forjarse (la del juramento).
            - Capa raída con el emblema real arrancado.
            - Espada heredada de su maestro, con la hoja mellada.

            ### Especificaciones técnicas

            | Elemento | Presupuesto |
            | --- | --- |
            | Triángulos | ~45k |
            | Texturas | 2 sets de 4K (armadura / tela) |
            | Huesos | 72 + 18 de tela |
          `,
        },
      ],
    },

    // ─── 6. Audio y UI ───────────────────────────────────────────────────────
    {
      ref: "audio-ui",
      title: "Audio y UI",
      content: md`
        Audio e interfaz comparten un principio: **informar sin romper la inmersión**. Todo lo que el jugador necesita saber durante el combate debe poder entenderse sin mirar la pantalla y sin texto.
      `,
      children: [
        {
          ref: "music",
          title: "Música adaptativa",
          content: md`
            ## Capas por intensidad

            1. **Exploración:** drones de cuerda grave y coro lejano.
            2. **Tensión:** entra la percusión al detectar enemigos cercanos.
            3. **Combate:** tema completo con metales.

            Las transiciones se cuantizan al **compás** (nunca a mitad de frase) y bajan una capa 6 s después del último golpe.
          `,
        },
        {
          ref: "sfx",
          title: "Efectos de sonido",
          content: md`
            | Evento | Carácter | Variaciones |
            | --- | --- | --- |
            | Impacto de espada | Seco, medio-grave | 6 |
            | Bloqueo | Metal sordo | 4 |
            | Parry perfecto | Metal agudo con cola brillante | 3 |
            | Rotura de postura | Crujido + subgrave | 2 |

            Todos los SFX de combate se mezclan **3 dB por encima** de la música en estado de combate.
          `,
        },
        {
          ref: "hud",
          title: "HUD diegético",
          content: md`
            ## Principio

            Sin barras flotantes: **vida y stamina viven en el brazal** de Kael, visibles al levantar el brazo y siempre en la esquina inferior izquierda durante el combate.

            ## Elementos

            - [x] Vida y stamina en el brazal
            - [ ] Indicador de postura del enemigo fijado (anillo bajo los pies)
            - [ ] Contador de Fragmentos de Juramento al recogerlos (se oculta a los 3 s)
            - [ ] Sin minimapa ni brújula
          `,
        },
      ],
    },
  ],

  tasks: [
    // ─── Pre-producción (completado) ─────────────────────────────────────────
    { milestone: "preprod", title: "Documento de pilares de diseño",
      completedInDays: -42, status: "DONE", category: "DESIGN", priority: "HIGH", estimatedHours: 6, loggedHours: 5, gdd: "vision" },
    { milestone: "preprod", title: "Prototipo de combate en greybox",
      completedInDays: -35, status: "DONE", category: "PROGRAMMING", priority: "HIGH", estimatedHours: 24, loggedHours: 28, gdd: "combat" },
    { milestone: "preprod", title: "Moodboard y guía de color",
      completedInDays: -24, status: "DONE", category: "ART", priority: "MEDIUM", estimatedHours: 8, loggedHours: 8, gdd: "art" },

    // ─── Vertical Slice v0.2 (activo) ────────────────────────────────────────
    {
      milestone: "vs",
      title: "Sistema de combos de espada (3 golpes + finisher)",
      ref: "combos",
      dueInDays: 4,
      tags: ["combate", "core"],
      subtasks: [
        ["Cadena ligera de 3 golpes", true],
        ["Exponer tiempos en un ScriptableObject", true],
        ["Finisher con hit-stop", false],
      ],
      description:
        "Implementar la cadena ligera con buffer de entrada y cancelación en esquiva desde el segundo golpe. Exponer los tiempos en un ScriptableObject para que diseño pueda balancear.",
      status: "IN_PROGRESS",
      category: "PROGRAMMING",
      priority: "HIGH",
      estimatedHours: 12,
      loggedHours: 7,
      gdd: "combos",
      assignee: "me",
    },
    {
      milestone: "vs",
      title: "Parry con ventana de 150 ms y stagger",
      ref: "parry",
      dueInDays: 6,
      tags: ["combate"],
      blockedBy: ["combos"],
      description: "Detectar el parry perfecto, romper la postura del enemigo y devolver stamina. Necesita feedback de hit-stop y partícula de chispa.",
      status: "TODO",
      category: "PROGRAMMING",
      priority: "CRITICAL",
      estimatedHours: 8,
      gdd: "parry",
      assignee: "me",
    },
    {
      milestone: "vs",
      title: "IA del Guardián de Ruinas: patrulla y aggro",
      dueInDays: -1,
      tags: ["ia", "enemigos"],
      description: "Árbol de comportamiento con patrulla por waypoints, detección por cono de visión y persecución con abandono a los 15 m.",
      status: "TESTING",
      category: "PROGRAMMING",
      priority: "MEDIUM",
      estimatedHours: 10,
      loggedHours: 11.5,
      gdd: "enemy-ai",
      assignee: "me",
    },
    {
      milestone: "vs",
      title: "Modelo 3D de Kael: retopología y UVs",
      dueInDays: 8,
      tags: ["personajes"],
      subtasks: [
        ["Retopología a ~45k tris", true],
        ["UVs de la armadura", true],
        ["UVs de la tela", false],
      ],
      description: "Bajar el sculpt a ~45k tris, UVs en 2 sets de 4K (armadura / tela).",
      status: "IN_PROGRESS",
      category: "ART",
      priority: "HIGH",
      estimatedHours: 20,
      loggedHours: 11,
      gdd: "characters",
    },
    {
      milestone: "vs",
      title: "Tileset modular: Ruinas de Velmora",
      dueInDays: 10,
      tags: ["entornos"],
      description: "Kit de muros, arcos, escaleras y escombros con snapping a rejilla de 2 m.",
      status: "TODO",
      category: "ART",
      priority: "MEDIUM",
      estimatedHours: 16,
      gdd: "biomes",
    },
    {
      milestone: "vs",
      title: "Concept art del jefe: Wyrm de Ceniza",
      completedInDays: -12,
      tags: ["jefes"],
      status: "DONE",
      category: "ART",
      priority: "MEDIUM",
      estimatedHours: 10,
      loggedHours: 9,
      gdd: "art",
    },
    {
      milestone: "vs",
      title: "Balanceo de la curva de daño (niveles 1–5)",
      dueInDays: 2,
      tags: ["balance"],
      description: "Hoja de cálculo de DPS por arma y nivel; objetivo: 6–8 golpes para un enemigo común al nivel recomendado.",
      status: "TESTING",
      category: "DESIGN",
      priority: "HIGH",
      estimatedHours: 6,
      loggedHours: 4,
      gdd: "stamina",
      assignee: "me",
    },
    {
      milestone: "vs",
      title: "Layout de la Cripta de los Juramentos",
      completedInDays: -7,
      tags: ["niveles"],
      description: "Greybox jugable con dos atajos y una sala secreta.",
      status: "DONE",
      category: "DESIGN",
      priority: "HIGH",
      estimatedHours: 12,
      loggedHours: 13,
      gdd: "crypt",
      assignee: "me",
    },
    {
      milestone: "vs",
      title: "SFX de impactos: espada, escudo y parry",
      dueInDays: 5,
      tags: ["combate"],
      status: "IN_PROGRESS",
      category: "AUDIO",
      priority: "MEDIUM",
      estimatedHours: 8,
      loggedHours: 3,
      gdd: "sfx",
    },
    {
      milestone: "vs",
      title: "Tema musical de la cripta con capas adaptativas",
      dueInDays: 11,
      tags: ["música"],
      status: "TODO",
      category: "AUDIO",
      priority: "LOW",
      estimatedHours: 14,
      gdd: "music",
    },
    {
      milestone: "vs",
      title: "HUD diegético: vida y stamina en el brazal",
      completedInDays: -3,
      tags: ["hud"],
      status: "DONE",
      category: "UI_UX",
      priority: "HIGH",
      estimatedHours: 6,
      loggedHours: 7,
      gdd: "hud",
    },
    {
      milestone: "vs",
      title: "Bug: el jugador atraviesa colisiones al hacer dash contra esquinas",
      dueInDays: 1,
      tags: ["bug", "colisiones"],
      description: "Reproducible en la sala 3 de la cripta. Sospecha: el dash usa MovePosition sin sweep test.",
      status: "TESTING",
      category: "QA",
      priority: "CRITICAL",
      estimatedHours: 3,
      loggedHours: 2,
      assignee: "me",
    },

    // ─── Alpha v0.5 (planificado) ────────────────────────────────────────────
    {
      milestone: "vs",
      title: "Animaciones de ataque de Kael (ligero y pesado)",
      description: "Ciclos de ataque ligero (3) y pesado (2) con anticipación marcada para que el parry enemigo sea legible.",
      status: "IN_PROGRESS",
      category: "ANIMATION",
      priority: "HIGH",
      estimatedHours: 14,
      loggedHours: 6,
      gdd: "combos",
      dueInDays: 7,
      tags: ["combate", "personajes"],
    },
    {
      milestone: "vs",
      title: "Partículas de chispa y destello del parry",
      description: "Chispa en el punto de contacto, destello de pantalla de 2 frames y estela en el arma durante el stagger.",
      status: "TODO",
      category: "VFX",
      priority: "MEDIUM",
      estimatedHours: 6,
      gdd: "parry",
      dueInDays: 9,
      tags: ["combate"],
      blockedBy: ["parry"],
    },
    {
      milestone: "alpha",
      title: "Diálogos del Guardián y lore de la cripta",
      description: "Tres encuentros con el Guardián y cinco inscripciones legibles que cuenten la caída de la orden.",
      status: "TODO",
      category: "NARRATIVE",
      priority: "LOW",
      estimatedHours: 8,
      gdd: "lore",
      tags: ["lore"],
    },
    { milestone: "alpha", title: "Combate contra el Wyrm de Ceniza (3 fases)",
      tags: ["jefes", "combate"],
      blockedBy: ["parry"], status: "TODO", category: "PROGRAMMING", priority: "HIGH", estimatedHours: 40, gdd: "enemy-ai" },
    { milestone: "alpha", title: "Bioma: Bosque de Ceniza", status: "TODO", category: "ART", priority: "MEDIUM", estimatedHours: 60, gdd: "biomes" },
    { milestone: "alpha", title: "Indicador de postura del enemigo fijado", status: "TODO", category: "UI_UX", priority: "MEDIUM", estimatedHours: 5, gdd: "hud" },

    // ─── Backlog ─────────────────────────────────────────────────────────────
    { title: "Menú de inventario con navegación por mando", status: "TODO", category: "UI_UX", priority: "MEDIUM", estimatedHours: 5, gdd: "hud" },
    { title: "Smoke test de la build en Steam Deck", status: "TODO", category: "QA", priority: "HIGH", estimatedHours: 4 },
    { title: "Sistema de guardado en santuarios", status: "TODO", category: "PROGRAMMING", priority: "HIGH", estimatedHours: 10, gdd: "levels" },
    { title: "Optimizar shaders de niebla para Steam Deck", status: "TODO", category: "ART", priority: "MEDIUM", estimatedHours: 8, gdd: "biomes" },
    { title: "Ambiente sonoro de la Capilla inundada", status: "TODO", category: "AUDIO", priority: "LOW", estimatedHours: 6, gdd: "crypt" },
    { title: "Modo foto", status: "TODO", category: "DESIGN", priority: "LOW" },
  ],
};
