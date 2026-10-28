# Temas pendientes para la reunión con el tutor

Lista viva: se añaden temas a medida que surgen y se anota la respuesta del tutor. Las respuestas que sean
decisiones pasan a la tabla **Decisiones** de `registro-iteraciones.md`.

## Tutoría del 2026-10-23 — resueltos

### Decisiones

| # | Tema | Propuesta | Respuesta del tutor |
| --- | --- | --- | --- |
| 1 | Nivel de SDD | *Spec-anchored* en lugar de *spec-as-source* | **Aprobado: spec-anchored** |
| 2 | Estrategia de ramas | `main` estable + rama corta por funcionalidad, fusionada por PR cuando converge y el pipeline está en verde | **Aprobado** |
| 3 | Stack técnico | PWA React + TypeScript; Python + FastAPI; PostgreSQL + pgvector; Claude API para el RAG; pytest, Playwright, k6; GitHub Actions + Docker | **Aprobado tal cual** |
| 4 | Despliegue | ¿Cloud u on-premise? | **Local con Docker + demo**; sin despliegue público |
| 5 | Presupuesto de IA | ¿Suscripción o API? | **Solo suscripción** de Claude |

### Formato y normativa

| # | Tema | Respuesta del tutor |
| --- | --- | --- |
| 6 | Plantilla | Plantilla LaTeX oficial en Overleaf (el alumno la aporta) |
| 7 | Citas | **APA** |
| 8 | Uso de IA | La UCLM lo exige, pero al ser un TFG basado en el uso de IA el tutor considera que no es necesario declararlo aparte |
| 9 | Fuentes del índice | **Aprobado:** Andrew Ng por la fuente primaria (*The Batch* n.º 359) |
| 10 | Spec Kit actual | **Aprobado:** incorporar `/speckit-converge` al apartado 3.3 |

### Alcance del producto

| # | Tema | Respuesta del tutor |
| --- | --- | --- |
| 11 | Funcionalidades | **Tratamientos fitosanitarios, fertilización, labores y cosechas.** SIEX: **formato compatible** (exportable), sin integración real |
| 12 | Ámbito normativo | **Estatal + Castilla-La Mancha** |
| 13 | Entrevistas | El alumno tiene contactos de agricultores |

## Pendientes para próximas tutorías

| # | Tema | Pregunta | Respuesta del tutor |
| --- | --- | --- | --- |
| 14 | Presupuesto del RAG | Con solo suscripción, ¿cómo se cubren las llamadas a la API de Claude del módulo RAG en la demo (la suscripción no incluye la API)? ¿Créditos de prueba, gasto mínimo propio o un modelo local? | |
| 15 | Declaración de IA | Confirmar por escrito, o en la normativa de TFG de la escuela, que no hace falta la declaración: la memoria también se redacta con ayuda de IA, no solo el producto | |
| 16 | Revisión de las funcionalidades | Cada funcionalidad se desarrolla en su rama y se fusiona en `main` por PR cuando el pipeline está en verde, `/speckit-converge` no deja tareas y el alumno la ha revisado. La PR se abre en borrador desde la fase 4 para que pueda seguirla y comentarla en GitHub. ¿Cómo prefiere revisar cada funcionalidad: comentando en la PR, en tutoría, o dando su visto bueno antes de cada fusión? ¿En qué fases (spec, plan, código)? Para comentar en la PR necesita acceso al repositorio | |
| 17 | Entrevistas a agricultores | Se harán 2 o 3 entrevistas breves y anónimas, con consentimiento oral, para el apartado 1.1 y para validar decisiones de uso (`guion-entrevistas.md`). ¿Exige la UCLM algún trámite para entrevistas en un TFG (modelo de consentimiento propio, comité de ética)? | |
