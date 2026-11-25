---
description: "Tareas de implementación de la funcionalidad 002: consultas normativas con citas"
---

# Tareas: Consultas normativas con citas

**Entrada**: `specs/002-consultas-normativas/`: [spec.md](spec.md) (aprobada el 2026-11-25), [plan.md](plan.md) (aprobado el 2026-11-25),
[research.md](research.md) (R20–R30), [data-model.md](data-model.md), [contracts/openapi.yaml](contracts/openapi.yaml),
[quickstart.md](quickstart.md) y constitución v2.0.0.

> **No se empieza ninguna tarea sin el visto bueno del tutor a la spec y al plan** (principio II).

**Numeración**: de T-100 a T-138, para que cada `T-xx` sea único en el proyecto (la 001 llega a T-83).

**Reglas**: las de la 001. Un commit por tarea con `Intentos: n`, pruebas primero y en rojo, como mucho 3 intentos, push y CI tras cada tarea, y
parada en el punto de control. Cada prueba cita su `REQ-xx`. **Ninguna prueba ni paso del CI llama a la API de Claude**; las llamadas reales
(T-123, T-136 y T-137) se hacen con permiso del alumno en cada ocasión, y se anota el gasto.

## Hitos

| Hito | Tareas | Criterio de revisión del alumno |
| --- | --- | --- |
| H8 Corpus y búsqueda | T-100 a T-114 | Hacer una pregunta por consola y ver los artículos encontrados; las 55 preguntas revisadas; SC-101 en el CI |
| H9 Respuestas con citas | T-115 a T-127 | Preguntar desde el móvil, abrir una cita y compararla con el BOE; ver un «no lo sé» y el límite diario |
| H10 Productos | T-128 a T-133 | Ver los plazos literales de un producto real |
| H11 Evaluación y cierre | T-134 a T-138 | Informe con SC-101 a SC-107 y gasto por debajo del límite |

Si falta tiempo se recorta H10 entero y después el Decreto 80/2025 (spec, Supuestos).

---

## H8: Corpus y búsqueda

**Objetivo**: cargar la normativa vigente y encontrar los fragmentos que responden a una pregunta.

- [ ] T-100 Fusionar en la rama la 001 con H4 aprobado, para que las migraciones sigan una sola cadena, y comprobar que sus pruebas pasan.
  Añadir las dependencias de R30 con versión exacta en `backend/pyproject.toml` y `uv.lock`, y documentar `CUADERNO_CLAVE_ANTHROPIC` en
  `.env.example`, sin valor. Generalizar la utilidad de contrato de T-08 para leer también el contrato de la 002. (R30; principio VI)
- [ ] T-101 Escribir las pruebas (deben fallar) de la lectura de fuentes en `backend/tests/unit/test_fuentes.py`, con XML de muestra en
  `backend/tests/datos/corpus/`: se toma la versión con mayor vigencia no posterior a la fecha dada y no una futura; se descartan preámbulo,
  firma, notas iniciales y **notas editoriales** (el artículo 40 suprimido del RD 1311/2012 no da texto, aunque su nota lleve la redacción
  anterior); se leen las tablas por filas; se leen el formato del BOE y el del DOUE; un XML con entidades externas se rechaza. (REQ-42; R20)
- [ ] T-102 Implementar `consultas/fuentes.py`. Pasan las pruebas de T-101. (REQ-42; R20)
- [ ] T-103 Escribir las pruebas (deben fallar) de la fragmentación en `backend/tests/unit/test_fragmentar.py`: un artículo corto da un
  fragmento con su unidad y su texto **literal**; uno de más de 220 palabras se parte por apartados con su número; un apartado mayor, por
  párrafos; un anexo, por sus secciones; unir los fragmentos de una unidad devuelve su texto completo. (REQ-31, REQ-39; R21)
- [ ] T-104 Implementar `consultas/fragmentar.py`. Pasan las pruebas de T-103. (REQ-31, REQ-39; R21)
- [ ] T-105 Escribir las pruebas (deben fallar) del codificador en `backend/tests/unit/test_codificador.py`: prefijos `query: ` y `passage: `;
  vectores de 768 y norma 1; un fichero de modelo con otra huella se rechaza; el codificador falso es determinista. La prueba con el modelo
  real se marca aparte y no se ejecuta en el CI. (REQ-31; R22)
- [ ] T-106 Implementar `consultas/codificador.py` y la descarga del modelo en `backend/Dockerfile`, de una revisión fija y con SHA-256
  comprobado. Pasan las pruebas de T-105. (REQ-31, REQ-35; R22)
- [ ] T-107 Escribir las pruebas (deben fallar) del esquema y de la carga en `backend/tests/integration/test_carga_corpus.py`: restricciones de
  data-model; repetir la carga no cambia nada ni duplica (H4-1); una norma modificada deja solo su redacción nueva, con su fecha (H4-2,
  H2-4); un fallo a mitad conserva la versión anterior (H4-3). (REQ-42)
- [ ] T-108 Escribir la migración (extensiones `vector` y `unaccent`, tablas `norma` y `fragmento`), los modelos y `scripts/cargar_corpus.py`.
  Pasan las pruebas de T-107. (REQ-42)
- [ ] T-109 Escribir `scripts/crear_instantanea.py` y generar `corpus/` con las normas de REQ-42 que tengan texto; anotar en `corpus/normas.json` la
  fuente, la fecha, la huella y la cobertura de cada una. Comprobar a mano cinco artículos contra el texto oficial, entre ellos el 16 y el
  anexo III del RD 1311/2012. (REQ-42; R20)
- [ ] T-110 Escribir las pruebas (deben fallar) de la búsqueda en `backend/tests/integration/test_buscar.py`: exacta por vectores; por texto, con las
  palabras unidas con «o» y en español; RRF con k = 60 sobre dos listas conocidas; 20 resultados como mucho y sin repetidos; empates en orden
  estable; una pregunta sin ninguna palabra en común devuelve igualmente los de los vectores. (REQ-31; R23)
- [ ] T-111 Implementar `consultas/buscar.py` y una orden de consola que muestre los fragmentos de una pregunta. Pasan las pruebas de T-110.
  (REQ-31; R23)
- [ ] T-112 Redactar `evaluacion/preguntas.yaml`: 15 de ajuste y 40 finales (30 con respuesta y 10 sin ella), con el artículo esperado y lenguaje de
  agricultor, repartidas entre las normas y sin repetir las de la medición del plan. **El alumno revisa cada una** y lo deja marcado en el
  fichero. Sin código. (REQ-43; R28)
- [ ] T-113 Escribir las pruebas (deben fallar) de la evaluación de la recuperación en `backend/tests/unit/test_evaluacion_recuperacion.py`: formato del
  fichero; ninguna pregunta está en los dos conjuntos (H4-4); todas las finales tienen la marca de revisión; cálculo de SC-101 sobre un caso
  conocido. (REQ-43)
- [ ] T-114 Implementar la parte sin modelo de `scripts/evaluar.py`, generar `evaluacion/vectores_preguntas.npy` y medir SC-101 en el CI, **sin que un
  valor bajo lo ponga en rojo** hasta H11. Pasan las pruebas de T-113. (REQ-43; R28)

**Punto de control H8**: búsqueda por consola y valor de SC-101 con el conjunto de **ajuste**. Si no llega al 90 %, se decide con el alumno la
reformulación de R23 antes de H9. El conjunto final no se mira hasta H11.

---

## H9: Respuestas con citas (historias 1 y 2)

**Objetivo**: preguntar desde la PWA y recibir una respuesta comprobada, con sus fuentes.

- [ ] T-115 Escribir las pruebas (deben fallar) de la validación en `backend/tests/unit/test_validar_respuesta.py`: cada marcador de estado; sin
  marcador o con uno desconocido → `sin_respaldo`; `SIN_RESPALDO` y `FUERA_DE_AMBITO` nunca muestran el texto del modelo; respuesta sin citas →
  `sin_respaldo`; bloque sin cita con una cifra, en número o en letra, o un plazo → `sin_respaldo`; extracto que no está en el fragmento →
  `sin_respaldo` (H2-2); la norma y la unidad salen del fragmento y no del texto. (REQ-31, REQ-32, REQ-34, REQ-39; R25)
- [ ] T-116 Implementar `consultas/validar.py` como funciones puras. Pasan las pruebas de T-115. (REQ-31, REQ-32, REQ-34, REQ-39; R25)
- [ ] T-117 Escribir las pruebas (deben fallar) de la generación en `backend/tests/unit/test_generar.py`, con un cliente falso: modelo, esfuerzo y
  bloques `search_result` con citas; **la petición solo contiene la instrucción, los fragmentos y la pregunta** (H1-10); la pregunta no
  puede cerrar su delimitador; sin herramientas; `refusal`, `max_tokens`, 429, 5xx, tiempo agotado y falta de clave → no disponible (H1-7); una
  pregunta que pide ignorar las reglas no cambia la instrucción (H1-8). (REQ-34, REQ-35, REQ-37, REQ-38; R24, R26)
- [ ] T-118 Implementar `consultas/generar.py`. Pasan las pruebas de T-117. (REQ-34, REQ-35, REQ-37, REQ-38; R24, R26)
- [ ] T-119 Escribir las pruebas (deben fallar) del límite en `backend/tests/integration/test_limite_consultas.py`: 20 sí y la 21 no, con la hora en que
  vuelve a haber (H1-9); el día cambia a medianoche de `Europe/Madrid`; varias peticiones simultáneas no pasan de 20; una consulta que falla
  devuelve su cupo; se suman los tokens; cada cuenta tiene el suyo. (REQ-36)
- [ ] T-120 Escribir la migración de `consumo_consulta`, su modelo y `consultas/limite.py`. Pasan las pruebas de T-119. (REQ-36)
- [ ] T-121 Escribir las pruebas (deben fallar) de la API en `backend/tests/integration/test_api_consultas.py` y de contrato en
  `backend/tests/contract/test_contrato_consultas.py`, con dobles: respondida, parcial, sin respaldo y fuera de ámbito (H1-1 a H1-5, H1-11);
  pregunta vacía, en blanco o de 501 caracteres → 422 (H1-12); sin sesión → 401; 429 y 503; aviso y fuente (H2-1, H2-3); `GET /normas`;
  **ni la base ni los registros contienen la pregunta** (H1-10); ninguna tabla del cuaderno cambia. (REQ-30 a REQ-39)
- [ ] T-122 Implementar `consultas/servicio.py`, `esquemas/consulta.py` y `api/consultas.py`, y regenerar el OpenAPI y los tipos. Pasan las pruebas de
  T-121. (REQ-30 a REQ-39)
- [ ] T-123 **Con permiso del alumno**, probar con la API real cinco preguntas de **ajuste**, anotar el gasto y corregir solo la instrucción si el
  modelo no respeta los marcadores o las citas. Máximo 1 USD. (REQ-31, REQ-32; R24)
- [ ] T-124 Escribir las pruebas (deben fallar) de la página en `frontend/tests/paginas/consultas.test.tsx`: enviar, esperar y ver la respuesta con sus
  citas; abrir una cita muestra norma, unidad, extracto dentro del texto, fecha y enlace (H2-1); aviso siempre visible (H2-3); petición de no
  escribir datos personales e información del servicio externo; cada estado; 429 con la hora; sin conexión o con 503 se conserva lo escrito
  (H1-6, H1-7); consultas que quedan; nada se guarda en IndexedDB. (REQ-30, REQ-33, REQ-35, REQ-36, REQ-37, REQ-39)
- [ ] T-125 Implementar `frontend/src/paginas/consultas/`, su ruta y su enlace desde el cuaderno. Pasan las pruebas de T-124. (Los mismos REQ)
- [ ] T-126 Escribir las pruebas (deben fallar) de las normas incluidas en `frontend/tests/paginas/normas.test.tsx`: lista con fecha, organismo, enlace y
  nota de cobertura. (REQ-33, REQ-42)
- [ ] T-127 Implementar esa lista en la página de consultas. Pasan las pruebas de T-126. (REQ-33, REQ-42)

**Punto de control H9**: historias 1 y 2 en el móvil con la API real.

---

## H10: Productos autorizados (historia 3)

**Objetivo**: ver el plazo de seguridad oficial, literal. *Primer bloque que se recorta.*

- [ ] T-128 Escribir las pruebas (deben fallar) de la importación en `backend/tests/integration/test_importar_productos.py`, con una muestra de pocos
  productos: textos literales («10 (AIRE LIBRE) 3 (INVERNADERO)», «NP», «NA», «-», vacío); producto sin usos, cancelado y caducado; importar dos
  veces no duplica; un fichero mal formado no cambia nada; se guarda la fecha del listado. (REQ-40, REQ-41)
- [ ] T-129 Escribir la migración, los modelos y `scripts/importar_productos.py`. Pasan las pruebas de T-128. (REQ-40, REQ-41)
- [ ] T-130 Escribir las pruebas (deben fallar) de la API en `backend/tests/integration/test_productos_autorizados.py` y su contrato: buscar por número y por
  nombre, sin tildes; todos los usos de un cultivo, con varios plazos (H3-4); `consultarEtiqueta` si no es solo un número (H3-3); cancelado y
  caducado (H3-5); inexistente (H3-6). (REQ-40, REQ-41)
- [ ] T-131 Implementar `api/productos_autorizados.py` y sus esquemas. Pasan las pruebas de T-130. (REQ-40, REQ-41)
- [ ] T-132 Escribir las pruebas (deben fallar) de la página en `frontend/tests/paginas/productos-autorizados.test.tsx` (escenarios H3-1 a H3-6). (REQ-40,
  REQ-41)
- [ ] T-133 Implementar `frontend/src/paginas/productos-autorizados/`. Pasan las pruebas de T-132. (REQ-40, REQ-41)

**Punto de control H10**: 50 usos comparados con el listado, con los no numéricos (SC-107).

---

## H11: Evaluación y cierre

- [ ] T-134 Escribir las pruebas (deben fallar) de la evaluación completa en `backend/tests/unit/test_evaluacion_respuestas.py`, con dobles: cálculo de SC-102 a
  SC-106 sobre casos conocidos, informe con los fallos (H4-4) y parada si se supera el gasto indicado. (REQ-43)
- [ ] T-135 Completar `scripts/evaluar.py` con el juez de R28. Pasan las pruebas de T-134. (REQ-43; R28)
- [ ] T-136 **Con permiso del alumno**, evaluar el conjunto de **ajuste**, decidir con él los cambios (reformulación, instrucción) y volver a medir.
  Máximo 1,50 USD. (REQ-43)
- [ ] T-137 **Con permiso del alumno**, evaluar **una vez** el conjunto final y versionar el informe, se cumplan o no los umbrales; evaluar también las
  líneas base. El alumno etiqueta 10 respuestas y se calcula el acuerdo con el juez. Máximo 2 USD. (REQ-43; SC-101 a SC-106, SC-108)
- [ ] T-138 Escribir la E2E mínima con respuestas simuladas en `e2e/consultas.spec.ts`, recorrer el [quickstart](quickstart.md), comprobar que cada REQ tiene una
  prueba que lo cita y ejecutar `/speckit-converge`. (Principio III; REQ-30 a REQ-43)

---

## Dependencias y orden

- T-100 necesita H4 de la 001 cerrado y aprobado. H8 → H9 → H11; H10 depende solo de T-100 y puede ir después de H9.
- Dentro de H8: T-101 a T-106 → T-107 a T-109 → T-110 y T-111 → T-113 y T-114. **T-112 (preguntas) puede hacerse desde el principio**, para que el
  alumno revise mientras se implementa.
- En paralelo: T-103 con T-105; T-119 con T-115.

## Trazabilidad REQ → tareas

| Requisito | Pruebas (antes) | Implementación | Validación |
| --- | --- | --- | --- |
| REQ-30 | T-121, T-124 | T-122, T-125 | T-138 |
| REQ-31 | T-103, T-105, T-110, T-115, T-121 | T-104, T-106, T-111, T-116, T-122 | T-137 |
| REQ-32 | T-115, T-121 | T-116, T-122 | T-137 |
| REQ-33 | T-121, T-124, T-126 | T-122, T-125, T-127 | T-138 |
| REQ-34 | T-115, T-117, T-121 | T-116, T-118, T-122 | T-137, T-138 |
| REQ-35 | T-117, T-121, T-124 | T-106, T-118, T-122, T-125 | T-138 |
| REQ-36 | T-119, T-121, T-124 | T-120, T-122, T-125 | T-138 |
| REQ-37 | T-117, T-121, T-124 | T-118, T-122, T-125 | T-138 |
| REQ-38 | T-117, T-121 | T-118, T-122 | T-138 |
| REQ-39 | T-103, T-115, T-121, T-124 | T-104, T-116, T-122, T-125 | T-137, T-138 |
| REQ-40 | T-128, T-130, T-132 | T-129, T-131, T-133 | H10 |
| REQ-41 | T-128, T-130, T-132 | T-129, T-131, T-133 | H10 |
| REQ-42 | T-101, T-107, T-126 | T-102, T-108, T-109, T-127 | T-138 |
| REQ-43 | T-113, T-134 | T-112, T-114, T-135 | T-136, T-137 |

Criterios de éxito: SC-101 → T-114 y T-137; SC-102 a SC-106 → T-137; SC-107 → punto de control H10; SC-108 → T-123, T-136 y T-137 (4,50 USD
como máximo entre las tres, de los 5 comprados; la demo usa el resto).
