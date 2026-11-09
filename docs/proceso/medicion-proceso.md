# Medición del proceso (propuesta)

**Estado: propuesta pendiente de aprobación del alumno.** El objetivo 6 de la memoria, el apartado 4.5 y el
capítulo 5 necesitan datos del propio proceso SDD: tiempo, iteraciones, código corregido y consumo de IA. Hasta el
hito H1 no se ha medido nada de forma sistemática: ninguna fila del registro tiene minutos y los tokens figuran como
"suscripción". Esta propuesta fija qué se mide, cómo y quién, a partir del hito H2.

Regla de base (CLAUDE.md): **no se inventan datos**. Lo que no se mida se deja vacío y se dice en la memoria.

## Qué se mide

| Métrica | Para qué (memoria) | Cómo se obtiene | Quién |
| --- | --- | --- | --- |
| Minutos del alumno por sesión | 4.5 y 5.1 (horas por fase) | El alumno anota la hora de inicio y de fin de cada sesión y rellena la columna "Minutos" del registro al cerrarla | Alumno |
| Iteraciones por tarea | 3.4, 4.3 y 4.5 (bucle de implementación) | El agente indica en cada commit de implementación una línea `Intentos: n` (correcciones tras la primera ejecución en rojo; máximo 3 según la constitución) | Agente |
| Paradas del bucle | 4.3 (límites del bucle) | Cada vez que se alcanza el límite de 3 intentos, una fila en Decisiones con la causa | Agente |
| Código corregido por el alumno | Objetivo 6 y 4.5 ("porcentaje de código generado que se corrige") | Las correcciones a mano del alumno van en **commits aparte**, con el mensaje `T-xx (corrección del alumno): ...`. Al cerrar cada hito se cuentan las líneas con `git log --numstat` y se comparan con las de los commits del agente | Alumno (commits) y agente (recuento) |
| Tiempo del agente por tarea | 4.5 | Diferencia entre las marcas de tiempo de commits consecutivos de un hito; es una aproximación y así se presentará | Agente |
| Tokens y coste de la IA de desarrollo | 5.1 | **Pendiente de verificar** qué ofrece Claude Code con suscripción (`/cost`, `/usage` o una herramienta que lea los registros locales, como `ccusage`). Si no hay forma fiable, se declara solo el coste de la suscripción y su prorrateo por meses | Alumno y agente |
| Tokens y coste de la IA del producto (RAG) | 5.2 | Panel de uso de la consola de Anthropic y de Voyage AI, por día, desde la funcionalidad 002 | Alumno |
| Resultado del pipeline por hito | 4.4 | Estado del CI en la PR al cerrar cada hito | Agente |

## Cuándo

- **En cada sesión:** el alumno rellena los minutos al cerrarla. El agente se los pide antes de hacer el commit
  del registro, y deja la celda vacía si el alumno no los tiene.
- **En cada commit de implementación:** línea `Intentos: n`.
- **Al cerrar cada hito:** el agente presenta en el resumen del punto de control las líneas del agente y del alumno,
  los intentos por tarea y el estado del CI, y lo anota en la fila de la sesión del hito.

## Lo que ya no se puede recuperar

H1 y las fases 1 a 5 no tienen minutos ni tokens. Para la memoria hay dos opciones honestas: que el alumno haga una
**estimación declarada como tal** de sus horas por fase, o presentar solo los datos medidos desde H2. No se
reconstruyen datos como si se hubieran medido.

## Decisiones que necesita el alumno

1. Aprobar la propuesta o cambiarla.
2. Elegir cómo tratar lo anterior a H2: estimación declarada o solo datos medidos desde H2.
3. Si se aprueba: añadir la regla de `Intentos: n` y la de los commits de corrección a `CLAUDE.md` para que la
   respete también la sesión de VS Code.
