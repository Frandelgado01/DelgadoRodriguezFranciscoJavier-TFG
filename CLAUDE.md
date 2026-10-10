# CLAUDE.md — Cuaderno de Campo con SDD (TFG UCLM)

Contexto y reglas para cualquier agente que trabaje en este repositorio (Claude Code en VS Code, CLI o app).

## Proyecto

TFG de Francisco Javier Delgado Rodríguez (UCLM): Cuaderno de Campo digital para el agricultor desarrollado
con Spec-Driven Development (SDD) y agentes de IA. La especificación versionada es la fuente de verdad:
el alumno especifica y aprueba, el agente planifica e implementa, el pipeline CI/CD valida.

- Idioma de trabajo, artefactos y memoria: español.
- Índice de la memoria (v4): ver `docs/memoria/indice.md`.
- Forma de trabajo acordada (dónde, ciclo de iteración, roles, aprendizaje): `docs/proceso/forma-de-trabajo.md`.

## Regla obligatoria: registro del proceso

Tras CADA iteración con el alumno que produzca o cambie algo (artefacto, código, decisión, texto de la
memoria, configuración), actualiza `docs/proceso/registro-iteraciones.md` sin esperar a que te lo pidan:

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

- Formato de entrega: LaTeX con la plantilla oficial de la escuela. Borradores en `docs/memoria/`, un fichero
  por capítulo.
- El alumno revisa y reescribe con su voz todo borrador; el uso de IA se declara en el anexo si la UCLM lo exige.
- Cifras, normas y afirmaciones técnicas siempre con fuente citada (estilo único, IEEE o APA). Si no hay
  fuente, se marca como pendiente; nunca se inventan datos.
- Los capítulos 4 y 5 se redactan a partir del registro del proceso, no de memoria.
