# Investigación del plan: Consultas normativas con citas

Decisiones del plan de la 002, de R20 a R30 (la 001 usa R1 a R16). Fuentes consultadas el 2026-11-24 y el 2026-11-25; las
referencias en APA de los conceptos están en el módulo 06 (`docs/conceptos/06-rag.md`) y aquí solo las nuevas.

**Mediciones propias.** Las del 2026-11-25 son exploratorias: 25 preguntas redactadas por el agente con lenguaje de agricultor,
779 fragmentos de las cinco normas estatales, en el portátil del alumno y con otra sesión trabajando a la vez. **No son la
evaluación de REQ-43**, y esas preguntas no formarán parte del conjunto final.

---

## R20. Corpus: fuentes y vigencia (REQ-42)

- **Decisión**:

  | Norma | Fuente | Formato |
  | --- | --- | --- |
  | RD 1311/2012, 285/2021 (`BOE-A-2021-7689`), 1048/2022, 1049/2022, 1051/2022 y 1054/2022 | API de legislación consolidada del BOE (`/id/{id}/metadatos` y `/texto`) | XML por bloques, con versiones y fecha de vigencia |
  | Reglamento (UE) 2023/564 | XML del BOE, `DOUE-L-2023-80367` | XML con 14 tablas, sin imágenes |
  | Su modificación, Reglamento (UE) 2025/2203 | XML del BOE, `DOUE-L-2025-81626` | XML |
  | Decreto 80/2025 de Castilla-La Mancha | PDF oficial del DOCM (n.º 201, 17/10/2025; 27 páginas) | Texto, también en los anexos (unas 12 600 palabras) |

  1. De cada bloque se toma la versión con la **mayor fecha de vigencia que no sea posterior a hoy**.
  2. Se descartan preámbulos, firmas, notas iniciales y **las notas editoriales** (`blockquote`).
  3. Los bloques suprimidos o derogados no generan fragmentos.
- **Motivo**: las notas editoriales no son inocuas. El bloque del artículo 40 del RD 1311/2012 dice «(Suprimido)» y su nota reproduce
  **toda la redacción anterior**, derogada en 2021 por el RD 285/2021; indexarla daría por vigente un texto derogado (REQ-42).
- **Reproducibilidad**: los fragmentos y sus vectores se versionan como una **instantánea** (`corpus/`, con la fecha y la huella de cada
  fuente). Las pruebas y la evaluación usan siempre la misma, y cargar el corpus no exige red ni calcular vectores.
- **PDF del Decreto 80/2025** (comprobado el 2026-11-25): la versión HTML remite al PDF como la oficial y auténtica, y este tiene texto. Se
  extrae con `pypdf`, solo al crear la instantánea, quitando las cabeceras de página. La prosa de los anexos se carga; las tablas de los
  anejos I a V se cargan solo si la extracción coincide con el PDF en una revisión a mano y, si no, se declaran en `nota_cobertura`: una
  dosis leída en la columna equivocada es peor que no tenerla.
- **Hueco detectado y resuelto**: el almacenamiento de fitosanitarios lo regula hoy el RD 285/2021, cuyo artículo 7 trata de las
  explotaciones agrarias. El alumno decidió incluirlo el 2026-11-25. La medición de R22 se hizo sin él.
- **Alternativas**: descargar el PDF del BOE (pierde la estructura); cargar el corpus en cada arranque (depende de la red y cambia los
  resultados entre ejecuciones).

## R21. Fragmentación y contexto (REQ-31, REQ-39)

- **Decisión**: un fragmento por artículo, disposición o anexo; si pasa de **220 palabras**, se parte por apartados y, si un apartado es
  mayor, por párrafos, sin solapamiento. Delante de cada fragmento se antepone, solo para buscar, «norma + título del artículo». Cada
  fragmento guarda norma, unidad («artículo 16»), apartado si lo hay, texto literal, fechas y URL. Las tablas se pasan a texto por filas.
- **Motivo**: el fragmento es lo que se cita. En la medición, con un máximo de 260 palabras, la media fue de 265 tokens y solo 5 de los 112
  de la muestra llegaron al límite de 512 del modelo; con 220 se evita el corte.
- **Alternativas**: tamaño fijo con solapamiento (corta artículos); contexto generado por un LLM (coste y no determinista).

## R22. Modelo local de embeddings (REQ-31, REQ-35)

- **Decisión**: **`intfloat/multilingual-e5-base`** (licencia MIT, 768 dimensiones, 512 tokens), ejecutado con **ONNX Runtime** 1.32.0 y
  `tokenizers` 0.23.3, con los prefijos `query: ` y `passage: `, media de los tokens y vectores normalizados.
- **Medición** (el artículo 40, suprimido, queda fuera: 24 preguntas):

  | Búsqueda | 1 | 3 | 5 | 10 | 20 |
  | --- | --- | --- | --- | --- | --- |
  | Texto de PostgreSQL (`spanish`, palabras unidas con «o») | 8 | 12 | 14 | 14 | 20 |
  | e5-small, vectores | 13 | 17 | 19 | 21 | 21 |
  | **e5-base, vectores** | 14 | 20 | **22** | 22 | 22 |
  | e5-small + texto (RRF) | 12 | 16 | 17 | 20 | 21 |
  | **e5-base + texto (RRF)** | 10 | 16 | 17 | 21 | **23** |

  Recursos: e5-base, 1 058 MB, 6,5 s de carga, 827 s para indexar y 55 ms por pregunta (en lote); e5-small, 448 MB, 3,6 s, 270 s y 17 ms.
- **Motivo**: mejor acierto con un coste asumible. Indexar es lento, pero se hace una vez y la instantánea se versiona (R20). Los dos
  paquetes tienen ruedas para Python 3.14 en Windows y Linux.
- **Seguridad**: el modelo se descarga en la construcción de la imagen, de una **revisión fija y con su SHA-256 comprobado**; no se ejecuta
  código del repositorio del modelo (`voyage-4-nano` lo exige con `trust_remote_code`, y por eso se descarta).
- **CI**: no descarga el modelo. Las pruebas usan un codificador falso y los vectores versionados de las preguntas de referencia.
- **Alternativas**: e5-small (peor); BGE-M3 y e5-large (más de 2 GB; Docker tiene 4 GB en el equipo); PyTorch (rueda de 514 MB frente a
  26 MB); Voyage AI (descartado por el alumno: otra cuenta y política de datos).

## R23. Búsqueda (REQ-31; SC-101)

- **Decisión**: búsqueda **exacta** por producto interno en pgvector, sin índice aproximado, y búsqueda de texto de PostgreSQL con las
  palabras unidas con «o»; las dos listas de 50 se funden con RRF (k = 60) y pasan al modelo los **20 primeros** fragmentos.
- **Motivo**: con 20 fragmentos, la fusión da 23 de 24; la búsqueda por vectores sola gana en los primeros puestos, pero el modelo lee los
  20 y el orden pesa menos. Con menos de mil fragmentos no hace falta índice (módulo 06, § 3).
- **Sin umbral de similitud**: la similitud máxima de las preguntas contestables fue de 0,778 a más y la de cuatro preguntas ajenas al
  corpus, de 0,783 a 0,813. **Se solapan**, así que un umbral no separa lo que se sabe de lo que no; la abstención se decide en R25.
- **Mejora condicionada**: las dos que fallan («apuntar», «pedir la PAC») usan palabras que la norma no usa. Si con el conjunto de ajuste no
  se llega a SC-101, se añade una reformulación de la pregunta en términos normativos con el mismo modelo (una llamada más) y se mide.
- **Alternativas**: solo vectores con 10 fragmentos (22 de 24; más barata); reordenación con otro modelo (otro modelo que cargar).

## R24. Generación con citas (REQ-31, REQ-33, REQ-39)

- **Decisión**: API de Claude con el SDK oficial de Python (`anthropic`), modelo **`claude-haiku-5-5`**, `effort: low`, `max_tokens` 3 000,
  tiempo máximo de 25 s y un reintento. Los 20 fragmentos van como bloques `search_result` con **citas activadas** (`source` = URL oficial,
  `title` = norma y unidad). La instrucción exige: solo los fragmentos, español llano, frases cortas, una cita por afirmación y los
  marcadores de R25.
- **Motivo**: las citas de la API apuntan siempre a texto enviado, y ese texto no se cobra como salida (Anthropic, s. f.-a). Haiku lo fija
  la constitución. Haiku 5.5 no admite `temperature` y razona por defecto; los tokens de razonamiento cuentan en `max_tokens`.
- **Comprobaciones en código**: todo `cited_text` debe estar en el fragmento guardado (SC-105); se cita la norma y la unidad del fragmento
  guardado, no lo que escriba el modelo; `stop_reason` distinto de `end_turn` (`refusal`, `max_tokens`) se trata como fallo (REQ-37).
- **Coste estimado**: unos 9 000 tokens de entrada y 700 de salida → unos 0,0013 USD por consulta. Se mide con `usage`.
- **Alternativas**: salida estructurada (incompatible con las citas: error 400); pedir las citas en el texto y comprobarlas (más frágil);
  LangChain o LlamaIndex (capa adicional para un flujo fijo; módulo 06, § 8).

## R25. Abstención y ámbito (REQ-32, REQ-34, REQ-38)

- **Decisión**, en este orden:
  1. El modelo empieza su respuesta con una línea `ESTADO: RESPONDIDA`, `PARCIAL`, `SIN_RESPALDO` o `FUERA_DE_AMBITO`; el código la interpreta
     y la quita. Si falta o no es válida, cuenta como `SIN_RESPALDO`.
  2. Con `SIN_RESPALDO` o `FUERA_DE_AMBITO` **no se muestra el texto del modelo**: se muestra un mensaje fijo.
  3. Con `RESPONDIDA` o `PARCIAL`, si no hay ninguna cita válida → `SIN_RESPALDO`.
  4. Si un bloque **sin cita** contiene una cifra o un plazo, la respuesta entera se descarta → `SIN_RESPALDO`.
- **Motivo**: el umbral no funciona (R23). Las comprobaciones 2 a 4 son deterministas y se prueban sin el modelo. La 4 prefiere callar a dar una
  cifra sin fuente: puede rechazar respuestas buenas, y SC-104 mide cuántas.
- **Inyección**: la pregunta va en el mensaje del usuario, delimitada; el modelo no tiene herramientas; la ruta no escribe en el cuaderno.

## R26. Privacidad y límites de uso (REQ-35, REQ-36)

- **Decisión**: la petición a Claude lleva solo la instrucción, los fragmentos y la pregunta; no se envía ningún identificador de la cuenta.
  Ni la pregunta ni la respuesta se guardan ni se escriben en los registros (`logging`) del servidor. `consumo_consulta` guarda por cuenta y
  día el número de consultas y los tokens. El límite se reserva con un `INSERT … ON CONFLICT … DO UPDATE … WHERE n < 20` **antes** de llamar
  al modelo, y se devuelve si la consulta falla (503). El día es el de `Europe/Madrid`.
- **Clave**: `CUADERNO_CLAVE_ANTHROPIC`, documentada en `.env.example` sin valor y pasada de forma explícita al SDK. No se usa
  `ANTHROPIC_API_KEY` para que Claude Code no la tome en las terminales de VS Code. Sin clave, la API responde 503 con un mensaje llano.
- **Retención**: Anthropic borra entradas y salidas en 30 días como máximo, salvo excepciones (módulo 06, § 7). La pantalla informa de que
  la pregunta la procesa un servicio externo.
- **Pendiente**: dónde se procesan los datos y qué exige el RGPD para un uso real. Para la demo basta con preguntas sin datos personales.

## R27. Productos autorizados (REQ-40, REQ-41)

- **Decisión**: un comando importa el JSON del MAPA («Productos Autorizados para el Cuaderno de Explotaciones Agrarias») a dos tablas, con
  todos los campos de texto **literales**. La importación sustituye la anterior en una transacción y guarda la fecha del listado. El fichero
  (unos 50 MB) **no se versiona**; las pruebas usan una muestra de pocos productos con los casos difíciles.
- **Búsqueda**: por número de registro exacto o por nombre sin distinguir mayúsculas ni tildes (`unaccent`, disponible en la imagen).
- **Motivo**: el plazo es un número solo en la mitad de los usos; calcular sobre él sería inventar (REQ-40).
- **Limitaciones**: 3 productos no tienen usos; las condiciones de reutilización del MAPA y la descripción oficial de los campos no se han
  podido consultar. Antes de la entrega hay que comprobarlas o citar el listado sin redistribuirlo, que es lo que hace este diseño.

## R28. Evaluación (REQ-43)

- **Decisión**: `evaluacion/preguntas.yaml` con **15 de ajuste y 40 finales** (30 con respuesta y 10 sin ella), cada una con su artículo
  esperado. Las redacta el agente a partir de la norma y el alumno revisa todas antes de usarlas. `evaluar.py` mide:

  | Criterio | Cómo |
  | --- | --- |
  | SC-101 | El artículo esperado está entre los 20 fragmentos. Sin LLM |
  | SC-102 | Cada bloque con cita es una afirmación; un modelo juez dice si el extracto citado la respalda |
  | SC-103 | Alguna cita es del artículo esperado. Sin LLM |
  | SC-104 | `SIN_RESPALDO` o `FUERA_DE_AMBITO` frente a lo esperado. Sin LLM |
  | SC-105, SC-106 | Comprobación del extracto y tiempo medido |

- **Juez**: `claude-sonnet-5-5`, distinto del que genera, para reducir el sesgo a favor de las propias respuestas (Zheng et al., 2023). El
  alumno etiqueta a mano 10 respuestas y se informa del acuerdo con el juez. Estimación: menos de 1 USD por pasada completa.
- **Línea base**: la misma evaluación sin reformulación y solo con vectores, para comparar en la memoria.
- **Dónde se ejecuta**: SC-101 en cada PR, con la instantánea y los vectores de las preguntas. Lo que llama al modelo, **a mano** y con el visto
  bueno del alumno, porque cuesta dinero y varía. Los informes se versionan.
- **Alternativas**: Ragas (dependencia grande para métricas que aquí son sencillas); juez Haiku (más barato, pero sería el mismo modelo).

## R29. API y pantallas (REQ-30, REQ-37, REQ-39)

- **Decisión**: rutas nuevas en la API de la 001 (misma sesión y mismos errores) y dos páginas de la PWA, `/consultas` y
  `/productos-autorizados`. Nada se guarda en IndexedDB; lo escrito se mantiene en la pantalla si falla la red. La respuesta llega completa,
  sin ir apareciendo poco a poco, porque hay que validarla antes de mostrarla (R25).
- **Alternativas**: respuesta en *streaming* (se vería texto que luego podría descartarse).

## R30. Dependencias y despliegue

- **Dependencias nuevas**: `anthropic` 2.14.0, `onnxruntime` 1.32.0, `tokenizers` 0.23.3, `numpy` y `pgvector` 0.5.1 (cliente). `defusedxml`
  para leer el XML externo sin riesgos. Las versiones exactas las fija `uv.lock`, con `pip-audit` en el CI.
- **Imagen**: crece algo más de 1 GB por el modelo. La migración crea las extensiones `vector` y `unaccent`.
- **Alternativa**: servicio aparte para los embeddings (otro contenedor sin necesidad).

## Referencias nuevas

Agencia Estatal Boletín Oficial del Estado. (s. f.-c). *DOUE-L-2023-80367* [XML]. Recuperado el 25 de noviembre de 2026, de
https://www.boe.es/diario_boe/xml.php?id=DOUE-L-2023-80367

Anthropic. (s. f.-j). *Errors*. Claude Docs. Recuperado el 25 de noviembre de 2026, de
https://platform.claude.com/docs/en/api/errors

Python Software Foundation. (s. f.). *The Python Package Index: onnxruntime, tokenizers, anthropic, pgvector* [Metadatos]. Recuperado el 25
de noviembre de 2026, de https://pypi.org/
