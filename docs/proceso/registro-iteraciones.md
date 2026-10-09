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
| 2026-10-09 | — | Claude Code (app escritorio) | Repositorio base, registro | Arranque del proyecto a partir del índice v4 | 1 | — | suscripción | | |

## Decisiones

Decisiones relevantes del alumno (qué se aceptó, qué se rechazó y por qué). Alimentan 4.1–4.3.

| Fecha | Fase | Decisión | Alternativas descartadas | Motivo |
| --- | --- | --- | --- | --- |
| 2026-10-09 | — | Seguir el índice v4 (SDD + loop engineering, Spec Kit sobre Claude Code) | — | Acordado con el tutor |
