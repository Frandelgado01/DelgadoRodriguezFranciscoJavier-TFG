# Índice del TFG: Cuaderno de Campo con SDD (versión 4)

Versión 4 del índice (2 oct 2026), adaptada al desarrollo dirigido por especificaciones (SDD) con agentes de IA.
La especificación versionada en el repositorio es la fuente de verdad: el alumno especifica, la IA planifica e
implementa, y el pipeline CI/CD valida contra los criterios de aceptación. Bajo cada apartado se indica qué debe
contener.

## 1. Introducción

Presenta el reto, el cambio de paradigma y la solución en dos o tres páginas, sin detalle técnico.

- **El reto:** el agricultor debe dedicarse a su explotación, pero la normativa le obliga a registrar tratamientos,
  fertilizaciones y labores, y a lidiar con papeleo. El Cuaderno de Campo busca reducir esa fricción al mínimo.
- **El cambio de paradigma:** los agentes de IA ya escriben buena parte del código; el valor del ingeniero se
  desplaza a especificar, decidir y verificar. SDD es la respuesta metodológica: la especificación deja de ser
  documentación y pasa a ser el artefacto ejecutable del que sale el código.
- **La solución:** aplicación generada con Claude Code en VS Code a partir de una especificación, con un módulo RAG
  que responde dudas sobre la normativa aplicable citando la fuente y un pipeline CI/CD que despliega y valida de
  forma continua.

### 1.1. Motivación

Debe girar en torno al agricultor, no a la tecnología: el agricultor tiene que poder centrarse en su trabajo, y la
aplicación debe absorber la carga normativa y burocrática. Cuatro pasos:

1. **El problema real.** Registros obligatorios (tratamientos fitosanitarios, fertilización, labores y cosechas) y
   normativa extensa y cambiante: condicionalidad de la PAC, uso sostenible de fitosanitarios, nutrición de suelos y
   el cuaderno digital de explotación vinculado al SIEX (RD 1054/2022), de implantación progresiva. Comprobar el
   calendario vigente y citar la norma.
2. **La fricción.** Formularios, terminología jurídica, varias administraciones, plazos y riesgo de sanciones o de
   perder ayudas. Cuantificarlo con fuentes (MAPA, organizaciones agrarias, consejería de Castilla-La Mancha) y, si es
   posible, con dos o tres entrevistas a agricultores. No inventar cifras.
3. **La propuesta.** Uso desde el campo en lenguaje natural, por voz o texto ("he tratado la parcela 4 con cobre"),
   que convierte lo dicho en registros conformes a la norma, avisa de obligaciones y plazos, y resuelve dudas
   normativas ("¿puedo cosechar ya tras este tratamiento?") citando el artículo o la ficha oficial. Justifica el RAG.
4. **Por qué SDD y agentes de IA.** Si los requisitos legales viven en una especificación versionada, un cambio de
   norma se refleja en `spec.md` y se propaga al código y a las pruebas. Cada requisito regulatorio queda trazado
   hasta su prueba: aplicación auditable.

### 1.2. Objetivos

Objetivo general: desarrollar, mediante SDD con agentes de IA, un Cuaderno de Campo que minimice el tiempo y la
fricción que la normativa supone para el agricultor. Objetivos específicos (el capítulo de conclusiones los revisa
uno a uno):

1. Definir la constitución y la especificación del Cuaderno de Campo mediante ideación con Claude.
2. Generar plan, tareas e implementación con Claude Code en VS Code, con revisión humana en cada fase.
3. Incorporar un módulo RAG sobre la normativa aplicable que responda dudas del agricultor citando la fuente,
   evaluado con métricas objetivas.
4. Automatizar construcción, pruebas y despliegue con CI/CD.
5. Validar contra los criterios de aceptación con pruebas E2E y de rendimiento.
6. Medir el propio proceso SDD (iteraciones, código corregido, tiempo) y comparar su coste con el de un desarrollo
   clásico.

### 1.3. Estructura de la memoria

Un párrafo con el contenido de cada capítulo.

## 2. Estado del arte

Referencias citadas en cada bloque.

### 2.1. Soluciones de cuaderno de campo

Marco normativo que obliga a llevar el cuaderno, y aplicaciones comerciales y públicas existentes, con sus carencias
desde el punto de vista de la carga para el agricultor.

### 2.2. Paradigmas de desarrollo con IA: vibe coding, SDD y loop engineering

Tres formas de trabajar con agentes que responden a preguntas distintas: vibe coding explora qué probar, SDD fija qué
construir y loop engineering automatiza cómo iterar hasta que funcione. Explicar cada uno con fuentes y cerrar con la
comparativa.

- **Vibe coding.** Término de Andrej Karpathy (febrero de 2025): describir en lenguaje natural, aceptar lo generado
  sin leer los cambios y corregir con nuevos prompts. Simon Willison matiza que, si el código se revisa, se prueba y
  se entiende, ya no es vibe coding. Vale para prototipos, pruebas de concepto e interfaces. Límites: contexto
  perdido entre sesiones, decisiones implícitas, deuda técnica, vulnerabilidades, nada trazable.
- **Spec-Driven Development (SDD).** La especificación es un contrato sobre el comportamiento del sistema y la fuente
  de verdad que usan los agentes para generar, probar y validar (GitHub, 2025). Flujo: especificar, planificar,
  tareas, implementar, con revisión humana entre fases. Vale para productos mantenibles, requisitos regulados, equipo
  y trazabilidad. Límites: más esfuerzo inicial; la especificación debe mantenerse viva.
- **Loop engineering.** Diseñar bucles en los que el agente escribe, prueba, evalúa e itera hasta cumplir un objetivo
  con mínima intervención humana (IBM): criterios de parada, pruebas, hooks, subagentes verificadores, estado
  persistente y límites. Popularizado en 2026 (Boris Cherny, Peter Steinberger, Andrew Ng; ADTmag). Vale para tareas
  largas verificables automáticamente. Límites: coste en tokens y errores sin supervisión (Addy Osmani); necesita
  puertas de verificación, registros, permisos y límite de iteraciones.

| Dimensión | Vibe coding | SDD | Loop engineering |
| --- | --- | --- | --- |
| Pregunta que responde | ¿Qué pruebo rápido? | ¿Qué hay que construir y por qué? | ¿Cómo itera el agente hasta que funcione? |
| Artefacto central | El prompt | La especificación (`spec.md`) | El bucle: pruebas, hooks y criterio de parada |
| Papel del humano | Pide y acepta | Especifica y aprueba cada fase | Diseña el bucle y vigila sus límites |
| Verificación | Manual, a ojo | Criterios de aceptación trazados a pruebas | Automática en cada iteración |
| Trazabilidad | Ninguna | Alta, de requisito a prueba | Registro de iteraciones |
| Uso adecuado | Prototipos | Productos mantenibles y regulados | Tareas largas y verificables |
| Riesgo principal | Código que nadie entiende | Especificación desactualizada | Coste y errores sin supervisión |

Este TFG los combina: SDD define el qué; loop engineering ejecuta implementación y validación, con Claude Code
iterando hasta que pasan las pruebas derivadas de los criterios de aceptación; vibe coding solo para prototipos
desechables durante la ideación.

### 2.3. Herramientas de desarrollo

- VS Code con la extensión de Claude Code: plan revisable antes de ejecutar, cambios como diffs, conversaciones en
  paralelo.
- Elementos de Claude Code usados: `CLAUDE.md`, comandos y skills (Spec Kit), subagentes revisores o de pruebas,
  hooks que lanzan pruebas y linters, y MCP (base de datos, GitHub, documentación normativa).
- Marcos SDD: GitHub Spec Kit (fases como comandos en Claude Code); Kiro como alternativa.
- Alternativas para la comparativa: GitHub Copilot, Cursor, Gemini CLI y Antigravity, y Codex.

### 2.4. RAG

Arquitectura (ingesta, fragmentación, embeddings, base vectorial, recuperación y generación) y evaluación de calidad.

### 2.5. CI/CD, DevOps y LLMOps

Integración y despliegue continuos, contenedores, infraestructura como código y extensión a sistemas con LLM:
evaluaciones automatizadas, observabilidad y control de costes. Cierra con un párrafo sobre el hueco que cubre el TFG.

## 3. Metodología: Spec-Driven Development

Proceso general, sin resultados.

### 3.1. Principios

- La especificación es la fuente de verdad; el código se deriva de ella y se puede regenerar.
- Se separa el qué (especificación) del cómo (plan técnico).
- Un cambio de requisito se hace primero en la especificación y después se propaga.
- Humano en el bucle: el alumno aprueba cada artefacto antes de la fase siguiente.
- Los criterios de aceptación se convierten en pruebas antes de implementar.

### 3.2. Artefactos

| Artefacto | Responde a | Lo produce | Lo aprueba |
| --- | --- | --- | --- |
| `constitution.md` | Principios no negociables: stack, calidad, seguridad, pruebas obligatorias | Alumno con Claude | Alumno y tutor |
| `spec.md` | Qué y por qué: historias de usuario, requisitos (REQ-xx), criterios Dado/Cuando/Entonces | Claude (modo plan) | Alumno |
| `plan.md` | Cómo: arquitectura, modelo de datos, contratos de API, diseño RAG, pipeline | Claude Code | Alumno |
| `tasks.md` | Tareas atómicas (T-xx) ordenadas, con dependencias y enlace a su REQ | Claude Code | Alumno |
| `CLAUDE.md` | Convenciones que el agente debe respetar | Alumno | Alumno |

### 3.3. Fases del ciclo

1. Constitución. 2. Especificar. 3. Clarificar. 4. Planificar. 5. Descomponer en tareas.
6. Implementar: bucle implementar–probar–corregir con límite de iteraciones; revisión del alumno; un commit por tarea.
7. Validar: unitarias, E2E, rendimiento y evaluaciones del RAG. Si falla por un requisito mal definido, vuelta a 2.

Cada nueva funcionalidad recorre las fases 2 a 7 como una iteración corta.

### 3.4. Trazabilidad y registro del proceso

Cadena REQ-xx → T-xx → commit → prueba; registro de prompts e iteraciones; métricas: iteraciones por fase,
porcentaje de código generado que se corrige, tiempo por tarea.

### 3.5. Riesgos del desarrollo con IA y su control

Alucinaciones, dependencias inseguras, secretos y deuda técnica. Control: revisión humana, análisis estático y de
dependencias en el pipeline, pruebas obligatorias, límites de iteraciones y de coste.

### 3.6. Planificación temporal

Iteraciones por funcionalidad en un diagrama de Gantt.

## 4. Desarrollo

Aplica el ciclo al Cuaderno de Campo: artefactos, iteraciones con la IA y decisiones del alumno.

- **4.1. Constitución y arquitectura:** `constitution.md` justificada; arquitectura (frontend, API, BD, RAG, servicios
  externos) con diagrama de componentes; entornos de despliegue y pipeline previsto.
- **4.2. Ideación con Claude (especificar y clarificar):** iteraciones hasta `spec.md`; REQ-xx, historias y criterios,
  incluidos los del RAG; el MD completo en anexo.
- **4.3. Generación con Claude Code en VS Code:** preparación (MD, `CLAUDE.md`, Spec Kit, hooks); `plan.md` y
  `tasks.md` con correcciones del alumno; implementación en bucle (diseño del bucle, iteraciones, correcciones
  manuales); estructura resultante y construcción del RAG.
- **4.4. Despliegue y testing:** pipeline CI/CD; E2E (Playwright) con tabla REQ → prueba; rendimiento (k6 o Locust)
  con umbrales de la constitución; evaluación del RAG en el pipeline (fidelidad y relevancia).
- **4.5. Resultados del proceso:** métricas (iteraciones, código corregido, tiempos, cobertura, pruebas) y análisis.

## 5. Análisis de costes

Coste real con IA frente a estimación clásica con el mismo alcance; datos reales de 4.5; la estimación clásica
explica su método.

- **5.1. Costes con IA:** personal (horas por fase, tarifa de referencia citada), herramientas de IA (suscripción o
  API, tokens por fase), infraestructura, equipo y licencias.
- **5.2. Coste de operación:** mensual y por agricultor y mes.
- **5.3. Estimación clásica:** equipo tipo con tarifas citadas; desglose por fase contrastado con COCOMO II o puntos de
  función; mismo alcance.
- **5.4. Comparativa:** tabla por fase (horas, coste, plazo) y barras agrupadas; costes ocultos de la IA; calidad.
- **5.5. Sensibilidad:** tarifa, precio de tokens y tamaño; punto de equilibrio; limitaciones.

## 6. Conclusiones

Tabla de objetivos cumplidos; valoración crítica de SDD con IA a partir de 4.5 y 5; competencias del título (guía
docente del TFG de la UCLM); trabajo futuro priorizado.

## Bibliografía

Un único estilo (IEEE o APA), citado en el texto: documentación oficial, GitHub Spec Kit, artículos sobre SDD, agentes
de código y RAG.

## Anexos

`constitution.md`, `spec.md`, `plan.md` y `tasks.md` finales; registro de prompts e iteraciones; manual de instalación
y despliegue con enlace al repositorio; declaración de uso de IA generativa si la normativa de la UCLM la exige.
