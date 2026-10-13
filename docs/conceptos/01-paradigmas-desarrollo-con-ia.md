# Módulo 01 — Paradigmas de desarrollo con IA: vibe coding, SDD y loop engineering

Guía de conceptos del TFG. Base para el apartado 2.2 de la memoria y para los principios de la constitución
(fase 1). Fuentes consultadas el 2026-10-13; referencias IEEE al final.

## En una frase

Son tres formas de trabajar con agentes de código que **no compiten, porque responden a preguntas distintas**:
el vibe coding sirve para explorar *qué probar*, SDD fija *qué hay que construir y por qué* y loop engineering
automatiza *cómo iterar hasta que funcione*.

## Contexto: por qué hacen falta paradigmas nuevos

Los agentes de código (Claude Code, Codex, Copilot, Gemini CLI…) ya no solo autocompletan líneas: leen el
repositorio, ejecutan comandos, escriben y prueban código durante largos periodos. Esto desplaza el trabajo del
ingeniero de *escribir código* a *decidir qué construir, dar instrucciones sin ambigüedad y verificar*. GitHub lo
resume como pasar de tratar el código como fuente de verdad a tratar la **intención** como fuente de verdad [4].
Los tres paradigmas son respuestas distintas a esa nueva situación.

## 1. Vibe coding

**Origen.** Término acuñado por Andrej Karpathy el 2 de febrero de 2025 [1]. Describió una forma de programar en
la que uno se deja llevar por la IA, acepta sus cambios sin leerlos y corrige con nuevos prompts, hasta
"olvidar que el código existe". Lo planteó para proyectos desechables de fin de semana [2].

**Precisión de Simon Willison** [2]. Define el vibe coding como construir software con un LLM *sin revisar el
código que escribe*. Si el código se revisa, se prueba y se entiende hasta poder explicarlo a otra persona,
**ya no es vibe coding**: es desarrollo de software normal asistido por IA. Es la distinción clave para el TFG.

**Para qué sirve** [2]: prototipos, pruebas de concepto, herramientas personales de bajo riesgo, explorar ideas e
interfaces, y aprender qué pueden y qué no pueden hacer los LLM.

**Límites y riesgos:**

- Willison señala riesgos concretos [2]: secretos expuestos en el código (claves de API), fugas de datos
  privados, carga excesiva sobre servicios externos y costes de API sin control.
- El contexto se pierde entre sesiones y las decisiones quedan implícitas en el historial de prompts.
- Crece la deuda técnica y nada es trazable ni auditable.

## 2. Spec-Driven Development (SDD)

**Definición.** La especificación es un **contrato** sobre cómo debe comportarse el código y la **fuente de
verdad** que usan los agentes para generar, probar y validar. Las especificaciones son artefactos vivos y
ejecutables que evolucionan con el proyecto, no documentos estáticos [4].

**Por qué surge.** El problema no es la capacidad del agente para programar, sino el enfoque. Un prompt vago
obliga al modelo a adivinar muchos requisitos no dichos, y los errores aparecen tarde [4].

**Flujo** [4]. Cada fase produce un artefacto que el humano revisa antes de seguir:

| Fase | Qué aporta el humano | Qué produce el agente |
| --- | --- | --- |
| Especificar | Qué se construye y por qué; dirige | Especificación: recorridos de usuario y criterios de éxito |
| Planificar | Stack, arquitectura, restricciones (p. ej. normativa) | Plan técnico; se pueden pedir variantes |
| Tareas | Revisión | Tareas pequeñas, comprobables y revisables |
| Implementar | Revisión de cambios acotados, no de bloques enormes de código | Código |

Spec Kit [3] añade antes una **constitución** con los principios no negociables y, al final, una fase de
**convergencia** (ver módulo 02).

**Tres niveles de SDD** (Birgitta Böckeler, Thoughtworks) [5]:

1. **Spec-first:** la especificación se escribe antes de la tarea y la guía.
2. **Spec-anchored:** la especificación se conserva tras la tarea y se usa para mantener y evolucionar la
   funcionalidad.
3. **Spec-as-source:** el humano solo edita la especificación y el código se genera a partir de ella.

**Para qué sirve:** productos que hay que mantener, requisitos regulados, trabajo en equipo y trazabilidad.
GitHub destaca proyectos nuevos, nuevas funcionalidades en sistemas existentes y modernización de sistemas
heredados [4].

**Límites y críticas** [5]:

- **Sobrecoste en tareas pequeñas:** un error menor puede inflarse en varias historias de usuario con
  decenas de criterios.
- **Carga de revisión:** los documentos generados son largos y repetitivos.
- **Falsa sensación de control:** el agente a veces ignora la especificación y otras la sigue en exceso.
- **Separar el qué del cómo es difícil:** cuesta mantener los requisitos libres de detalles de implementación.
- **Riesgo histórico:** spec-as-source recuerda al desarrollo dirigido por modelos (MDD), que fracasó por
  rigidez; además, los LLM no son deterministas y la misma especificación genera código distinto.
- Y el riesgo principal según el índice: si la especificación es mala o queda desactualizada, el código
  también lo será.

## 3. Loop engineering

**Definición.** Práctica de diseñar flujos agénticos (*loops*, bucles) que guían a los agentes de IA de forma
iterativa hacia objetivos definidos por el usuario, con mínima intervención humana. El agente actúa, observa el
resultado, decide e itera hasta completar la tarea. El papel del desarrollador pasa de escribir prompts a
**diseñar sistemas que dan instrucciones al agente, lo comprueban y lo guían** (IBM) [6].

**Origen** (junio de 2026). Peter Steinberger: no hay que dar instrucciones al agente, sino diseñar los bucles
que se las dan. Boris Cherny, responsable de Claude Code en Anthropic: "mi trabajo es escribir bucles". Addy
Osmani publica el 7 de junio de 2026 el ensayo que da nombre a la práctica y los cita a ambos [7].

**Componentes de un bucle** (IBM [6] y Osmani [7]):

| Componente | Qué es | Equivalente en este TFG |
| --- | --- | --- |
| Objetivo con criterio de parada | Meta verificable, p. ej. "pasan todas las pruebas" | Criterios de aceptación convertidos en pruebas; "Converged" en Spec Kit |
| Comprobación | Evaluar el resultado en cada vuelta | Pruebas y linters lanzados por hooks |
| Hooks | Instrucciones disparadas por eventos para seguridad y calidad | `.claude/settings.json` |
| Skills | Conocimiento del proyecto para tareas recurrentes | Skills de Spec Kit |
| Subagentes (*maker/checker*) | Un agente produce y otro verifica | Subagente revisor en la implementación |
| Conectores / MCP | Acceso a sistemas externos | MCP de base de datos y GitHub |
| Estado persistente ("spine") | Fichero fuera de la conversación con lo hecho y lo pendiente | `tasks.md`, `registro-iteraciones.md` |
| Automatización / programación | Cadencia de ejecución | GitHub Actions |
| Worktrees | Copias separadas para agentes en paralelo | Opcional |

**Los tres bucles de Andrew Ng** (The Batch, n.º 359, 26 de junio de 2026) [8]:

1. **Bucle del agente** (minutos): con una especificación y, opcionalmente, evaluaciones, el agente escribe
   código, lo prueba e itera hasta cumplir la especificación.
2. **Bucle del desarrollador** (de decenas de minutos a horas): el desarrollador revisa el producto y
   reorienta al agente.
3. **Bucle externo** (días o semanas): retroalimentación de usuarios, pruebas alfa, pruebas A/B. Alimenta la
   visión del desarrollador, que da forma a la especificación, que a su vez guía al agente.

En el TFG los tres bucles se corresponden con la implementación en bucle (fase 6), la revisión del alumno en cada
fase y las entrevistas o pruebas con agricultores.

**Diferencia con prompt engineering** [6]: el prompt engineering busca la mejor instrucción individual, con un
humano que escribe y evalúa cada prompt; el loop engineering construye sistemas que generan sus propios prompts y
evalúan su trabajo. Lo primero sirve para interacciones puntuales y lo segundo para tareas largas.

**Límites y riesgos:**

- Osmani: "un bucle que funciona sin supervisión también comete errores sin supervisión"; que el agente diga
  "terminado" es una afirmación, no una prueba [7].
- **Deuda de comprensión:** cuanto más rápido genera el bucle código que no has escrito, mayor es la distancia
  entre lo que existe y lo que entiendes [6], [7].
- **Rendición cognitiva:** aceptar lo que devuelve el bucle sin juicio crítico [6], [7].
- **Coste en tokens:** bucles mal diseñados repiten fallos y los subagentes multiplican el consumo [6], [7].
- **Responsabilidad:** el agente verificador sigue siendo un agente; el humano responde del código entregado,
  incluida la seguridad y el cumplimiento normativo [6].
- **Capacidad de revisión:** el límite real es cuánto puede revisar el humano, no las herramientas [7].

## 4. Comparativa

| Dimensión | Vibe coding | SDD | Loop engineering |
| --- | --- | --- | --- |
| Pregunta que responde | ¿Qué pruebo rápido? | ¿Qué hay que construir y por qué? | ¿Cómo itera el agente hasta que funcione? |
| Artefacto central | El prompt | La especificación (`spec.md`) | El bucle: pruebas, hooks y criterio de parada |
| Papel del humano | Pide y acepta | Especifica y aprueba cada fase | Diseña el bucle y vigila sus límites |
| Verificación | Manual, a ojo | Criterios de aceptación trazados a pruebas | Automática en cada iteración |
| Trazabilidad | Ninguna | Alta, de requisito a prueba | Registro de iteraciones |
| Uso adecuado | Prototipos | Productos mantenibles y regulados | Tareas largas y verificables |
| Riesgo principal | Código que nadie entiende | Especificación desactualizada | Coste y errores sin supervisión |

## 5. Cómo los combina este TFG

- **SDD define el qué.** Es imprescindible por la carga normativa: cada requisito legal vive en `spec.md` y se
  traza hasta su prueba. Un cambio de norma se aplica primero en la especificación.
- **Loop engineering ejecuta el cómo.** Claude Code implementa cada tarea en un bucle de implementar, probar y
  corregir, con hooks como puerta de verificación, un límite de iteraciones y `/speckit-converge` como
  criterio de parada.
- **Vibe coding solo en la ideación**, para prototipos desechables que no entran en `main`.
- **Respuesta a los riesgos:** contra la deuda de comprensión, revisión del alumno en cada fase y un commit por
  tarea; contra la falsa sensación de control, `/speckit-analyze` y `/speckit-converge`; contra el coste,
  límites de iteraciones y registro de tokens (capítulo 5).

**Matiz honesto para la memoria:** el índice dice que "el código se puede regenerar" desde la especificación,
lo que apunta a *spec-as-source*. Con la crítica de Böckeler [5] (no determinismo, rigidez del MDD), lo
realista es aspirar a **spec-anchored**: la especificación se mantiene viva y guía la evolución, y regenerar
código es posible, pero no garantiza un resultado idéntico. Conviene decirlo así en 3.1 y valorarlo en las
conclusiones.

## Notas para la memoria

- Para Andrew Ng, el índice cita ADTmag. No he podido localizar ese artículo; cita la fuente primaria [8].
- La cita de Osmani del índice ("un bucle sin supervisión también se equivoca sin supervisión") corresponde a
  [7]. Tradúcela tal cual e indica que es una traducción propia.
- Para Karpathy, cita el tuit original [1] y, si quieres respaldo, el análisis de Willison [2].

## Preguntas de autocomprobación

1. Según Willison, ¿cuándo deja de ser vibe coding programar con un LLM? ¿Por qué importa para tu TFG?
2. ¿Qué significa que la especificación sea "fuente de verdad" y no simple documentación?
3. ¿En qué nivel de SDD (spec-first, spec-anchored, spec-as-source) está realmente tu TFG, y por qué?
4. ¿Qué elementos necesita un bucle para no ser peligroso? Nombra al menos cuatro.
5. Relaciona los tres bucles de Ng con fases concretas de tu TFG.
6. ¿Qué es la deuda de comprensión y cómo la mitiga tu forma de trabajo?

## Referencias

[1] A. Karpathy, "There's a new kind of coding I call 'vibe coding'…", publicación en X, 2-feb-2025. [En
línea]. Disponible en: https://x.com/karpathy/status/1886192184808149383. [Accedido: 13-oct-2026].

[2] S. Willison, "Not all AI-assisted programming is vibe coding (but vibe coding rocks)", 19-mar-2025. [En
línea]. Disponible en: https://simonwillison.net/2025/Mar/19/vibe-coding/. [Accedido: 13-oct-2026].

[3] GitHub, "Spec Kit", repositorio *github/spec-kit*. [En línea]. Disponible en:
https://github.com/github/spec-kit. [Accedido: 13-oct-2026].

[4] D. Delimarsky, "Spec-driven development with AI: Get started with a new open source toolkit", *The GitHub
Blog*, 2-sep-2025. [En línea]. Disponible en:
https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/.
[Accedido: 13-oct-2026].

[5] B. Böckeler, "Understanding Spec-Driven-Development: Kiro, spec-kit, and Tessl", *martinfowler.com*,
15-oct-2025. [En línea]. Disponible en: https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html.
[Accedido: 13-oct-2026].

[6] I. Belcic y C. Stryker, "What is loop engineering?", *IBM Think*, 17-jul-2026. [En línea]. Disponible en:
https://www.ibm.com/think/topics/loop-engineering. [Accedido: 13-oct-2026].

[7] A. Osmani, "Loop Engineering", 7-jun-2026. [En línea]. Disponible en:
https://addyosmani.com/blog/loop-engineering/. [Accedido: 13-oct-2026].

[8] A. Ng, carta "Dear friends", *The Batch*, n.º 359, DeepLearning.AI, 26-jun-2026. [En línea]. Disponible en:
https://www.deeplearning.ai/the-batch/issue-359. [Accedido: 13-oct-2026].
