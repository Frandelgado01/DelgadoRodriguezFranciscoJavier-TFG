# Forma de trabajo del TFG

Acuerdo entre el alumno y el agente (Claude Code) para todo el TFG. Si algo cambia, se actualiza aquí y se
anota en el registro como decisión.

## Dónde se trabaja

"Claude Code" es el mismo agente en la app de escritorio, en la extensión de VS Code y en la terminal: lee el
mismo `CLAUDE.md`, las mismas reglas y los mismos ficheros. Lo que cambia es la interfaz.

| Tarea | Dónde | Por qué |
| --- | --- | --- |
| Fases SDD 1–7: constitución, especificación, plan, tareas, implementación, validación | Claude Code en **VS Code** | Es lo que la memoria describe (4.3): el plan se revisa en el editor, los cambios se ven como diffs y los hooks lanzan pruebas |
| Redacción de la memoria y guía de conceptos | Claude Code en VS Code o en la app de escritorio | Indiferente: ambos trabajan sobre el repositorio |
| Prototipos desechables durante la ideación (vibe coding) | Cualquiera, fuera de `main` | El índice solo admite vibe coding para prototipos; no entran en el producto |

Reglas:

- **Una sola sesión activa sobre el repositorio a la vez**, para no pisar el registro ni los artefactos.
- **El repositorio es la memoria del proyecto.** El historial de un chat no pasa a otra sesión; `CLAUDE.md`,
  el registro, los artefactos SDD y `docs/` sí. Para retomar en una sesión nueva:
  *"Lee CLAUDE.md, forma-de-trabajo.md y el registro, y dime en qué punto estamos."*

## Ciclo de cada iteración

1. **Petición o propuesta.** El alumno pide algo o el agente propone el siguiente paso.
2. **Explicación.** El agente explica qué va a hacer y por qué, con los conceptos nuevos que aparezcan.
3. **Revisión.** El alumno aprueba, corrige o rechaza. Toda corrección o rechazo es una decisión registrada.
4. **Aplicación.** El agente aplica el cambio y lo verifica (pruebas, compilación, lectura del resultado).
5. **Cierre.** Si procede registrar, el agente avisa al alumno, actualiza `registro-iteraciones.md` y hace
   commit (registro incluido) y push.

## Roles

- **Alumno:** decide, aprueba cada artefacto y fase, entiende todo lo que entra en el repositorio y redacta
  con su propia voz. Completa en el registro los minutos y tokens que el agente no puede medir.
- **Agente:** propone, explica, genera, verifica y registra. Nunca pasa de fase sin aprobación explícita.
  Si el alumno no entiende algo, se para hasta que quede claro: lo que no se entiende no se puede defender.

## Aprendizaje: guía de conceptos

`docs/conceptos/` contiene una guía breve por bloque, escrita justo antes de la fase que lo necesita. Cada
módulo explica qué es, para qué se usa en el TFG, alternativas y fuentes, y sirve de base para el capítulo 2.

| Módulo | Contenido | Antes de |
| --- | --- | --- |
| 01 | Desarrollo con agentes: vibe coding, SDD, loop engineering | Fase 1 |
| 02 | Claude Code y Spec Kit: `CLAUDE.md`, modo plan, comandos, skills, subagentes, hooks, MCP | Fase 1 |
| 03 | Git, GitHub y trazabilidad | Fase 1 |
| 04 | Normativa del cuaderno de campo (SIEX, fitosanitarios, fertilización, PAC, Castilla-La Mancha) | Fase 2 |
| 05 | Arquitectura web: PWA, API REST, base de datos | Fase 4 |
| 06 | RAG: embeddings, fragmentación, búsqueda vectorial, generación y evaluación | Fase 4 |
| 07 | Pruebas: unitarias, E2E, rendimiento | Fase 6 |
| 08 | CI/CD, contenedores, DevOps y LLMOps | Fase 7 |

## Memoria

- Formato: **LaTeX** con la plantilla oficial de la escuela (Overleaf; se integra en `docs/memoria/latex/`).
  Citas en **APA**. Los módulos de `docs/conceptos/` usan IEEE y se convertirán a APA al pasar a la memoria.
- Se redacta en paralelo a la implementación: capítulos 1–3 desde ya; 4 y 5 a medida que haya datos en el
  registro; 6 al final.
- El agente propone borradores con fuentes citadas; el alumno los revisa y los reescribe con su voz. El uso
  de IA generativa se declara en el anexo correspondiente si la normativa de la UCLM lo exige.

## Commits

Commit y push al cerrar cada iteración, con el registro actualizado en el mismo commit. Mensajes en español;
durante la implementación empiezan por la tarea (`T-07: ...`).
