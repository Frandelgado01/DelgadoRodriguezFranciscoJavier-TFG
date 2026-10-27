<!--
Informe de impacto de sincronización
- Versión: 1.0.0 → 1.1.0 (MINOR: se añaden de forma material los umbrales de rendimiento a las restricciones
  técnicas).
- Principios modificados: ninguno.
- Secciones añadidas: "Umbrales de rendimiento (k6)" y "Métricas del RAG" en Restricciones técnicas.
- Secciones eliminadas: ninguna.
- TODO resueltos: TODO(UMBRALES_RENDIMIENTO), solo la parte de k6 (aceptada por el alumno el 2026-10-27, plan
  001, research R12).
- TODO pendientes: TODO(PRESUPUESTO_RAG) (pendientes-tutor #14); TODO(METRICAS_RAG), separado del anterior
  TODO(UMBRALES_RENDIMIENTO), para el plan de la 002.
- Plantillas: .specify/templates/plan-template.md ✅ sin cambios (la comprobación de constitución es genérica);
  spec-template.md ✅ sin cambios; tasks-template.md ✅ sin cambios; checklist-template.md ✅ sin cambios.
- Documentos: specs/001-registro-tratamientos/plan.md ✅ actualizado (comprobación de constitución con v1.1.0).
-->

# Constitución del Cuaderno de Campo

## Principios fundamentales

### I. La especificación es la fuente de verdad (*spec-anchored*)

- Todo comportamiento del sistema MUST estar descrito en un `spec.md` versionado antes de implementarse.
- Un cambio de requisito MUST hacerse primero en `spec.md` y propagarse después a `plan.md`, `tasks.md`,
  código y pruebas, en ese orden.
- El código que no corresponda a ningún requisito MUST eliminarse o motivar un cambio de la especificación.
- No se promete regenerar código idéntico: la conformidad con la especificación se demuestra con pruebas y con
  `/speckit-converge`.

**Motivo:** la especificación viva es lo que hace el sistema mantenible y auditable ante cambios normativos.

### II. Humano en el bucle

- El alumno MUST aprobar de forma explícita cada artefacto (constitución, especificación, plan, tareas) antes
  de pasar a la fase siguiente.
- Ningún cambio llega a `main` sin que el alumno lo haya revisado y entendido.
- Las decisiones del alumno (aceptar, rechazar o cambiar una propuesta de la IA) MUST quedar en
  `docs/proceso/registro-iteraciones.md`.

**Motivo:** el alumno responde del TFG; lo que no entiende no lo puede defender.

### III. Pruebas primero y trazabilidad (NO NEGOCIABLE)

- Cada requisito `REQ-xx` MUST tener criterios de aceptación Dado/Cuando/Entonces verificables.
- Los criterios de aceptación MUST convertirse en pruebas antes de implementar la tarea; la prueba falla
  primero y pasa después.
- Cada tarea `T-xx` MUST enlazar a su `REQ-xx`; cada commit de implementación empieza por `T-xx:`; cada prueba
  indica en su nombre o docstring el `REQ-xx` que verifica.
- Una funcionalidad no se da por terminada si algún `REQ-xx` no tiene prueba que pase.

**Motivo:** la cadena REQ → T → commit → prueba es la evidencia de que el producto cumple lo especificado.

### IV. Conformidad normativa con fuente

- Cada requisito derivado de una norma MUST citar la norma concreta (artículo o ficha oficial). Ámbito:
  normativa estatal y de Castilla-La Mancha.
- Los registros cubren tratamientos fitosanitarios, fertilización, labores y cosechas, y MUST poder
  exportarse en un formato compatible con el SIEX. No hay integración real con el SIEX.
- El módulo RAG MUST citar la fuente de cada respuesta. Si no encuentra respaldo en el corpus, MUST decir que
  no lo sabe en lugar de responder.
- Nunca se inventan datos normativos, plazos ni cifras.

**Motivo:** un error normativo puede costar al agricultor sanciones o ayudas.

### V. Centrado en el agricultor

- Las tareas de registro MUST poder hacerse desde el móvil en el campo, por texto o voz, en lenguaje natural.
- El registro de datos MUST funcionar sin conexión y sincronizarse al recuperarla (PWA).
- Todo registro que la IA genere a partir de lenguaje natural MUST mostrarse al agricultor para que lo confirme
  antes de guardarse.
- Los avisos de obligaciones y plazos MUST usar lenguaje llano, sin jerga jurídica innecesaria.

**Motivo:** el objetivo del TFG es reducir el tiempo y la fricción que la normativa supone para el agricultor.

### VI. Seguridad y privacidad

- Nunca se suben secretos al repositorio: las claves van en `.env` (ignorado) y las variables se documentan
  en `.env.example`.
- Los datos personales y de la explotación se tratan conforme al RGPD: mínimos necesarios y sin enviarse a
  servicios externos salvo lo imprescindible para el RAG.
- El pipeline MUST incluir análisis estático y de dependencias; una vulnerabilidad alta o crítica bloquea la
  fusión.

**Motivo:** el código generado por IA puede introducir dependencias inseguras o exponer datos.

### VII. Simplicidad

- Se implementa solo lo que pide la especificación (YAGNI); toda complejidad añadida MUST justificarse en
  `plan.md`.
- Se prefiere la solución más simple que cumpla los criterios de aceptación.

**Motivo:** el alcance y el tiempo de un TFG son limitados, y el código simple es más fácil de revisar.

## Restricciones técnicas

- **Frontend:** PWA con React + TypeScript.
- **Backend:** Python + FastAPI.
- **Datos:** PostgreSQL con pgvector (una sola base de datos para datos y vectores).
- **IA del producto:** Claude API para el módulo RAG. TODO(PRESUPUESTO_RAG): pendiente de cómo se financian las
  llamadas (pendientes-tutor #14).
- **Pruebas:** pytest (unitarias e integración), Playwright (E2E), k6 (rendimiento).
- **Umbrales de rendimiento (k6):** con 20 usuarios virtuales durante 2 minutos sobre una base sembrada con
  50 explotaciones (30 parcelas y 1 000 tratamientos cada una), el pipeline MUST fallar si no se cumple:
  menos del 1 % de peticiones fallidas (`http_req_failed: rate<0.01`); p95 < 500 ms al registrar un tratamiento;
  p95 < 300 ms en consultas y resto de peticiones. Son **umbrales iniciales** (plan 001, research R12) y se
  revisarán con las mediciones de la fase 7.
- **Métricas del RAG:** TODO(METRICAS_RAG): las métricas mínimas de fidelidad y relevancia se fijan en el plan de
  la funcionalidad 002 y se incorporan aquí por enmienda.
- **CI/CD:** GitHub Actions; contenedores Docker.
- **Despliegue:** local con Docker Compose y demo; sin despliegue público.
- **Idioma:** artefactos, interfaz, commits y documentación en español.

## Flujo de desarrollo y puertas de calidad

- **Ciclo SDD:** Constitución → Especificar → Clarificar → Planificar → Tareas → Implementar → Validar. Cada
  funcionalidad nueva recorre las fases 2 a 7 como una iteración corta.
- **Ramas:** `main` siempre estable. Una rama corta por funcionalidad, fusionada por PR. La documentación puede
  ir directa a `main`.
- **Puertas de fusión:** una PR solo se fusiona si (1) el pipeline está en verde, (2) `/speckit-converge` no
  deja tareas pendientes y (3) el alumno la ha revisado.
- **Bucle de implementación:** el agente itera implementar–probar–corregir con un límite de iteraciones por
  tarea; si lo alcanza, se detiene y consulta al alumno. Si una validación falla por un requisito mal definido,
  se vuelve a la fase 2.
- **Commits:** uno por tarea, en español; en implementación empiezan por `T-xx:`.
- **Registro:** cada iteración relevante se anota en `docs/proceso/registro-iteraciones.md` en el mismo commit
  que el trabajo que registra.

## Gobernanza

- Esta constitución prevalece sobre cualquier otra práctica del proyecto. `CLAUDE.md` y
  `docs/proceso/forma-de-trabajo.md` la desarrollan y no pueden contradecirla.
- **Enmiendas:** las propone el alumno o el agente; las aprueba el alumno, y el tutor si afectan a un principio.
  Cada enmienda se anota como decisión en el registro.
- **Versionado semántico:** MAJOR si se elimina o redefine un principio; MINOR si se añade un principio o
  sección o se amplía de forma material; PATCH si solo se aclara la redacción.
- **Cumplimiento:** cada `plan.md` MUST superar la comprobación de constitución antes de generar tareas, y cada
  PR se revisa contra estos principios.

**Versión**: 1.1.0 | **Ratificada**: 2026-10-23 | **Última enmienda**: 2026-10-27
