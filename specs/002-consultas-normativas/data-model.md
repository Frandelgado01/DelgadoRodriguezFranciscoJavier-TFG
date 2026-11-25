# Modelo de datos: Consultas normativas con citas

Tablas nuevas en la base de la 001. Nombres en español y en singular, como allí. Solo se crean las que pide la spec (principio VII): **no hay
tabla de preguntas ni de respuestas** (REQ-35).

## Corpus

### `norma` (REQ-42)

| Columna | Tipo | Restricciones |
| --- | --- | --- |
| `id` | TEXT | PK; identificador oficial (`BOE-A-2012-11605`, `DOUE-L-2023-80367`…) |
| `titulo_corto` | TEXT | NOT NULL («RD 1311/2012») |
| `titulo` | TEXT | NOT NULL |
| `ambito` | TEXT | NOT NULL, CHECK IN (`europeo`, `estatal`, `autonomico`) |
| `organismo` | TEXT | NOT NULL («Agencia Estatal Boletín Oficial del Estado», «Diario Oficial de Castilla-La Mancha») |
| `url_oficial` | TEXT | NOT NULL |
| `fecha_actualizacion` | DATE | NOT NULL; última actualización que declara la fuente |
| `fecha_carga` | DATE | NOT NULL |
| `huella` | TEXT | NOT NULL; SHA-256 de la fuente |
| `nota_cobertura` | TEXT | NULL; p. ej. «sin los anexos» |

### `fragmento` (REQ-31, REQ-39, REQ-42)

| Columna | Tipo | Restricciones |
| --- | --- | --- |
| `id` | UUID | PK |
| `norma_id` | TEXT | FK → `norma`, NOT NULL, `ON DELETE CASCADE` (solo se borra al recargar) |
| `unidad` | TEXT | NOT NULL («artículo 16», «anexo III») |
| `apartado` | TEXT | NULL («3») |
| `orden` | INTEGER | NOT NULL, ≥ 1; UNIQUE (`norma_id`, `orden`) |
| `titulo` | TEXT | NOT NULL; título de la unidad |
| `texto` | TEXT | NOT NULL, no vacío; **literal**, lo que se cita |
| `fecha_vigencia` | DATE | NOT NULL |
| `url` | TEXT | NOT NULL; enlace al bloque si existe, o a la norma |
| `vector` | vector(768) | NOT NULL; de «passage: norma + título + texto» |
| `busqueda` | TSVECTOR | Generada: `to_tsvector('spanish', titulo || ' ' || texto)` |

Índice GIN en `busqueda`. Sin índice en `vector`: búsqueda exacta (R23). La carga de una norma borra sus fragmentos e inserta los nuevos en
**una transacción**: si falla, queda la versión anterior (escenario H4-3). Si la huella no cambia, no hace nada (H4-1).

## Productos autorizados (REQ-40, REQ-41)

### `producto_autorizado`

| Columna | Tipo | Restricciones |
| --- | --- | --- |
| `numero_registro` | TEXT | PK (2 099 valores, sin repetidos en el listado del 23/11/2026) |
| `nombre` | TEXT | NOT NULL |
| `titular` | TEXT | NULL |
| `formulado` | TEXT | NULL |
| `estado` | TEXT | NOT NULL, literal (`Vigente`, `Cancelado`) |
| `fecha_caducidad` | DATE | NULL |
| `condicionamiento` | TEXT | NULL, literal |
| `fecha_listado` | DATE | NOT NULL |

### `uso_autorizado`

| Columna | Tipo | Restricciones |
| --- | --- | --- |
| `id` | BIGINT | PK, identidad |
| `numero_registro` | TEXT | FK → `producto_autorizado`, NOT NULL, `ON DELETE CASCADE` |
| `codigo_cultivo` | TEXT | NOT NULL |
| `cultivo` | TEXT | NOT NULL |
| `agente` | TEXT | NULL; plaga o enfermedad |
| `plazo_seguridad` | TEXT | NOT NULL, **literal**, puede estar vacío |
| `condicionamiento` | TEXT | NULL, literal |
| `sistema_cultivo`, `ambito`, `tipo_usuario` | TEXT | NULL, literales |

Índice (`numero_registro`, `codigo_cultivo`). No hay columna numérica del plazo: no se calcula con él (REQ-40). La importación sustituye todo en
una transacción. Estas tablas son **independientes** de `producto` (001), que es el catálogo del agricultor.

## Límite y consumo (REQ-36)

### `consumo_consulta`

| Columna | Tipo | Restricciones |
| --- | --- | --- |
| `usuario_id` | UUID | FK → `usuario`, PK compuesta |
| `dia` | DATE | PK compuesta; día en `Europe/Madrid` |
| `consultas` | SMALLINT | NOT NULL, CHECK entre 0 y 20 |
| `tokens_entrada`, `tokens_salida` | INTEGER | NOT NULL, por defecto 0, CHECK ≥ 0 |

## Ficheros versionados (no son tablas)

| Fichero | Contenido |
| --- | --- |
| `corpus/normas.json` | Metadatos, fuente, fecha y huella de cada norma |
| `corpus/fragmentos.jsonl` | Fragmentos con su texto literal |
| `corpus/vectores.npy` | Vectores de los fragmentos (float32), en el mismo orden |
| `evaluacion/preguntas.yaml` | Preguntas de ajuste y finales, con lo esperado y la marca de revisión del alumno |
| `evaluacion/vectores_preguntas.npy` | Vectores de las preguntas, para medir SC-101 en el CI sin el modelo |
| `evaluacion/informes/` | Un informe por evaluación |

## Correspondencia con los requisitos

| Requisito | Dónde se garantiza |
| --- | --- |
| REQ-30, REQ-37 | Validación de la pregunta en la API y la PWA; respuestas 422 y 503 |
| REQ-31, REQ-32, REQ-34, REQ-38 | Servicio de consultas (R23 a R25); comprobaciones deterministas |
| REQ-33, REQ-39 | `norma` y `fragmento`; la cita se construye con sus datos y no con lo que escribe el modelo |
| REQ-35 | Ausencia de tablas de preguntas; contenido de la petición externa (R26) |
| REQ-36 | `consumo_consulta` |
| REQ-40, REQ-41 | `producto_autorizado` y `uso_autorizado`, con textos literales |
| REQ-42 | Carga por norma en una transacción, con huella y vigencia |
| REQ-43 | `evaluacion/` |
