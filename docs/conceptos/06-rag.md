# Módulo 06 — RAG: recuperar la norma y responder citándola

Guía de conceptos del TFG. Base para especificar y planificar la funcionalidad 002 (consultas normativas) y para el
apartado de RAG del capítulo 2. Fuentes consultadas el 2026-11-24; referencias en APA al final.

> **Qué está decidido y qué no.** La constitución (v2.0.0) ya fija PostgreSQL con pgvector, la generación con Claude
> Haiku, los embeddings con Voyage AI **o** un modelo local, un gasto de unos 10 € y la obligación de citar la fuente
> o reconocer que no se sabe (principio IV). Este módulo no lo vuelve a decidir: explica cada pieza, aporta datos
> medidos sobre el corpus y deja preguntas para la spec y el plan de la 002. Lo marcado como **propuesta** es del
> agente y está sin aprobar.

## En una frase

La **generación aumentada por recuperación** (*Retrieval-Augmented Generation*, RAG) consiste en buscar primero los
fragmentos de un corpus que pueden responder a una pregunta y dárselos al modelo de lenguaje para que redacte la
respuesta a partir de ellos. Lewis et al. (2020) la definieron como la combinación de una memoria **paramétrica** (lo
que el modelo aprendió al entrenarse) y otra **no paramétrica** (un índice de vectores al que se accede con un
recuperador).

## Por qué RAG en el Cuaderno de Campo

Los modelos de lenguaje pueden dar datos falsos, tienen un conocimiento que caduca y razonan de forma difícil de
rastrear; RAG permite actualizar el conocimiento y añadir el de un dominio concreto (Gao et al., 2023). En este
proyecto esos tres problemas son graves:

| Problema | En el cuaderno | Qué aporta RAG |
| --- | --- | --- |
| Datos falsos | Un plazo inventado puede costar una sanción o una ayuda | La respuesta se apoya en un texto que se muestra |
| Conocimiento caducado | De los 447 bloques en que el BOE divide las cinco normas estatales, 131 (29 %) han tenido más de una versión (medición propia, § 2) | Se actualiza el corpus, no el modelo |
| Falta de rastro | El principio IV exige citar el artículo o la ficha | Cada afirmación apunta a su fragmento |

**RAG no elimina las alucinaciones.** Magesh et al. (2024) evaluaron herramientas comerciales de consulta jurídica que
usan recuperación y encontraron que alucinaban entre el 17 % y el 33 % de las veces, menos que un chatbot general pero
mucho más de lo que anunciaban. Es el resultado más cercano a nuestro dominio y tiene dos consecuencias: la 002
necesita una **evaluación propia** (§ 6) y la interfaz debe dejar **comprobar la fuente** con facilidad.

### ¿Y por qué no meter toda la normativa en el mensaje?

Es la alternativa más simple y hay que descartarla con datos. Anthropic (2024) recomienda prescindir de RAG si la base
de conocimiento ocupa menos de 200 000 tokens. Las cinco normas estatales suman **149 268 palabras** (§ 2). Según la
equivalencia orientativa de Anthropic (s. f.-e), un millón de tokens son unas 555 000 palabras, así que serían unos
**269 000 tokens**: caben en la ventana de un millón de Claude Haiku 5.5, pero superan esa recomendación.

Estimación de coste por consulta con Claude Haiku 5.5, cuyo precio sube cuando el mensaje pasa de 100 000 tokens
(Anthropic, s. f.-f). Cálculo propio, suponiendo 1 000 tokens de salida:

| Enfoque | Entrada | Coste por consulta | Consultas con 10 USD |
| --- | --- | --- | --- |
| RAG (unos 5 000 tokens de fragmentos) | 0,10 USD/MTok | 0,001 USD | unas 10 000 |
| Corpus completo, sin caché | 0,50 USD/MTok | 0,137 USD | unas 73 |
| Corpus completo, leyendo de caché | 0,05 USD/MTok | 0,016 USD (más 0,17 USD cada vez que se escribe la caché, que dura 5 minutos) | unas 620, como máximo |

El tamaño en tokens es una estimación (la equivalencia no está medida para textos legales en español); hay que
confirmarlo con el contador de tokens de la API. Además, al menos en los modelos que analizaron Liu et al. (2023), el
rendimiento baja cuando el dato relevante está en medio de un contexto largo. **Conclusión:** RAG se justifica por
coste y por control de la fuente. El corpus completo con caché sirve como **línea base** para comparar en la memoria.

## Vista general

```
 INGESTA (una vez, y al cambiar una norma)
 BOE / DOUE / DOCM / etiquetas ─► limpiar ─► fragmentar ─► embeddings ─► PostgreSQL + pgvector
                                             (por artículo)              (texto, vector, metadatos)

 CONSULTA (cada pregunta)
 pregunta ─► búsqueda por significado (vectores) ─┐
          └► búsqueda por palabras (texto)       ─┴► fusión ─► ¿hay respaldo? ─ no ─► «No lo sé»
                                                                    │ sí
                                                                    ▼
                                     Claude Haiku + fragmentos ─► respuesta con citas
```

| Etapa | Pregunta que responde | Se prueba con |
| --- | --- | --- |
| Ingesta | ¿Qué texto y de qué versión? | Pruebas deterministas (pytest) |
| Recuperación | ¿Encuentro el artículo correcto? | Preguntas de referencia, sin LLM |
| Generación | ¿La respuesta se apoya en lo recuperado? | Evaluación con LLM y revisión humana |

## 1. Embeddings: convertir texto en vectores

Un **embedding** es una lista de números que representa el significado de un texto: textos parecidos quedan cerca. La
cercanía suele medirse con la **similitud del coseno**. Sentence-BERT mostró que, calculando el vector de cada frase por
separado, buscar el par más parecido entre 10 000 frases pasaba de unas 65 horas a unos 5 segundos (Reimers y
Gurevych, 2019). Por eso los vectores del corpus se calculan **una vez** y solo se calcula el de cada pregunta.

**Por qué hacen falta aquí.** Prueba hecha en la base del proyecto (PostgreSQL 18.6, configuración `spanish`): la
pregunta «¿cuánto tiempo tengo que guardar los registros?» **no** encuentra el artículo 16.3 («Los registros y
documentos se conservarán al menos durante los 3 años siguientes a su fecha de emisión»), porque la búsqueda por
palabras exige `cuant & tiemp & guard & registr` y el texto dice «conservarán». El agricultor no habla como el BOE; los
embeddings pretenden salvar esa distancia.

### Modelos candidatos

Anthropic no tiene modelo de embeddings propio y documenta el uso de Voyage AI (Anthropic, s. f.-b).

| Modelo | Dónde se ejecuta | Dimensiones | Entrada máxima | Precio o licencia |
| --- | --- | --- | --- | --- |
| `voyage-4` | API | 1024 (256, 512, 2048) | 32 000 tokens | 0,06 USD/MTok; 200 M gratis |
| `voyage-4-large` | API | 1024 (256, 512, 2048) | 32 000 tokens | 0,12 USD/MTok; 200 M gratis |
| `voyage-law-2` (jurídico, generación anterior) | API | 1024 | 16 000 tokens | 0,12 USD/MTok; 50 M gratis |
| `voyage-4-nano` | **Local** | 2048 (256, 512, 1024) | 32 000 tokens | Pesos abiertos, Apache 2.0 |
| BGE-M3 | **Local** | 1024 | 8 192 tokens | MIT |
| multilingual-e5-large | **Local** | 1024 | 512 tokens | MIT |

Fuentes: Anthropic (s. f.-b), Voyage AI (s. f.-a, s. f.-c, s. f.-d), BAAI (s. f.) y Wang et al. (2024). BGE-M3 admite más de
100 idiomas y tres modos de recuperación: denso, disperso y multivector (Chen et al., 2024).

Tres detalles prácticos:

- **Pregunta y documento se codifican distinto.** Voyage pide indicar `input_type` (`query` o `document`) y E5 exige los
  prefijos `query: ` y `passage: `; omitirlos puede empeorar el resultado (Anthropic, s. f.-b; Wang et al., 2024). BGE-M3 no los
  necesita (BAAI, s. f.).
- **`voyage-4-nano` comparte espacio vectorial** con el resto de la familia 4, así que se puede pasar de uno a otro sin
  volver a indexar, con la misma dimensión (Voyage AI, s. f.-d).
- **Coste.** El corpus medido ocupa menos de un millón de tokens: indexarlo entra de sobra en la cuota gratuita de los modelos de Voyage. El
  criterio de elección no es el precio, sino la calidad en español jurídico, la privacidad (§ 7) y la simplicidad.

## 2. El corpus y su fragmentación

### 2.1 De dónde sale el texto

El BOE ofrece una **API abierta de legislación consolidada** que devuelve cada norma dividida en **bloques** (un
artículo, una disposición o un anexo), con sus versiones y la fecha de vigencia de cada una (Agencia Estatal Boletín
Oficial del Estado [BOE], s. f.-a). Medición propia del 2026-11-24 con esa API, contando el texto vigente sin las
notas editoriales del BOE (que suman 11 108 palabras más):

| Norma | Identificador | Palabras | Artículos y disposiciones | Bloques con más de una versión |
| --- | --- | --- | --- | --- |
| RD 1311/2012 | BOE-A-2012-11605 | 26 950 | 68 | 13 |
| RD 1048/2022 | BOE-A-2022-23048 | 74 011 | 141 | 72 |
| RD 1049/2022 | BOE-A-2022-23049 | 14 298 | 33 | 10 |
| RD 1051/2022 | BOE-A-2022-23052 | 22 644 | 39 | 25 |
| RD 1054/2022 | BOE-A-2022-23054 | 11 365 | 25 | 11 |
| **Total** | | **149 268** | **306** | **131** |

El total incluye además 53 anexos (40 741 palabras, un 27 %) y los preámbulos (9 880), que no son texto normativo y
conviene decidir si se indexan.

Condiciones de reutilización que pasan a ser requisitos de la 002 (BOE, s. f.-b): citar a la Agencia como fuente,
indicar la fecha de la última actualización, no desnaturalizar el contenido y advertir que el texto consolidado es
**meramente informativo**.

El resto del corpus no está en esa API y sigue pendiente: el Decreto 80/2025 (DOCM, con anexos en imagen, módulo 04) y
el Reglamento de Ejecución (UE) 2023/564, que la hoja de ruta no incluye en el corpus pero del que deriva REQ-23.

**Etiquetas de productos.** El Registro de Productos Fitosanitarios ofrece en «Resúmenes» un *Listado completo de
Productos Autorizados para el Cuaderno de Explotaciones Agrarias* en JSON, con un documento que describe sus campos, y
se actualiza cada semana (Ministerio de Agricultura, Pesca y Alimentación [MAPA], s. f.). Resuelve en parte el pendiente 6
del módulo 04: **hay datos oficiales descargables**. Falta abrir la descripción y comprobar si incluye el plazo de
seguridad. Si lo incluye, esa pregunta **no es de RAG**: un dato estructurado se consulta con SQL y se responde con
exactitud (§ 8).

### 2.2 Fragmentar por artículo

Un vector resume un texto, así que un fragmento demasiado largo mezcla temas y uno demasiado corto pierde el contexto.
El tamaño, los límites y el solapamiento influyen en la recuperación (Anthropic, 2024), y la estrategia elegida puede
cambiar la exhaustividad hasta un 9 % (Smith y Troynikov, 2024).

| Estrategia | Ventaja | Inconveniente aquí |
| --- | --- | --- |
| Tamaño fijo con solapamiento | Trivial | Corta artículos y obliga a deducir qué artículo se cita |
| Recursiva (párrafos, frases) | Buen punto de partida general | Ignora la estructura de la norma |
| Semántica o con LLM | Cortes con sentido | Coste y complejidad; no es determinista con un LLM |
| **Por estructura (artículo)** | El fragmento **es** la unidad que se cita | Hay artículos muy largos |

Los datos apoyan la última para los artículos y disposiciones: de los 306, la mediana es de **198 palabras**, el 90 % tiene 693 o
menos, 24 pasan de 800 y solo 2 de 2 000 (el mayor, 4 296). Los **anexos son lo difícil**: 16 de los 53 pasan de 800
palabras y 5 de 2 000, entre ellos el anexo III del RD 1311/2012 (2 141), del que sale buena parte de la 001; además, las cinco
normas contienen 31 tablas. **Propuesta:** un fragmento por artículo y, en los largos, uno por apartado; los anexos, por
sección, con un tratamiento propio para las tablas.

### 2.3 Dar contexto a cada fragmento

Un apartado suelto («Los registros se conservarán…») no dice de qué norma es. La **recuperación contextual** antepone a
cada fragmento una breve explicación generada por un LLM antes de indexarlo; en las pruebas de Anthropic (2024) los
fallos de recuperación bajaron un 35 % con embeddings, un 49 % al sumar BM25 y un 67 % con reordenación. Aquí la mayor
parte de ese contexto ya está en la estructura: **propuesta**, anteponer de forma determinista norma, capítulo, artículo
y título, sin LLM, y medir si hace falta más.

**Metadatos de cada fragmento:** norma, identificador del BOE, artículo y apartado, título, URL, fechas de publicación y
de vigencia, fecha de descarga y huella del texto, para reindexar solo lo que cambia.

## 3. Búsqueda vectorial con pgvector

- **Exacta o aproximada.** Por defecto, pgvector hace búsqueda **exacta**, con exhaustividad perfecta. Los índices
  aproximados ganan velocidad a cambio de precisión: **HNSW** (mejor relación entre velocidad y exhaustividad, más
  memoria) e **IVFFlat** (pgvector, s. f.). HNSW recorre grafos en capas, de la más dispersa a la más densa (Malkov y
  Yashunin, 2018).
- **Para este corpus basta la exacta:** con unos cientos de fragmentos no hace falta índice y se evita un problema
  conocido, que los índices aproximados filtran **después** de buscar y pueden devolver menos filas de las pedidas
  (pgvector, s. f.). Es la opción que pide el principio VII.
- **Límite:** un índice sobre el tipo `vector` admite hasta 2 000 dimensiones (pgvector, s. f.). Con 1 024 no afecta.
- **Operador:** con vectores normalizados, como los de Voyage, coseno y producto interno ordenan igual (Anthropic,
  s. f.-b).

## 4. Recuperación híbrida y reordenación

Los embeddings captan el significado pero pueden fallar con términos exactos; la búsqueda por palabras (BM25) acierta con
identificadores y tecnicismos (Anthropic, 2024). En el cuaderno hay muchos: «ROMA», «art. 16», «ecorregímenes», números
de registro. La **búsqueda híbrida** combina ambas.

- **Por palabras en PostgreSQL:** `tsvector` con la configuración `spanish`. Dos avisos. Sus funciones de orden no usan
  información global del corpus (PostgreSQL Global Development Group, s. f.), así que **no es BM25**: un término raro no
  pesa más que uno frecuente. Y `websearch_to_tsquery` une las palabras con «y», por lo que una pregunta completa casi
  nunca coincide (§ 1); habrá que unirlas con «o».
- **Fusión:** *Reciprocal Rank Fusion* (RRF) suma 1/(k + posición) de cada lista, con k = 60; solo usa posiciones, así
  que no hay que comparar puntuaciones de escalas distintas, y superó de media en un 4–5 % al mejor sistema individual
  y a otros métodos de fusión en sus ensayos piloto y con colecciones TREC (Cormack et al., 2009). pgvector (s. f.) la recomienda para combinarse con la búsqueda de
  texto.
- **Reordenación:** un **cross-encoder** lee juntas la pregunta y cada candidato; es más preciso, pero más lento, y por
  eso solo se aplica a los primeros resultados (Sentence Transformers, s. f.). **Propuesta:** no incluirlo al principio y
  añadirlo solo si la evaluación demuestra que hace falta.
- **Cuántos fragmentos:** Anthropic (2024) obtuvo mejores resultados con 20 que con 5 o 10, pero advierte que conviene
  probarlo en cada caso. Es un parámetro que debe fijar la evaluación.

## 5. Generación con citas

### 5.1 Citas verificables

La API de Claude tiene una función de **citas**: se envían los documentos y cada fragmento de la respuesta vuelve con el
texto citado y su posición. Como la API extrae ese texto, los punteros son siempre válidos, y el texto citado no se
cobra como salida (Anthropic, s. f.-a). Para RAG existe el bloque `search_result`, con `source` y `title`, en el que se puede
poner la URL del BOE y «RD 1311/2012, art. 16» (Anthropic, s. f.-h).

**Qué garantiza y qué no:** que la cita existe en el documento enviado. No garantiza que respalde la afirmación, ni que
cada afirmación lleve cita, ni que se recuperase el artículo correcto. Hay que comprobarlo aparte.

**Restricción de diseño:** las citas no se pueden combinar con salidas estructuradas (`output_config.format`); la API
responde con un error 400 (Anthropic, s. f.-a). La respuesta será texto con citas, no un JSON propio.

### 5.2 Decir «no lo sé»

El principio IV lo exige. Anthropic (s. f.-g) recomienda permitir expresamente que el modelo reconozca que no sabe,
limitarlo a los documentos dados y apoyar cada afirmación en una cita, y advierte de que nada de eso elimina las
alucinaciones. **Propuesta**, tres barreras de más barata a más cara:

1. **Antes de generar:** si ningún fragmento supera un umbral de similitud, no se llama al modelo.
2. **En la instrucción:** responder solo con los fragmentos y decir que no se encuentra respaldo.
3. **Después, en código:** si la respuesta no trae ninguna cita, se sustituye por «No lo sé».

### 5.3 Particularidades de Claude Haiku 5.5

Ventana de un millón de tokens, razonamiento adaptativo activado por defecto y esfuerzo `medium` (Anthropic, s. f.-e). No
hay que enviar `temperature`, `top_p` ni `top_k`, los tokens de razonamiento cuentan en `max_tokens` y hay que tratar el
motivo de parada `refusal` (Anthropic, s. f.-c). Consecuencia: **no se puede fijar la temperatura a cero**, así que una misma
pregunta puede recibir redacciones distintas. Las pruebas deben comprobar propiedades (qué artículo cita, si se
abstiene) y no textos literales.

## 6. Evaluación

Objetivo 3 del TFG y `TODO(METRICAS_RAG)` de la constitución. Se evalúa por separado **recuperar** y **generar**: si la
respuesta falla, hay que saber cuál de las dos falló.

| Qué se mide | Métrica | ¿Necesita referencia? | ¿Necesita LLM? |
| --- | --- | --- | --- |
| Recuperación | Exhaustividad en los k primeros: ¿está el artículo correcto? | Sí, el artículo esperado | No |
| Recuperación | Posición del primer acierto | Sí | No |
| Recuperación | *Context recall*: afirmaciones de la respuesta de referencia respaldadas por lo recuperado (Ragas, s. f.-a) | Sí | Sí |
| Generación | **Fidelidad** (*faithfulness*): afirmaciones respaldadas por el contexto, entre el total (Ragas, s. f.-b) | No | Sí |
| Generación | **Relevancia** (*response relevancy*): se generan preguntas desde la respuesta y se comparan con la original; **no mide si es cierta** (Ragas, s. f.-c) | No | Sí |
| Citas | ¿Cita el artículo esperado? | Sí | No |
| Abstención | ¿Dice «no lo sé» cuando el corpus no lo contiene? ¿Y solo entonces? | Sí | No |

- **Fidelidad no es corrección:** una respuesta fiel a un artículo equivocado es falsa. Por eso no basta con las métricas
  sin referencia de Ragas (Es et al., 2023) y hace falta un **conjunto de preguntas propio** con el artículo esperado,
  escrito a partir de la norma y **revisado por el alumno**, que incluya preguntas sin respuesta en el corpus y otras
  redactadas como hablaría un agricultor.
- **LLM como juez:** un buen modelo coincide con las personas en más del 80 % de los casos, pero tiene sesgos de posición,
  de longitud y a favor de sus propias respuestas (Zheng et al., 2023). Propuesta: que el alumno etiquete una muestra y se
  informe del grado de acuerdo con el juez.
- **En el pipeline:** las pruebas de ingesta y recuperación son deterministas y no gastan tokens si los vectores se
  calculan en local o se guardan; pueden correr en cada PR. Las que llaman al LLM cuestan dinero y varían: bajo demanda y
  antes de cerrar un hito. Decidirlo en el plan.

## 7. Seguridad y privacidad

- **Inyección de instrucciones indirecta:** un documento recuperado puede contener instrucciones para el modelo, y RAG no
  lo mitiga por completo (OWASP, 2025a). Aquí el corpus es cerrado y oficial, lo que reduce el riesgo; la
  entrada no fiable es la pregunta. Medidas: rol limitado, comprobar la salida con código y que el módulo **no pueda
  escribir** en el cuaderno (mínimo privilegio).
- **Corpus:** aceptar solo fuentes de confianza, validar la ingesta y registrar lo recuperado (OWASP, 2025b).
- **Datos que salen del servidor (principio VI):** para responder basta enviar la pregunta y los fragmentos; **no** hace
  falta enviar datos de la explotación ni la identidad. La interfaz debe pedir que no se escriban datos personales.
  - *Anthropic:* en la API comercial borra entradas y salidas en un plazo máximo de 30 días, salvo excepciones (Anthropic,
    s. f.-d), y no entrena con los datos retenidos sin permiso expreso (Anthropic, s. f.-i).
  - *Voyage AI:* puede usar los datos para entrenar **salvo que se desactive**, lo que exige tener un método de pago
    registrado (Voyage AI, s. f.-b). Con un modelo local, la pregunta no sale hacia un segundo proveedor.

## 8. Alternativas

| Decisión | Alternativa | A favor | En contra |
| --- | --- | --- | --- |
| RAG | Corpus completo en el mensaje | Sin recuperación que falle | Unas 137 veces más caro sin caché (§ Por qué RAG) |
| RAG | Ajuste fino (*fine-tuning*) | Respuestas sin buscar | No cita y hay que repetirlo con cada cambio normativo |
| RAG para todo | SQL para datos estructurados (plazo de seguridad) | Exacto y comprobable | Solo sirve para lo que ya es una tabla |
| Código propio | LangChain | Muchas integraciones; hoy se presenta como marco de **agentes** (LangChain, s. f.) | Capa adicional para un flujo fijo |
| Código propio | LlamaIndex | Conectores, índices y motores de consulta para RAG (LlamaIndex, s. f.) | Oculta las piezas que el TFG quiere explicar y medir |
| Embeddings por API | Modelo local | Privacidad, sin cuota, reproducible en el CI | Peso de la imagen y CPU; hay que medirlo |
| Claude Haiku | LLM local con Ollama (s. f.) | Sin coste por uso ni salida de datos | Necesita un equipo capaz; calidad en español por medir |
| pgvector | Base vectorial dedicada | Pensada para gran escala | Otra base que mantener para unos cientos de fragmentos (módulo 05) |

**Propuesta:** código propio. El flujo es fijo (buscar, fusionar, generar) y cabe en pocas funciones, que se prueban una a
una y se explican en la memoria (principio VII). Ragas, o sus métricas reimplementadas, solo para evaluar.

## 9. Preguntas para la spec y el plan de la 002

**Spec (qué):**

1. ¿Qué normas forman el corpus? ¿Entra el Reglamento (UE) 2023/564? ¿Y las etiquetas o solo el listado del MAPA?
2. ¿Qué preguntas quedan fuera (diagnóstico de plagas, recomendación de productos) y qué se responde en ese caso?
3. ¿Cómo se muestra la fuente: artículo, texto literal, enlace y fecha de la última actualización? ¿Y el aviso de que es
   informativo y no sustituye al asesoramiento?
4. ¿La consulta puede usar datos del cuaderno («¿puedo cosechar **ya** la parcela 4?»)? Sin la 003, la respuesta solo puede
   dar el plazo y explicar el cálculo.
5. ¿Qué pasa sin conexión? Las consultas necesitan red (REQ-06 solo cubre el registro).
6. ¿Se guarda un historial de consultas? Si se guarda, ¿cuánto tiempo?
7. Métricas mínimas de aceptación: exhaustividad, fidelidad, citas y abstención.

**Plan (cómo):**

8. Embeddings: Voyage o local. **Propuesta:** comparar `voyage-4`, `voyage-4-nano` y BGE-M3 con el mismo conjunto de
   preguntas y decidir con datos.
9. Fragmentación por artículo y apartado; tratamiento de tablas y anexos.
10. Cómo se detecta que una norma ha cambiado y se reindexa solo lo afectado.
11. Fusión, número de fragmentos y umbral de abstención: valores fijados con la evaluación, sobre preguntas distintas de
    las que sirven para el resultado final.
12. Límite de gasto: tope en la consola, límite de consultas por cuenta y registro de los tokens de cada respuesta
    (capítulo 5).
13. Qué evaluaciones corren en cada PR y cuáles bajo demanda.

## 10. Pendientes de verificar

1. Tokens reales del corpus con el contador de la API (necesita clave).
2. Descripción del JSON del MAPA: campos, plazo de seguridad y condiciones de reutilización.
3. Fuente reutilizable del Decreto 80/2025 (DOCM) y de sus anexos.
4. Qué límites tiene Voyage sin método de pago, y si el acceso por MongoDB Atlas tiene la misma política de datos.
5. Memoria y tiempo de los modelos locales en el equipo del alumno y en GitHub Actions.
6. Dónde se procesan los datos (transferencias fuera de la Unión Europea) y qué exige el RGPD para la demo.

## Preguntas de autocomprobación

1. ¿Qué es la memoria paramétrica y cuál es la no paramétrica en nuestro sistema?
2. ¿Por qué la pregunta sobre «guardar» los registros no encuentra el artículo que habla de «conservarlos»?
3. ¿Por qué se fragmenta por artículo y no cada 500 tokens?
4. ¿Qué aporta RRF y por qué no hace falta normalizar las puntuaciones?
5. ¿Qué garantiza una cita de la API y qué no?
6. ¿Puede una respuesta ser completamente fiel y, aun así, falsa?
7. ¿Por qué no hace falta un índice HNSW en este corpus?

## Referencias

Agencia Estatal Boletín Oficial del Estado. (s. f.-a). *API de datos abiertos: legislación consolidada*. Recuperado el 24 de
noviembre de 2026, de https://www.boe.es/datosabiertos/api/api.php

Agencia Estatal Boletín Oficial del Estado. (s. f.-b). *Aviso legal*. Recuperado el 24 de noviembre de 2026, de
https://www.boe.es/informacion/aviso_legal/index.php

Anthropic. (2024, 19 de septiembre). *Introducing contextual retrieval*.
https://www.anthropic.com/engineering/contextual-retrieval

Anthropic. (s. f.-a). *Citations*. Claude Docs. Recuperado el 24 de noviembre de 2026, de
https://platform.claude.com/docs/en/build-with-claude/citations

Anthropic. (s. f.-b). *Embeddings*. Claude Docs. Recuperado el 24 de noviembre de 2026, de
https://platform.claude.com/docs/en/build-with-claude/embeddings

Anthropic. (s. f.-c). *Claude Haiku 5.5 migration guide*. Claude Docs. Recuperado el 24 de noviembre de 2026, de
https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide

Anthropic. (s. f.-d). *How long do you store my organization's data?* Privacy Center. Recuperado el 24 de noviembre de
2026, de https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data

Anthropic. (s. f.-e). *Models overview*. Claude Docs. Recuperado el 24 de noviembre de 2026, de
https://platform.claude.com/docs/en/models/overview

Anthropic. (s. f.-f). *Pricing*. Claude Docs. Recuperado el 24 de noviembre de 2026, de
https://platform.claude.com/docs/en/about-claude/pricing

Anthropic. (s. f.-g). *Reduce hallucinations*. Claude Docs. Recuperado el 24 de noviembre de 2026, de
https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations

Anthropic. (s. f.-h). *Search results*. Claude Docs. Recuperado el 24 de noviembre de 2026, de
https://platform.claude.com/docs/en/build-with-claude/search-results

Anthropic. (s. f.-i). *API and data retention*. Claude Docs. Recuperado el 24 de noviembre de 2026, de
https://platform.claude.com/docs/en/manage-claude/api-and-data-retention

BAAI. (s. f.). *bge-m3* [Ficha del modelo]. Hugging Face. Recuperado el 24 de noviembre de 2026, de
https://huggingface.co/BAAI/bge-m3

Chen, J., Xiao, S., Zhang, P., Luo, K., Lian, D. y Liu, Z. (2024). *M3-Embedding: Multi-linguality, multi-functionality,
multi-granularity text embeddings through self-knowledge distillation*. arXiv. https://arxiv.org/abs/2402.03216

Cormack, G. V., Clarke, C. L. A. y Büttcher, S. (2009). Reciprocal rank fusion outperforms Condorcet and individual rank
learning methods. En *Proceedings of SIGIR '09*. ACM. http://cormack.uwaterloo.ca/cormacksigir09-rrf.pdf

Es, S., James, J., Espinosa-Anke, L. y Schockaert, S. (2023). *Ragas: Automated evaluation of retrieval augmented
generation*. arXiv. https://arxiv.org/abs/2309.15217

Gao, Y., Xiong, Y., Gao, X., Jia, K., Pan, J., Bi, Y., Dai, Y., Sun, J., Wang, M. y Wang, H. (2023).
*Retrieval-augmented generation for large language models: A survey*. arXiv. https://arxiv.org/abs/2312.10997

LangChain. (s. f.). *LangChain overview*. Recuperado el 24 de noviembre de 2026, de
https://docs.langchain.com/oss/python/langchain/overview

Lewis, P., Perez, E., Piktus, A., Petroni, F., Karpukhin, V., Goyal, N., Küttler, H., Lewis, M., Yih, W., Rocktäschel, T.,
Riedel, S. y Kiela, D. (2020). Retrieval-augmented generation for knowledge-intensive NLP tasks. En *Advances in Neural
Information Processing Systems 33 (NeurIPS 2020)*. https://arxiv.org/abs/2005.11401

Liu, N. F., Lin, K., Hewitt, J., Paranjape, A., Bevilacqua, M., Petroni, F. y Liang, P. (2023). Lost in the middle: How
language models use long contexts. *Transactions of the Association for Computational Linguistics*.
https://arxiv.org/abs/2307.03172

LlamaIndex. (s. f.). *LlamaIndex framework*. Recuperado el 24 de noviembre de 2026, de
https://developers.llamaindex.ai/python/framework/

Magesh, V., Surani, F., Dahl, M., Suzgun, M., Manning, C. D. y Ho, D. E. (2024). *Hallucination-free? Assessing the
reliability of leading AI legal research tools*. arXiv. https://arxiv.org/abs/2405.20362

Malkov, Y. A. y Yashunin, D. A. (2018). *Efficient and robust approximate nearest neighbor search using hierarchical
navigable small world graphs* (versión 4). arXiv. https://arxiv.org/abs/1603.09320

Ministerio de Agricultura, Pesca y Alimentación. (s. f.). *Consultas fitosanitarios: Registro de Productos
Fitosanitarios*. Recuperado el 24 de noviembre de 2026, de https://servicio.mapa.gob.es/regfiweb

Ollama. (s. f.). *Ollama documentation*. Recuperado el 24 de noviembre de 2026, de https://docs.ollama.com/

OWASP. (2025a). *LLM01:2025 Prompt injection*. OWASP Gen AI Security Project. Recuperado el 24 de noviembre de 2026, de
https://genai.owasp.org/llmrisk/llm01-prompt-injection/

OWASP. (2025b). *LLM08:2025 Vector and embedding weaknesses*. OWASP Gen AI Security Project. Recuperado el 24 de noviembre
de 2026, de https://genai.owasp.org/llmrisk/llm082025-vector-and-embedding-weaknesses/

pgvector. (s. f.). *pgvector: Open-source vector similarity search for Postgres* [Repositorio de GitHub]. Recuperado el 24 de
noviembre de 2026, de https://github.com/pgvector/pgvector

PostgreSQL Global Development Group. (s. f.). *Controlling text search* (PostgreSQL 18). Recuperado el 24 de noviembre de
2026, de https://www.postgresql.org/docs/18/textsearch-controls.html

Ragas. (s. f.-a). *Context recall*. Recuperado el 24 de noviembre de 2026, de
https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_recall/

Ragas. (s. f.-b). *Faithfulness*. Recuperado el 24 de noviembre de 2026, de
https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/faithfulness/

Ragas. (s. f.-c). *Response relevancy*. Recuperado el 24 de noviembre de 2026, de
https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/answer_relevance/

Reimers, N. y Gurevych, I. (2019). Sentence-BERT: Sentence embeddings using Siamese BERT-networks. En *Proceedings of EMNLP
2019*. https://arxiv.org/abs/1908.10084

Sentence Transformers. (s. f.). *Retrieve & re-rank*. Recuperado el 24 de noviembre de 2026, de
https://www.sbert.net/examples/sentence_transformer/applications/retrieve_rerank/README.html

Smith, B. y Troynikov, A. (2024). *Evaluating chunking strategies for retrieval*. Chroma.
https://www.trychroma.com/research/evaluating-chunking

Voyage AI. (s. f.-a). *Text embeddings*. Recuperado el 24 de noviembre de 2026, de
https://docs.voyageai.com/docs/embeddings

Voyage AI. (s. f.-b). *FAQ*. Recuperado el 24 de noviembre de 2026, de https://docs.voyageai.com/docs/faq

Voyage AI. (s. f.-c). *Pricing*. Recuperado el 24 de noviembre de 2026, de https://docs.voyageai.com/docs/pricing

Voyage AI. (s. f.-d). *voyage-4-nano* [Ficha del modelo]. Hugging Face. Recuperado el 24 de noviembre de 2026, de
https://huggingface.co/voyageai/voyage-4-nano

Wang, L., Yang, N., Huang, X., Yang, L., Majumder, R. y Wei, F. (2024). *Multilingual E5 text embeddings: A technical
report*. arXiv. Ficha del modelo recuperada el 24 de noviembre de 2026, de
https://huggingface.co/intfloat/multilingual-e5-large

Zheng, L., Chiang, W.-L., Sheng, Y., Zhuang, S., Wu, Z., Zhuang, Y., Lin, Z., Li, Z., Li, D., Xing, E. P., Zhang, H.,
Gonzalez, J. E. y Stoica, I. (2023). Judging LLM-as-a-judge with MT-Bench and Chatbot Arena. En *NeurIPS 2023 Datasets and
Benchmarks Track*. https://arxiv.org/abs/2306.05685
