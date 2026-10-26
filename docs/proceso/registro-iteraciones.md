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
| 2026-10-13 | M | Claude Code (app escritorio) | `docs/conceptos/01-paradigmas-desarrollo-con-ia.md` | Módulo 01: vibe coding, SDD y loop engineering con fuentes primarias (base del apartado 2.2) | 1 | — | suscripción | | e11fab7 |
| 2026-10-13 | M | Claude Code (app escritorio) | `docs/conceptos/03-git-github-y-trazabilidad.md` | Módulo 03: Git, GitHub, estrategia de ramas, trazabilidad REQ → T → commit → prueba (base de 3.4 y 4.4) | 1 | — | suscripción | | 805541d |
| 2026-10-13 | 1 | Claude Code (app escritorio) | Instalación de `uv` 0.13.0 y `specify-cli` 1.2.0; `specify init --here --integration claude --script ps` (`.claude/skills/speckit-*`, `.specify/`) | Instalar uv y Spec Kit para preparar la fase 1 | 1 | — | suscripción | | 62bed1b |
| 2026-10-13 | M | Claude Code (app escritorio) | `docs/proceso/pendientes-tutor.md`; módulos 02 y 03 actualizados con lo verificado | Preparar los temas para la reunión con el tutor | 1 | — | suscripción | | 62bed1b |
| 2026-10-23 | — | Claude Code (app escritorio) | `pendientes-tutor.md`, `CLAUDE.md`, `indice.md`, `forma-de-trabajo.md` | Recoger las respuestas de la tutoría (13 temas) y propagarlas a las reglas y al índice | 1 | — | suscripción | | 2305729 |
| 2026-10-23 | 1 | Claude Code (VS Code) | `.specify/memory/constitution.md` v1.0.0 | `/speckit-constitution` a partir de los acuerdos de la tutoría y del índice v4 | 1 | — | suscripción | | 7713869 |
| 2026-10-23 | M | Claude Code (app escritorio) | `docs/memoria/latex/` (plantilla ESI-UCLM adaptada al índice v4), `bibliografia.bib` (APA), `.vscode/` | Integrar la plantilla LaTeX de Overleaf y preparar la compilación local | 1 | — | suscripción | | 35aad35 |
| 2026-10-23 | M | Claude Code (app escritorio) | Primera compilación de la memoria (MiKTeX 25.12): 45 páginas, sin avisos; APA en español (`spanish.apc`) | Comprobar la compilación local tras instalar MiKTeX y LaTeX Workshop | 2 | — | suscripción | | a2a5a84 |
| 2026-10-23 | M | Claude Code (app escritorio) | `Caps/2_EstadoDelArte.tex`, apartado 2.2 (borrador) | Redactar el 2.2 (vibe coding, SDD, loop engineering, comparativa y enfoque) a partir del módulo 01, con citas APA | 1 | Ninguna por ahora: el alumno lo acepta el 2026-10-26 ("me gusta cómo va") | suscripción | | 3f89ff6 |
| 2026-10-26 | 2 | Claude Code (app escritorio) | `docs/conceptos/04-normativa-cuaderno-de-campo.md`; 8 normas añadidas a `bibliografia.bib` | Investigar la normativa (BOE, DOCM, MAPA) antes de especificar la primera funcionalidad | 1 | — | suscripción | | 9d11ae0 |
| 2026-10-26 | M | Claude Code (app escritorio) | `Caps/2_EstadoDelArte.tex`, apartado 2.1 (borrador); módulo 04 (pendientes 2 y 4 resueltos: documentación técnica SIEX del FEGA, app SGA_CEX de la JCCM) | Redactar el 2.1 (marco normativo, soluciones existentes y carencias) mientras la sesión de VS Code ejecuta `/speckit-specify` | 1 | Pendiente de revisión del alumno | suscripción | | 871d995 |
| 2026-10-26 | M | Claude Code (app escritorio) | `CLAUDE.md`, `Caps/2_EstadoDelArte.tex` | Limitar el ámbito a normativa estatal y de Castilla-La Mancha; quitar la mención a herramientas de otras comunidades del 2.1 | 1 | — | suscripción | | 38bf903 |
| 2026-10-26 | — | Claude Code (app escritorio) | `docs/proceso/hoja-de-ruta.md` | Explicar cuándo llega la implementación y el RAG; proponer el orden de las funcionalidades 001–007 | 1 | — | suscripción | | |

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
| 2026-10-13 | M | PROPUESTA (resuelta el 2026-10-23, ver abajo): presentar el TFG como SDD *spec-anchored* (especificación viva que guía la evolución) | *Spec-as-source* ("el código se puede regenerar", del índice) | Crítica de Böckeler: no determinismo de los LLM y rigidez histórica del MDD |
| 2026-10-13 | M | Citar a Andrew Ng por la fuente primaria (The Batch n.º 359) | ADTmag, citado en el índice | No se localizó el artículo de ADTmag |
| 2026-10-13 | 2 | PROPUESTA (resuelta el 2026-10-23, ver abajo): `main` estable + una rama corta por funcionalidad, fusionada por PR cuando converge y el pipeline está en verde; documentación directa a `main` | Todo en `main`; GitFlow con ramas largas | Trunk-based development facilita la CI; la rama por funcionalidad encaja con Spec Kit |
| 2026-10-13 | 1 | Instalar `uv` con pip (PyPI) y Spec Kit con `uv tool install specify-cli`; añadir sus carpetas al PATH del usuario | Instalador oficial de uv; ejecutar siempre con `python -m uv` | Instalación desde fuentes oficiales; `uv` y `specify` disponibles en cualquier terminal, incluida la de VS Code |
| 2026-10-13 | 1 | Spec Kit sin la extensión `git`: las ramas por funcionalidad se crearán a mano | `--extension git` | El núcleo solo crea `specs/<NNN-nombre>/`; la estrategia de ramas está pendiente del tutor |
| 2026-10-23 | 3 | SDD *spec-anchored* (tutor) | *Spec-as-source* | La especificación guía la evolución; la conformidad se garantiza con pruebas y converge, no regenerando código |
| 2026-10-23 | 2 | Rama corta por funcionalidad, fusión por PR con converge y pipeline en verde (tutor) | Todo en `main` | Trunk-based development y CI |
| 2026-10-23 | 1 | Stack aprobado tal cual: PWA React + TypeScript, Python + FastAPI, PostgreSQL + pgvector, Claude API, pytest/Playwright/k6, GitHub Actions + Docker (tutor) | App nativa; base vectorial aparte; LLM local | Ecosistema RAG en Python, una sola base de datos, PWA usable sin conexión en el campo |
| 2026-10-23 | 1 | Despliegue local con Docker + demo (tutor) | Cloud externo; servidores de la UCLM | Sin despliegue público; reduce coste e infraestructura |
| 2026-10-23 | — | Solo suscripción de Claude como gasto de IA (tutor) | API de pago por uso; créditos educativos | Pendiente: cómo cubrir las llamadas a la API del RAG (pendientes-tutor #14) |
| 2026-10-23 | M | Citas en APA con la plantilla LaTeX de la escuela (Overleaf) (tutor) | IEEE | Elección del tutor; los módulos de conceptos (IEEE) se convertirán al pasar a la memoria |
| 2026-10-23 | M | Sin declaración aparte de uso de IA, al ser un TFG sobre el uso de IA (tutor) | Anexo con declaración | Criterio del tutor; pendiente de confirmar en la normativa (pendientes-tutor #15) |
| 2026-10-23 | M | Andrew Ng por *The Batch* n.º 359 y `/speckit-converge` en el apartado 3.3 (tutor) | ADTmag; ciclo sin converge | Fuente primaria; converge es el criterio de parada del bucle |
| 2026-10-23 | 2 | Alcance: tratamientos fitosanitarios, fertilización, labores y cosechas; formato compatible con el SIEX; normativa estatal + Castilla-La Mancha (tutor) | Integración real con el SIEX; solo normativa estatal | Viable para un TFG; la integración real queda como trabajo futuro |
| 2026-10-23 | 1 | Aprobar la constitución v1.0.0: 7 principios (spec-anchored, humano en el bucle, pruebas primero y trazabilidad, conformidad normativa con fuente, centrado en el agricultor, seguridad y privacidad, simplicidad), restricciones técnicas, puertas de calidad y gobernanza. Incluye tres propuestas del agente: confirmación del agricultor antes de guardar lo generado por la IA, RAG que responde "no lo sé" sin respaldo, RGPD y bloqueo por vulnerabilidades altas | Fijar ya umbrales de rendimiento y del RAG; esperar al tutor para ratificar | Umbrales sin base hasta la fase 4 (se añadirán por enmienda, v1.1.0); presupuesto del RAG pendiente (pendientes-tutor #14); ratificada por el alumno, pendiente de visto bueno del tutor |
| 2026-10-23 | M | Compilar la memoria en local (MiKTeX + LaTeX Workshop en VS Code, receta pdflatex/bibtex sin latexmk) | Compilar en Overleaf sincronizando a mano | El repositorio es la única fuente de verdad y cada cambio de la memoria queda versionado |
| 2026-10-23 | M | Estructura de la memoria según el índice v4; se añade "Valoración personal" de la plantilla ESI en conclusiones | Estructura de ejemplo de la plantilla (Objetivo, Plan de gestión…) | El índice está aprobado por el tutor; la plantilla es una guía |
| 2026-10-23 | M | Datos de portada (título, tutor/a, departamento, intensificación, fecha) marcados como PENDIENTE | Rellenarlos provisionalmente | Se rellenan cuando sean oficiales |
| 2026-10-23 | M | APA con `apacite` (`natbibapa`) y bibtex; bibliografía inicial con las fuentes de los módulos 01–03 | biblatex-apa con biber | Compatible con la compilación pdflatex + bibtex de la plantilla |
| 2026-10-23 | — | Borrar el ZIP de la plantilla tras descomprimirlo | Versionarlo en git | 8 MB redundantes; su contenido ya está en `docs/memoria/latex/` |
| 2026-10-23 | M | Compilar en la carpeta de `principal.tex` (auxiliares y PDF ignorados por git) | Salida en `build/` | Con `build/`, bibtex no encuentra los `.aux` de `Caps/` y `Anexos/` y no vería las citas de los capítulos |
| 2026-10-26 | 2 | Investigar la normativa antes de especificar; primera funcionalidad: registro de tratamientos fitosanitarios | Especificar directamente; empezar por otra funcionalidad | El principio IV exige citar la norma de cada requisito; los tratamientos son el registro más regulado (electrónico desde 01/01/2027) |
| 2026-10-26 | 2 | ACEPTADA por el alumno (2026-10-26): cosechas como registro voluntario de apoyo al cumplimiento (comprobar el plazo de seguridad), no como obligación legal | Presentarlas como registro obligatorio | Ninguna norma consultada exige registrar cosechas (anexo III del RD 1311/2012; RD 9/2015) |
| 2026-10-26 | 2 | ACEPTADA por el alumno (2026-10-26): labores ligadas a las prácticas de ecorregímenes (RD 1048/2022), con aviso del plazo de un mes | Registro genérico de labores sin base normativa | Solo los ecorregímenes obligan a anotar labores |
| 2026-10-26 | M | Guía de conceptos renumerada (04 normativa; 05–08 arquitectura, RAG, pruebas y CI/CD); módulos nuevos con referencias en APA | Mantener IEEE en los módulos | Coherencia con la memoria (APA acordado con el tutor) |
| 2026-10-26 | — | Ámbito territorial solo Castilla-La Mancha: normativa estatal (y europea cuando la estatal remite a ella) y autonómica de CLM; nada específico de otras comunidades, en especificación, RAG y memoria (indicación del alumno) | Recoger soluciones y normas de otras comunidades como contexto | El producto se desarrolla para Castilla-La Mancha |
| 2026-10-26 | — | Orden de funcionalidades: 001 tratamientos, 002 consultas normativas (RAG), 003 cosechas con plazo de seguridad, 004 fertilización, 005 labores, 006 lenguaje natural, 007 exportación SIEX | RAG al final; lenguaje natural antes que los registros | El RAG es el núcleo del TFG y lo más incierto; cada funcionalidad reutiliza las anteriores |
