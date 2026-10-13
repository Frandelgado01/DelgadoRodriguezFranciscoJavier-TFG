# Registro de iteraciones con la IA

Fuente de datos para los apartados 3.4 (trazabilidad), 4.5 (resultados del proceso) y 5 (costes).
Añade una fila por sesión de trabajo con la IA. No reconstruyas datos a posteriori: anótalos al terminar
cada sesión.

## Cómo rellenarlo

- **Fase**: 1 Constitución · 2 Especificar · 3 Clarificar · 4 Planificar · 5 Tareas · 6 Implementar · 7 Validar · M Memoria
- **Herramienta**: Claude (chat/ideación), Claude Code (VS Code / CLI), otra
- **Iteraciones**: número de vueltas prompt → respuesta → corrección hasta aprobar el artefacto
- **Corrección manual**: qué tuvo que cambiar el alumno a mano (y, en fase 6, líneas aprox.)
- **Tokens / coste**: de `/cost` en Claude Code o de la consola de la API; si usas suscripción, indícalo
- **Minutos**: tiempo real del alumno en la sesión

## Sesiones

| Fecha | Fase | Herramienta | Artefacto | Prompt clave (resumen) | Iteraciones | Corrección manual | Tokens / coste | Minutos | Commit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-10-09 | — | Claude Code (app escritorio) | Repositorio base, registro | Arranque del proyecto a partir del índice v4 | 1 | — | suscripción | | 769fe58 |
| 2026-10-10 | — | Claude Code (app escritorio) | Ubicación del repositorio y remoto GitHub | Mover el proyecto fuera de OneDrive y conectarlo a GitHub | 1 | — | suscripción | | 769fe58 (push) |
| 2026-10-10 | — | Claude Code (app escritorio) | `CLAUDE.md`, `.claude/settings.json`, `docs/memoria/indice.md` | Registrar automáticamente cada iteración durante todo el TFG | 1 | — | suscripción | | 52519f9 |
| 2026-10-10 | — | Claude Code (app escritorio) | `docs/proceso/forma-de-trabajo.md` | Definir la forma de trabajo (dónde, ciclo, roles, aprendizaje, memoria) | 1 | — | suscripción | | 52519f9 |
| 2026-10-13 | M | Claude Code (app escritorio) | `docs/conceptos/02-claude-code-y-spec-kit.md` | Explicar skills, Spec Kit, hooks (pruebas y linters) y MCP; guardarlo como módulo 02 con fuentes | 2 | — | suscripción | | d5651e7 |
| 2026-10-13 | M | Claude Code (app escritorio) | `docs/conceptos/01-paradigmas-desarrollo-con-ia.md` | Módulo 01: vibe coding, SDD y loop engineering con fuentes primarias (base del apartado 2.2) | 1 | — | suscripción | | |

## Decisiones

Decisiones relevantes del alumno (qué se aceptó, qué se rechazó y por qué). Alimentan 4.1–4.3.

| Fecha | Fase | Decisión | Alternativas descartadas | Motivo |
| --- | --- | --- | --- | --- |
| 2026-10-09 | — | Seguir el índice v4 (SDD + loop engineering, Spec Kit sobre Claude Code) | — | Acordado con el tutor |
| 2026-10-10 | — | Repositorio en `C:\Users\frand\TFG`, fuera de OneDrive | Mantenerlo en `OneDrive\Escritorio\TFG` | La sincronización de OneDrive provoca bloqueos y conflictos con `.git` y `node_modules`; GitHub actúa como copia de seguridad |
| 2026-10-10 | — | Remoto en GitHub: `Frandelgado01/DelgadoRodriguezFranciscoJavier-TFG` | Solo repositorio local | Copia de seguridad y base para el pipeline CI/CD con GitHub Actions |
| 2026-10-10 | — | El agente actualiza este registro tras cada iteración (regla en `CLAUDE.md` + hook `UserPromptSubmit`) | Que el alumno lo rellene a mano al final de cada sesión | Evitar olvidos y reconstrucciones a posteriori; el hook recuerda la regla también en VS Code |
| 2026-10-10 | — | Commit y push automáticos al cerrar cada iteración | Commit solo local; commit solo a petición | Cada iteración queda en GitHub con su fila del registro: trazabilidad y copia de seguridad |
| 2026-10-10 | M | Memoria en LaTeX con la plantilla de la escuela | Word; Markdown → PDF | Elección del alumno |
| 2026-10-10 | — | Redactar la memoria en paralelo a la implementación, tras fijar la forma de trabajo y los conceptos | Instalar Spec Kit y empezar ya la fase 1 | El alumno quiere dominar los conceptos antes de construir para poder seguir el desarrollo |
| 2026-10-10 | — | Fases SDD en Claude Code en VS Code; memoria y conceptos en VS Code o app de escritorio | Todo en la app de escritorio | Coherencia con lo que describe la memoria (4.3): diffs, hooks y revisión en el editor |
| 2026-10-13 | — | El agente registra cuando lo considere oportuno, avisando antes al alumno (cambio del alumno en `CLAUDE.md`) | Registro automático tras cada iteración sin aviso (decisión del 2026-10-10) | El alumno quiere estar al tanto de cada anotación |
| 2026-10-13 | 1 | Usar la versión actual de Spec Kit: `uv tool install specify-cli` + `specify init --integration claude`; skills `/speckit-*` en `.claude/skills`, con `clarify`, `checklist`, `analyze` y `converge` | Comandos `/speckit.*` en `.claude/commands` (versión anterior, explicada en el chat por error) | La documentación oficial consultada el 2026-10-13 muestra el formato actual; `converge` aporta el criterio de parada del bucle de implementación |
| 2026-10-13 | M | PROPUESTA pendiente de aprobación: presentar el TFG como SDD *spec-anchored* (especificación viva que guía la evolución) | *Spec-as-source* ("el código se puede regenerar", del índice) | Crítica de Böckeler: no determinismo de los LLM y rigidez histórica del MDD |
| 2026-10-13 | M | Citar a Andrew Ng por la fuente primaria (The Batch n.º 359) | ADTmag, citado en el índice | No se localizó el artículo de ADTmag |
