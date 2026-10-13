# Cuaderno de Campo con SDD

Trabajo Fin de Grado (UCLM). Cuaderno de Campo digital para el agricultor, desarrollado mediante
desarrollo dirigido por especificaciones (SDD) con agentes de IA (Claude Code en VS Code).

La especificación versionada en este repositorio es la fuente de verdad: el alumno especifica,
la IA planifica e implementa, y el pipeline CI/CD valida contra los criterios de aceptación.

## Estructura

| Ruta | Contenido |
| --- | --- |
| `.specify/memory/constitution.md` | Principios no negociables del proyecto (fase 1) |
| `specs/<NNN-nombre>/` | `spec.md`, `plan.md` y `tasks.md` de cada funcionalidad (fases 2–5) |
| `.claude/skills/speckit-*` | Skills de GitHub Spec Kit (`/speckit-constitution`, `/speckit-specify`…) |
| `.specify/` | Plantillas y scripts de Spec Kit |
| `docs/conceptos/` | Guía de conceptos del TFG |
| `docs/proceso/` | Registro de iteraciones con la IA y métricas del proceso (cap. 3.4, 4.5 y 5) |
| `docs/memoria/` | Borradores de la memoria del TFG |
| `CLAUDE.md` | Reglas y contexto para el agente |

## Trazabilidad

Cadena `REQ-xx → T-xx → commit → prueba`. Cada commit de implementación referencia su tarea
(`T-xx`) y cada prueba su requisito (`REQ-xx`).
