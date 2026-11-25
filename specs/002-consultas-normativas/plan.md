# Plan de implementación: Consultas normativas con citas

**Rama**: `002-consultas-normativas` | **Fecha**: 2026-11-25 | **Spec**: [spec.md](spec.md) (aprobada por el alumno el 2026-11-25;
pendiente del visto bueno del tutor, obligatorio antes de implementar)

**Entrada**: spec de la 002, módulo 06 (`docs/conceptos/06-rag.md`), plan de la 001 (arquitectura y sesión) y constitución v2.0.0.

**Artefactos de esta fase**: [research.md](research.md) (R20–R30) · [data-model.md](data-model.md) ·
[contracts/openapi.yaml](contracts/openapi.yaml) · [quickstart.md](quickstart.md)

## Resumen

El agricultor escribe una duda y la API busca los 20 fragmentos de normativa más próximos (por significado, con un modelo local, y por
palabras), se los da a Claude Haiku 5.5 con citas y **comprueba la respuesta en código** antes de mostrarla: sin cita válida, o con una cifra
sin cita, no se muestra. Nada de lo preguntado se guarda. El plazo de seguridad de un producto se lee de una tabla con el listado oficial,
sin modelo. Una evaluación con 55 preguntas revisadas por el alumno decide si el sistema es aceptable.

## Contexto técnico

**Lenguajes**: Python 3.14 y TypeScript, como en la 001.
**Dependencias nuevas**: `anthropic`, `onnxruntime`, `tokenizers`, `numpy`, `pgvector`, `defusedxml` (R30). Sin dependencias nuevas en la PWA.
**Almacenamiento**: PostgreSQL 18 con pgvector (ya en la imagen) y `unaccent`.
**Pruebas**: pytest (con un modelo y un cliente de Claude falsos), Vitest, Playwright y la evaluación de R28.
**Plataforma**: la de la 001 (Docker Compose local, Chrome para Android).
**Objetivos**: SC-101 a SC-108. Las consultas **no** entran en k6: medirían un servicio externo y gastarían el presupuesto.
**Restricciones**: gasto total de la API por debajo de 5 USD (crédito comprado); 4 GB de memoria en Docker; sin clave en el CI.
**Escala**: unos 800 a 1 000 fragmentos; 2 099 productos y 64 065 usos.

## Comprobación de la constitución (v2.0.0)

| Principio | Cómo se cumple | Antes | Después |
| --- | --- | --- | --- |
| I. Spec anclada | Plan derivado de la spec aprobada; el contrato se prueba como en la 001 | ✅ | ✅ |
| II. Humano en el bucle | Aprobación del alumno de este plan y de las tareas; el tutor da su visto bueno a spec y plan **antes de implementar**; el alumno revisa las 55 preguntas | ⏳ | ⏳ |
| III. Pruebas primero | Cada REQ tiene escenarios (tabla de la spec). Lo determinista se prueba sin modelo; lo que depende del modelo, con propiedades y con la evaluación | ✅ | ✅ |
| IV. Conformidad con fuente | Toda afirmación con cita o no se muestra (R25); fuentes oficiales con fecha (R20); plazos literales (R27). Los umbrales y límites son propuesta aceptada por el alumno | ✅ | ✅ |
| V. Centrado en el agricultor | Lenguaje llano; preguntas con sus palabras. Las consultas necesitan conexión: el principio solo exige sin conexión el registro | ✅ | ✅ |
| VI. Seguridad y privacidad | Solo salen la pregunta y los fragmentos; nada se guarda; clave fuera del repositorio; modelo con huella comprobada y sin ejecutar código remoto; XML externo leído con `defusedxml` | ✅ | ✅ |
| VII. Simplicidad | Sin marco de RAG, sin índice vectorial, sin reordenación, sin conversación; las mejoras se añaden solo si la evaluación las pide | ✅ | ✅ |
| Restricciones técnicas | Haiku para generar; embeddings locales; PostgreSQL + pgvector. **Desviación menor**: el juez de la evaluación es Sonnet, que no forma parte del producto | ✅ | ✅ justificada en R28 |

**Resultado**: se supera la puerta de diseño. La de implementación queda cerrada hasta el visto bueno del tutor.

## Respuestas a las preguntas del módulo 06 (§ 9)

| # | Pregunta | Respuesta | Detalle |
| --- | --- | --- | --- |
| 8 | Embeddings | `multilingual-e5-base` local con ONNX Runtime, elegido con una medición | R22 |
| 9 | Fragmentación | Por artículo y, por encima de 220 palabras, por apartado; tablas por filas | R21 |
| 10 | Cambios en las normas | Huella por norma; se recarga entera la que cambia, en una transacción | R20, data-model |
| 11 | Fusión, número y abstención | RRF, 20 fragmentos y **sin umbral de similitud**, porque la medición muestra que no separa | R23, R25 |
| 12 | Límite de gasto | Tope en la consola, 20 consultas por cuenta y día, y tokens registrados | R26 |
| 13 | Evaluaciones en el CI | SC-101 en cada PR; las que llaman al modelo, a mano | R28 |

## Estructura del proyecto

```text
backend/src/cuaderno/
├── api/consultas.py, productos_autorizados.py
├── esquemas/consulta.py, producto_autorizado.py
├── modelos/corpus.py, producto_autorizado.py, consumo.py
└── consultas/
    ├── fuentes.py         # leer BOE, DOUE y DOCM (R20)
    ├── fragmentar.py      # R21
    ├── codificador.py     # ONNX; interfaz con un doble para las pruebas (R22)
    ├── buscar.py          # vectores, texto y RRF (R23)
    ├── generar.py         # petición a Claude; interfaz con un doble (R24)
    ├── validar.py         # estado, citas y cifras sin cita (R25), funciones puras
    ├── limite.py          # R26
    └── servicio.py        # une los pasos
backend/scripts/crear_instantanea.py, cargar_corpus.py, importar_productos.py, evaluar.py
corpus/                    # instantánea versionada (R20)
evaluacion/                # preguntas e informes (R28)
frontend/src/paginas/consultas/, paginas/productos-autorizados/
```

**Decisión de estructura**: se amplía el backend de la 001, con un paquete propio para que la búsqueda y la generación se prueben por separado.

## Hitos propuestos

| Hito | Contenido | Se comprueba |
| --- | --- | --- |
| H8 Corpus y búsqueda | Instantánea, carga, codificador, búsqueda, preguntas y SC-101 | Preguntar por consola y ver los fragmentos; SC-101 en el CI |
| H9 Respuestas con citas | Generación, validación, límite, API y pantalla | Preguntar desde el móvil y abrir una cita |
| H10 Productos | Importación, API y pantalla | Ver los plazos literales de un producto |
| H11 Evaluación | Evaluación completa, ajuste, informe y E2E mínimas | Informe con SC-101 a SC-107 |

H10 es el primero que se recorta (spec, Supuestos). H8 no depende de H4 de la 001; H9 toca `main.py` y la navegación, así que se implementa cuando
H4 esté cerrado.

## Riesgos

| Riesgo | Respuesta |
| --- | --- |
| La evaluación no llega a los umbrales | Reformular la pregunta (R23) y, si no basta, informar del resultado real sin bajar los umbrales después de medir |
| El modelo no respeta los marcadores o las citas | Las comprobaciones de R25 convierten el fallo en «no lo sé»; SC-104 lo mide |
| Falta de tiempo | Recorte en el orden de la spec |
| El alumno no puede revisar las 55 preguntas | Se revisan primero las 40 finales; las de ajuste no dan resultado |
| La imagen es grande | Se construye una vez; el CI no la necesita para las pruebas |

## Pendientes

1. Visto bueno del tutor a la spec y al plan.
2. PDF del Decreto 80/2025: si los anexos tienen texto (R20).
3. RD 285/2021 (almacenamiento): decidir si entra en el corpus (R20).
4. Descripción oficial y condiciones de reutilización del listado del MAPA (R27).
5. RGPD y lugar de procesamiento, para un uso real (R26).

## Complejidad justificada

| Pieza | Por qué hace falta | Alternativa más simple descartada porque… |
| --- | --- | --- |
| Modelo local en la imagen (1 GB) | El texto solo encuentra el artículo en 14 de 24 preguntas entre los 10 primeros | Solo texto: no llega a SC-101; API externa: descartada por el alumno |
| Búsqueda híbrida | 23 de 24 con 20 fragmentos frente a 22 | Solo vectores: se mantiene como línea base en la evaluación |
| Instantánea versionada | Resultados reproducibles y CI sin red ni modelo | Calcular en cada arranque: 14 minutos y resultados que cambian |
| Modelo juez distinto | Evita que el generador se juzgue a sí mismo | Solo revisión humana: no es repetible en el plazo |
