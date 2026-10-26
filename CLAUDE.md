# CLAUDE.md — Cuaderno de Campo con SDD (TFG UCLM)

Contexto y reglas para cualquier agente que trabaje en este repositorio (Claude Code en VS Code, CLI o app).

## Proyecto

TFG de Francisco Javier Delgado Rodríguez (UCLM): Cuaderno de Campo digital para el agricultor desarrollado
con Spec-Driven Development (SDD) y agentes de IA. La especificación versionada es la fuente de verdad:
el alumno especifica y aprueba, el agente planifica e implementa, el pipeline CI/CD valida.

- Idioma de trabajo, artefactos y memoria: español.
- Índice de la memoria (v4): ver `docs/memoria/indice.md`.
- Forma de trabajo acordada (dónde, ciclo de iteración, roles, aprendizaje): `docs/proceso/forma-de-trabajo.md`.
- Acuerdos con el tutor (2026-10-23): SDD *spec-anchored*; rama corta por funcionalidad; stack PWA React +
  TypeScript, Python + FastAPI, PostgreSQL + pgvector, Claude API, pytest/Playwright/k6, GitHub Actions + Docker;
  despliegue local con Docker + demo; alcance: tratamientos, fertilización, labores y cosechas, con formato
  compatible con el SIEX; normativa estatal + Castilla-La Mancha. Detalle en `docs/proceso/pendientes-tutor.md`.
- **Ámbito territorial: solo Castilla-La Mancha.** Se usa únicamente normativa europea y estatal aplicable y la
  de Castilla-La Mancha; nunca normativa, herramientas ni ejemplos específicos de otras comunidades autónomas
  (indicación del alumno, 2026-10-26). Vale para la especificación, el corpus del RAG y la memoria.
- Base normativa de los requisitos: `docs/conceptos/04-normativa-cuaderno-de-campo.md`. Acordado (2026-10-26):
  las cosechas son un registro voluntario de apoyo al cumplimiento (comprobar el plazo de seguridad) y las
  labores se ligan a las prácticas de ecorregímenes (RD 1048/2022), con aviso del plazo de un mes.

## Regla obligatoria: registro del proceso

Cuando el agente considere que es oportuno registrar un proceso (artefacto, código, decisión, texto de la memoria, configuración), actualiza `docs/proceso/registro-iteraciones.md` avisando previamente al alumno:

1. Añade una fila en **Sesiones** (fecha, fase, herramienta, artefacto, prompt clave resumido, iteraciones,
   corrección manual, tokens/coste, minutos, commit). Si la iteración continúa una fila del mismo día y
   artefacto, actualiza esa fila en lugar de duplicarla.
2. Si el alumno tomó una decisión (aceptó, rechazó o cambió algo propuesto por la IA), añádela en
   **Decisiones** con alternativas y motivo.
3. No inventes datos: lo que no puedas medir (minutos del alumno, tokens si no hay `/cost`) déjalo vacío
   para que lo complete el alumno.
4. Incluye el cambio del registro en el mismo commit que el trabajo que registra.
5. Al cerrar cada iteración haz commit y push a `origin main` sin esperar a que te lo pidan (acordado con el
   alumno el 2026-10-10).

Las preguntas sin cambios (dudas, explicaciones) no generan fila.

## Ciclo SDD

Fases: 1 Constitución · 2 Especificar · 3 Clarificar · 4 Planificar · 5 Tareas · 6 Implementar · 7 Validar.
No pases de fase sin la aprobación explícita del alumno. Un cambio de requisito se hace primero en
`spec.md` y luego se propaga a plan, tareas, código y pruebas.

## Trazabilidad y commits

- Requisitos `REQ-xx` en `spec.md`; tareas `T-xx` en `tasks.md`, cada una enlazada a su `REQ`.
- Un commit por tarea. Mensaje en español; en implementación empieza por la tarea: `T-07: ...`.
- Cada prueba indica en su nombre o docstring el `REQ-xx` que verifica.
- Nunca subir secretos: claves en `.env` (ignorado); documentar variables en `.env.example`.

## Memoria del TFG

- Formato de entrega: LaTeX con la plantilla oficial de la ESI-UCLM, en `docs/memoria/latex/` (raíz
  `principal.tex`, capítulos en `Caps/`, anexos en `Anexos/`, bibliografía en `bibliografia.bib`). Compilación
  local con pdflatex + bibtex. El contenido pendiente se marca con `\pendiente{...}`.
- El alumno revisa y reescribe con su voz todo borrador; el uso de IA se declara en el anexo si la UCLM lo exige.
- Cifras, normas y afirmaciones técnicas siempre con fuente citada en **APA** (acordado con el tutor). Si no hay
  fuente, se marca como pendiente; nunca se inventan datos.
- Los capítulos 4 y 5 se redactan a partir del registro del proceso, no de memoria.
