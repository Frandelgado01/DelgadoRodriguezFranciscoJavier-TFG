# Medición del proceso (propuesta)

**Estado: propuesta pendiente de aprobación del alumno** (actualizada el 2026-11-14). El objetivo 6 de la memoria,
el apartado 4.5 y el capítulo 5 necesitan datos del propio proceso SDD. Desde el 2026-11-14 el registro no recoge
minutos ni tokens/coste (decisión del alumno), así que el proceso se mide solo con datos verificables en el
repositorio, y el tiempo se expresa en días con actividad por fase. Esta propuesta fija qué se mide, cómo y quién, a
partir del hito H2.

Regla de base (CLAUDE.md): **no se inventan datos**. Lo que no se mida se deja vacío y se dice en la memoria.

## Qué se mide

| Métrica | Para qué (memoria) | Cómo se obtiene | Quién |
| --- | --- | --- | --- |
| Iteraciones por tarea | 3.4, 4.3 y 4.5 (bucle de implementación) | El agente indica en cada commit de implementación una línea `Intentos: n` (correcciones tras la primera ejecución en rojo; máximo 3 según la constitución) | Agente |
| Paradas del bucle | 4.3 (límites del bucle) | Cada vez que se alcanza el límite de 3 intentos, una fila en Decisiones con la causa | Agente |
| Código corregido por el alumno | Objetivo 6 y 4.5 ("porcentaje de código generado que se corrige") | Las correcciones a mano del alumno van en **commits aparte**, con el mensaje `T-xx (corrección del alumno): ...`. Al cerrar cada hito se cuentan las líneas con `git log --numstat` y se comparan con las de los commits del agente | Alumno (commits) y agente (recuento) |
| Tokens y coste de la IA del producto (RAG) | 5.2 | Panel de uso de la consola de Anthropic y de Voyage AI, por día, desde la funcionalidad 002 | Alumno |
| Días con actividad por fase | 4.5 y 5.5 | Fechas distintas con alguna fila del registro o algún commit de esa fase. No se usa la duración entre fechas: los días sin commits son días en que no se avanzó. Un día con actividad puede ser una sesión corta o larga, y se dice como limitación | Agente (recuento) |
| Resultado del pipeline por hito | 4.4 | Estado del CI en la PR al cerrar cada hito | Agente |

## Cuándo

- **En cada commit de implementación:** línea `Intentos: n`.
- **Al cerrar cada hito:** el agente presenta en el resumen del punto de control las líneas del agente y del alumno,
  los intentos por tarea y el estado del CI, y lo anota en la fila de la sesión del hito.

## Datos anteriores a H2

Los días con actividad, las iteraciones y los cambios de la spec de las fases 1 a 5 y de H1 se pueden obtener del registro y de git, así que no hace falta estimar nada a posteriori.

## Decisiones que necesita el alumno

1. Aprobar la propuesta o cambiarla.
2. Si se aprueba: añadir la regla de `Intentos: n` y la de los commits de corrección a `CLAUDE.md` para que la
   respete también la sesión de VS Code.
