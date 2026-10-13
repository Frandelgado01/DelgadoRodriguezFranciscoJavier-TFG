# Módulo 02 — Claude Code y Spec Kit: comandos, skills, hooks y MCP

Guía de conceptos del TFG. Base para el apartado 2.3 (Herramientas de desarrollo) y para 4.3 (preparación del
proyecto en VS Code). Fuentes consultadas el 2026-10-13; las referencias van al final en formato IEEE.

## En una frase

Claude Code se configura con cinco piezas que se complementan: `CLAUDE.md` dice **qué reglas seguir**, las
skills y comandos dicen **cómo hacer tareas recurrentes**, Spec Kit dice **qué fase SDD toca y con qué
plantilla**, los hooks **garantizan comprobaciones automáticas** y MCP **conecta al agente con sistemas
externos**.

| Pieza | Dónde vive | Quién la activa | Garantía | Papel en el TFG |
| --- | --- | --- | --- | --- |
| `CLAUDE.md` | Raíz del repositorio | Se carga siempre | Ninguna: el modelo puede olvidarla | Reglas del proyecto y del registro |
| Skill / comando | `.claude/skills/<nombre>/SKILL.md` | El alumno (`/nombre`) o Claude, si es relevante | Ninguna: es una guía | Fases de Spec Kit; tareas recurrentes de la memoria |
| Spec Kit | `.claude/skills/speckit-*` y `.specify/` | El alumno, fase a fase | Estructura fija de artefactos | El ciclo SDD del capítulo 3 |
| Hook | `.claude/settings.json` | Claude Code, ante un evento | Sí: lo ejecuta el programa, no el modelo | Recordatorio del registro; linters y pruebas tras cada cambio |
| Servidor MCP | `.mcp.json` o `~/.claude.json` | Claude, al necesitar el dato o la acción | Depende del servidor | Acceso a la base de datos, GitHub y normativa |

## 1. Skills y comandos

Una **skill** es una carpeta con un fichero `SKILL.md`: una cabecera YAML con nombre y descripción, y debajo
instrucciones en Markdown. Puede incluir ficheros de apoyo como plantillas, referencias o scripts [1]. Siguen el
estándar abierto Agent Skills.

**Cómo se cargan (carga progresiva)** [1]:

1. Claude ve siempre solo el nombre y la descripción de cada skill disponible.
2. Si la petición encaja con la descripción, o si el alumno escribe `/nombre`, se carga el `SKILL.md` completo.
3. Los ficheros de apoyo solo se leen cuando hacen falta.

Por eso una skill larga apenas consume contexto hasta que se usa, a diferencia de `CLAUDE.md`, que se carga
siempre.

**Comandos.** Antes se distinguía entre *slash commands* (`.claude/commands/<nombre>.md`, que solo lanza el
usuario) y skills. Hoy están **unificados**: ambos crean `/nombre` y funcionan igual. La documentación
recomienda skills para trabajo nuevo, y los ficheros de `.claude/commands/` siguen funcionando [1]. Con
`disable-model-invocation: true`, una skill solo la puede lanzar el usuario, igual que un comando clásico.

**Ejemplo de uso en el TFG:** una skill `redactar-capitulo` que fije las normas de la memoria (LaTeX, IEEE,
nada de cifras sin fuente, tono). Claude la cargaría al pedirle un borrador.

## 2. GitHub Spec Kit

Spec Kit es un kit de código abierto (licencia MIT) que da a los agentes de código "procesos estructurados,
plantillas reutilizables y resultados documentados" [2]. Lleva SDD al agente en forma de skills, una por fase.

**Instalación** (requiere Python 3.11+ y `uv`) [3]:

```bash
uv tool install specify-cli
specify init --here --integration claude
```

Con la integración `claude`, Spec Kit instala sus skills en `.claude/skills` [4]. Además crea la carpeta
`.specify/`, con las plantillas, los scripts y el estado de la funcionalidad activa (`.specify/feature.json`) [3].

**Flujo completo** [3], y su correspondencia con las fases del capítulo 3.3:

| Fase TFG | Comando | Qué hace | Produce |
| --- | --- | --- | --- |
| 1 Constitución | `/speckit-constitution` | Fija los principios del proyecto (una vez) | `constitution.md` |
| 2 Especificar | `/speckit-specify` | Describe el qué y el porqué de la funcionalidad | `spec.md` |
| 3 Clarificar | `/speckit-clarify` | Hace preguntas dirigidas e integra las respuestas en la especificación | `spec.md` revisado |
| 4 Planificar | `/speckit-plan` | Fija el stack y la arquitectura | `plan.md` |
| 3–4 (puerta de calidad) | `/speckit-checklist` | Lista de comprobación de la calidad de los requisitos | `checklists/requirements.md` |
| 5 Tareas | `/speckit-tasks` | Descompone el plan en tareas ordenadas por dependencias | `tasks.md` |
| 5 (puerta de calidad) | `/speckit-analyze` | Revisión de solo lectura de conflictos y huecos entre spec, plan y tareas | Informe |
| 6 Implementar | `/speckit-implement` | Ejecuta las tareas en orden de dependencias | Código |
| 7 Validar | `/speckit-converge` | Contrasta el código con spec, plan y tareas; si hay huecos, se vuelve a `implement` hasta obtener **Converged** | Informe de convergencia |

Para funcionalidades pequeñas existe un camino corto: specify → plan → tasks → implement → converge [3].

**Ideas clave para la memoria:**

- Spec Kit **no programa por sí mismo**. Aporta estructura: plantillas fijas, orden obligatorio y revisión
  humana entre fases. El código lo escribe el agente (Claude Code).
- El par `implement` ↔ `converge` es un **bucle de loop engineering** con un criterio de parada explícito
  ("Converged"). Enlaza los apartados 2.2 y 3.3 de la memoria.
- Las puertas `clarify`, `checklist` y `analyze` atacan el riesgo principal de SDD: una especificación ambigua
  o incoherente produce mal código.

> Pendiente de verificar tras `specify init`: la ruta exacta de `constitution.md` y de la carpeta de cada
> funcionalidad (`specs/...`). La documentación consultada no las detalla [3].

## 3. Hooks

Un hook es una acción que **Claude Code ejecuta automáticamente** en un punto fijo de su ciclo de vida [5]. Se
configura en `.claude/settings.json` (compartido en el repositorio) o en `.claude/settings.local.json`
(personal).

**Eventos más útiles para el TFG** [5]:

| Evento | Cuándo se dispara | Uso en el TFG |
| --- | --- | --- |
| `SessionStart` | Al empezar o reanudar sesión | Inyectar el estado del proyecto (fase actual) |
| `UserPromptSubmit` | Al enviar un mensaje, antes de que Claude lo procese | **Ya en uso:** recordatorio del registro |
| `PreToolUse` | Antes de usar una herramienta; puede bloquearla | Impedir editar `.env` o hacer push con pruebas rotas |
| `PostToolUse` | Tras usar una herramienta con éxito | Linter y pruebas tras cada edición |
| `Stop` | Cuando Claude termina de responder; puede obligarle a seguir | Puerta final: no terminar si fallan las pruebas |

**Estructura:** evento → *matcher* (filtro por herramienta, p. ej. `Edit|Write`) → uno o varios manejadores
(un comando, una llamada HTTP, etc.) [5].

**El código de salida decide el efecto** [5]:

- `0`: todo correcto.
- `2`: señal de bloqueo. En `PreToolUse` impide la acción. En `PostToolUse` no deshace nada, pero **envía el
  error a Claude** para que lo corrija. En `Stop` obliga a Claude a seguir trabajando.
- Otro valor: error no bloqueante; solo se muestra un aviso.

**"Hooks que lanzan pruebas y linters":**

```text
Claude edita un fichero .py
  → hook PostToolUse (matcher Edit|Write) ejecuta ruff y pytest
  → si fallan: salida 2, el error llega a Claude
  → Claude corrige y se repite el ciclo
```

- Un **linter** (ruff para Python, ESLint para TypeScript) analiza el código sin ejecutarlo: estilo, errores
  típicos, imports sin usar, malas prácticas.
- Las **pruebas** (pytest) ejecutan el código y comprueban que cumple los criterios de aceptación.

**Diferencia con `CLAUDE.md`:** una regla en `CLAUDE.md` es una petición que el modelo puede olvidar; un hook
lo ejecuta el programa siempre. Es la "puerta de verificación" que pide el loop engineering.

**Riesgo:** un hook `Stop` que exige pasar las pruebas puede generar un bucle infinito si nunca pasan [5]. Por
eso el capítulo 3.3 fija un límite de iteraciones.

## 4. MCP (Model Context Protocol)

MCP es un protocolo abierto publicado por Anthropic el 25 de noviembre de 2024 para crear conexiones seguras y
bidireccionales entre fuentes de datos y aplicaciones de IA [6].

**Arquitectura** [6]:

- Un **servidor MCP** expone los datos o acciones de un sistema (una base de datos, GitHub, un servicio web).
- Un **cliente MCP** (Claude Code, y también otros agentes) se conecta a esos servidores.

Cualquier cliente compatible usa cualquier servidor sin integración a medida. Con el anuncio se publicaron
servidores para Google Drive, Slack, GitHub, Git, Postgres y Puppeteer [6].

**Qué ofrece un servidor** [7]:

- **Herramientas:** acciones que Claude puede invocar (crear un issue, ejecutar una consulta). En Claude Code se
  llaman `mcp__<servidor>__<herramienta>`.
- **Recursos:** datos que Claude puede leer.
- **Prompts:** plantillas de prompt que aporta el servidor.

**Cómo se añade a Claude Code** [7]:

```bash
claude mcp add --transport http <nombre> <url>                 # servidor remoto
claude mcp add --transport stdio <nombre> -- <comando local>   # servidor local
```

Los ámbitos son `local` (por defecto, solo tú y este proyecto), `project` (fichero `.mcp.json` versionado y
compartido) y `user` (todos tus proyectos). Para el TFG conviene `project`: la configuración queda en el
repositorio y es reproducible.

**Usos posibles en el TFG:**

| Servidor | Para qué |
| --- | --- |
| PostgreSQL | Consultar el esquema y los datos reales al implementar y depurar |
| GitHub | Crear issues por tarea y revisar los resultados de GitHub Actions |
| Documentación normativa | Consultar el BOE o las fichas del MAPA al especificar requisitos legales |

**Riesgo:** conecta solo servidores de confianza. Un servidor que trae contenido externo puede introducir
instrucciones maliciosas en el contexto del agente (*prompt injection*) [7]. Encaja en el apartado 3.5 (riesgos).

## 5. Cómo encaja todo en el TFG

```text
Fase SDD (Spec Kit /speckit-*)
  └─ Claude Code lee CLAUDE.md (reglas) y la constitución
      └─ genera o modifica ficheros
          └─ hook PostToolUse: linter + pruebas → si fallan, Claude corrige (bucle)
              └─ MCP: consulta la base de datos o GitHub cuando lo necesita
                  └─ /speckit-converge comprueba el código contra spec, plan y tareas
```

## Preguntas de autocomprobación

1. ¿Por qué un hook da más garantías que una regla en `CLAUDE.md`?
2. ¿Qué diferencia una skill de un comando clásico, y por qué hoy son casi lo mismo?
3. ¿Qué comando de Spec Kit materializa el loop engineering y cuál es su criterio de parada?
4. ¿Qué pasa si un hook `PostToolUse` termina con código 2? ¿Y uno `PreToolUse`?
5. ¿Qué ámbito de MCP usarías para que el tribunal pueda reproducir tu entorno, y por qué?

## Referencias

[1] Anthropic, "Extend Claude with skills", *Claude Code Docs*. [En línea]. Disponible en:
https://code.claude.com/docs/en/skills. [Accedido: 13-oct-2026].

[2] GitHub, "Spec Kit", repositorio *github/spec-kit*. [En línea]. Disponible en:
https://github.com/github/spec-kit. [Accedido: 13-oct-2026].

[3] GitHub, "Quickstart", *Spec Kit documentation*. [En línea]. Disponible en:
https://github.github.io/spec-kit/quickstart.html. [Accedido: 13-oct-2026].

[4] GitHub, "Integrations", *Spec Kit documentation*. [En línea]. Disponible en:
https://github.github.io/spec-kit/reference/integrations.html. [Accedido: 13-oct-2026].

[5] Anthropic, "Hooks reference", *Claude Code Docs*. [En línea]. Disponible en:
https://code.claude.com/docs/en/hooks. [Accedido: 13-oct-2026].

[6] Anthropic, "Introducing the Model Context Protocol", 25-nov-2024. [En línea]. Disponible en:
https://www.anthropic.com/news/model-context-protocol. [Accedido: 13-oct-2026].

[7] Anthropic, "Connect Claude Code to tools via MCP", *Claude Code Docs*. [En línea]. Disponible en:
https://code.claude.com/docs/en/mcp. [Accedido: 13-oct-2026].
