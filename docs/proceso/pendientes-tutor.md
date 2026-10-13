# Temas pendientes para la reunión con el tutor

Lista viva: se añaden temas a medida que surgen y se anota la respuesta del tutor. Las respuestas que sean
decisiones pasan a la tabla **Decisiones** de `registro-iteraciones.md`.

## Decisiones que necesitan su visto bueno

| # | Tema | Propuesta | Por qué se plantea | Respuesta del tutor |
| --- | --- | --- | --- | --- |
| 1 | Nivel de SDD | Presentar el TFG como *spec-anchored* (especificación viva que guía la evolución) y no como *spec-as-source* ("el código se puede regenerar") | Crítica de Böckeler: los LLM no son deterministas y el MDD fracasó por rigidez (módulo 01, apartado 5) | |
| 2 | Estrategia de ramas | `main` estable + una rama corta por funcionalidad, fusionada por PR cuando converge y el pipeline está en verde | Trunk-based development y CI (módulo 03, apartado 3) | |
| 3 | Stack técnico de la constitución | PWA React + TypeScript; API Python + FastAPI; PostgreSQL + pgvector; Claude API para el RAG; pytest, Playwright, k6; GitHub Actions + Docker | La constitución la aprueban alumno y tutor (índice, 3.2) | |
| 4 | Despliegue | ¿Cloud u on-premise? ¿Hay recursos de la universidad o se usa un proveedor externo? | Condiciona el plan, el pipeline y los costes (cap. 5) | |
| 5 | Presupuesto de IA | ¿Suscripción de Claude o API con créditos? ¿Hay financiación o créditos educativos? | Coste del desarrollo y de operación del RAG (5.1 y 5.2) | |

## Dudas de formato y normativa

| # | Tema | Pregunta | Respuesta del tutor |
| --- | --- | --- | --- |
| 6 | Plantilla | ¿Cuál es la plantilla LaTeX oficial de la escuela y dónde se descarga? | |
| 7 | Citas | ¿IEEE o APA? | |
| 8 | Uso de IA | ¿Exige la UCLM una declaración de uso de IA generativa? ¿Con qué formato? | |
| 9 | Fuentes del índice | Para Andrew Ng se cita la fuente primaria (*The Batch* n.º 359) en lugar de ADTmag, que no se ha localizado. ¿De acuerdo? | |
| 10 | Spec Kit actual | La versión instalada (1.2.0) añade `/speckit-converge` como criterio de parada del bucle. ¿Se incorpora al apartado 3.3? | |

## Alcance del producto

| # | Tema | Pregunta | Respuesta del tutor |
| --- | --- | --- | --- |
| 11 | Funcionalidades mínimas | ¿Qué registros entran en el alcance: tratamientos, fertilización, labores, cosechas? ¿Exportación al SIEX o solo un formato compatible? | |
| 12 | Ámbito normativo | ¿Normativa estatal más la de Castilla-La Mancha? ¿Qué documentos alimentan el RAG? | |
| 13 | Entrevistas | ¿Hay contactos de agricultores o de organizaciones agrarias para las 2–3 entrevistas del apartado 1.1? | |
