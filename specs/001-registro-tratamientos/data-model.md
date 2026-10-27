# Modelo de datos: Registro de tratamientos fitosanitarios

**Funcionalidad**: [spec.md](spec.md) · **Investigación**: [research.md](research.md) (R4–R6, R9, R10, R14)

Convenciones:

- Nombres en español y `snake_case`, alineados con el anexo V del SIEX (FEGA, 2025a) cuando hay campo
  equivalente; la columna "SIEX" indica bloque y campo.
- Claves primarias `UUID`. En las entidades que se crean sin conexión (tratamiento, producto) el UUID lo genera
  el cliente (R4).
- Claves foráneas con `ON DELETE RESTRICT`: nada se borra en cascada.
- **Bajas lógicas**: `estado` (`activa`/`baja`) y `fecha_baja`; nunca `DELETE` (REQ-17).
- Todas las tablas de la explotación llevan `explotacion_id` y la API filtra siempre por la explotación de la
  sesión (REQ-20: solo el titular ve sus datos).
- Marcas de tiempo `TIMESTAMPTZ`; fechas agrarias `DATE` en hora de `Europe/Madrid`.

## Diagrama de relaciones

```text
usuario 1──1 explotacion 1──* parcela
   │                     1──* persona (aplicador | asesor)
   │                     1──* equipo
   │                     1──* producto
   │                     1──* tratamiento ──* tratamiento_parcela *──1 parcela
   │                                      ──* tratamiento_producto *──1 producto
   │                                      ──* cambio (historial)
   │                                      ──* aviso_correo
   ├──* sesion
   └──* token_restablecimiento
```

## Cuentas (REQ-20, REQ-21)

### `usuario`

| Columna | Tipo | Restricciones |
| --- | --- | --- |
| `id` | UUID | PK |
| `correo` | TEXT | NOT NULL, UNIQUE sobre `lower(correo)` |
| `hash_contrasena` | TEXT | NOT NULL (Argon2id, formato PHC de `pwdlib`) |
| `creado_en` | TIMESTAMPTZ | NOT NULL |

La contraseña en claro nunca se guarda ni se registra en los logs. Longitud de 15 a 128 caracteres, validada
en la API y en la PWA (R9).

### `sesion`

| Columna | Tipo | Restricciones |
| --- | --- | --- |
| `hash_token` | BYTEA | PK (SHA-256 del token; el token en claro solo viaja en la cookie) |
| `usuario_id` | UUID | FK → `usuario`, NOT NULL |
| `creada_en` | TIMESTAMPTZ | NOT NULL |
| `ultimo_uso` | TIMESTAMPTZ | NOT NULL |
| `expira_en` | TIMESTAMPTZ | NOT NULL (`creada_en` + 90 días) |
| `revocada_en` | TIMESTAMPTZ | NULL |

Válida si `revocada_en IS NULL`, `now() < expira_en` y `now() - ultimo_uso < 30 días` (R9).

### `token_restablecimiento`

| Columna | Tipo | Restricciones |
| --- | --- | --- |
| `hash_token` | BYTEA | PK |
| `usuario_id` | UUID | FK → `usuario`, NOT NULL |
| `creado_en` | TIMESTAMPTZ | NOT NULL |
| `expira_en` | TIMESTAMPTZ | NOT NULL (`creado_en` + 1 hora) |
| `usado_en` | TIMESTAMPTZ | NULL (un solo uso) |

Límite: 3 solicitudes por usuario y hora, contadas sobre esta tabla. Al usarse un token: se revocan todas las
sesiones del usuario y los demás tokens pendientes.

## Explotación y datos maestros (REQ-14 a REQ-17)

### `explotacion`

| Columna | Tipo | Restricciones |
| --- | --- | --- |
| `id` | UUID | PK |
| `usuario_id` | UUID | FK → `usuario`, NOT NULL, UNIQUE (una explotación por usuario) |
| `creada_en` | TIMESTAMPTZ | NOT NULL |

Se crea con la cuenta. Los datos del titular (sección A.1) son de la funcionalidad 004.

### `parcela` (REQ-14; RD 1311/2012, anexo III, A.2)

| Columna | Tipo | Restricciones | SIEX |
| --- | --- | --- | --- |
| `id` | UUID | PK | |
| `explotacion_id` | UUID | FK, NOT NULL | |
| `nombre` | TEXT | NOT NULL, 1–100 car. (número o nombre, A.2.a) | |
| `sigpac_provincia` | SMALLINT | NOT NULL, 1–99 | REA 12.2 |
| `sigpac_municipio` | SMALLINT | NOT NULL, ≥ 1 | REA 12.3 |
| `sigpac_agregado` | SMALLINT | NOT NULL, ≥ 0 | REA 12.4 |
| `sigpac_zona` | SMALLINT | NOT NULL, ≥ 0 | REA 12.5 |
| `sigpac_poligono` | INTEGER | NOT NULL, ≥ 1 | REA 12.6 |
| `sigpac_parcela` | INTEGER | NOT NULL, ≥ 1 | REA 12.7 |
| `sigpac_recinto` | INTEGER | NOT NULL, ≥ 1 | REA 12.8 |
| `superficie` | NUMERIC(10,4) | NOT NULL, CHECK > 0 (ha) | |
| `uso_sigpac` | TEXT | NOT NULL (código de uso SIGPAC, texto en la 001) | |
| `uso_suelo` | TEXT | NOT NULL, CHECK IN (`forestal`, `pasto`, `cultivo`) | |
| `cultivo_especie` | TEXT | NULL si `uso_suelo <> 'cultivo'` | REA 12.22 (código en 007) |
| `cultivo_variedad` | TEXT | NULL | REA 12.23 (código en 007) |
| `sistema_explotacion` | TEXT | NOT NULL, CHECK IN (`secano`, `regadio`) | REA 12.27 |
| `sistema_riego` | TEXT | CHECK (`sistema_explotacion = 'regadio'`) = (`sistema_riego IS NOT NULL`) | |
| `protegido` | BOOLEAN | NOT NULL (falso = aire libre) | |
| `tipo_proteccion` | TEXT | CHECK `protegido` = (`tipo_proteccion IS NOT NULL`) | |
| `sistema_certificacion` | TEXT | NULL (A.2.f, en su caso) | |
| `marco_control_plagas` | TEXT | NULL (A.2.f, art. 10) | |
| `estado` | TEXT | NOT NULL, CHECK IN (`activa`, `baja`) | |
| `fecha_baja` | DATE | CHECK (`estado = 'baja'`) = (`fecha_baja IS NOT NULL`) | |

Índice único parcial: (`explotacion_id`, referencia SIGPAC completa) `WHERE estado = 'activa'`, para evitar dar
de alta dos veces el mismo recinto.

**Pendiente (R6)**: la precisión de la superficie de recinto en SIGPAC (4 decimales) se confirmará con el
anexo VII. La superficie tratada usa 2 decimales, como pide el SIEX.

### `persona` (REQ-15; A.1.c, A.1.h y B.d)

| Columna | Tipo | Restricciones |
| --- | --- | --- |
| `id` | UUID | PK |
| `explotacion_id` | UUID | FK, NOT NULL |
| `nombre` | TEXT | NOT NULL, 1–150 car. |
| `tipo` | TEXT | NOT NULL, CHECK IN (`aplicador`, `asesor`) |
| `numero_carne` | TEXT | NOT NULL, 1–30 car. (carné de usuario profesional o de asesor) |
| `estado` | TEXT | NOT NULL, CHECK IN (`activa`, `baja`) |
| `fecha_baja` | DATE | como en `parcela` |

Sin NIF ni otros datos personales (REQ-15, principio VI). Ver la diferencia con el SIEX en R6.

### `equipo` (REQ-15; A.1 y B.h)

| Columna | Tipo | Restricciones | SIEX |
| --- | --- | --- | --- |
| `id` | UUID | PK | |
| `explotacion_id` | UUID | FK, NOT NULL | |
| `descripcion` | TEXT | NOT NULL, 1–150 car. | |
| `fecha_adquisicion_o_inspeccion` | DATE | NOT NULL, ≤ hoy | |
| `numero_roma` | TEXT | NULL (número ROMA o referencia censal, "si procede") | CUE 8.35 |
| `estado`, `fecha_baja` | | como en `parcela` | |

### `producto` (REQ-16; B.g)

| Columna | Tipo | Restricciones | SIEX |
| --- | --- | --- | --- |
| `id` | UUID | PK (generado por el cliente) | |
| `explotacion_id` | UUID | FK, NOT NULL | |
| `nombre_comercial` | TEXT | NOT NULL, 1–150 car. | CUE 8.22 |
| `numero_registro` | TEXT | NOT NULL, 1–30 car. | CUE 8.24 |
| `estado`, `fecha_baja` | | como en `parcela` | |

Sin restricción de unicidad del número de registro: dos dispositivos sin conexión pueden dar de alta el mismo
producto, y una restricción haría fallar la sincronización. La PWA avisa si ya existe uno con el mismo número
de registro y propone reutilizarlo.

## Tratamientos (REQ-01 a REQ-13)

### `tratamiento`

| Columna | Tipo | Restricciones | Origen | SIEX |
| --- | --- | --- | --- | --- |
| `id` | UUID | PK (cliente) | R4 | |
| `explotacion_id` | UUID | FK, NOT NULL | | |
| `fecha` | DATE | NOT NULL | REQ-01 a | CUE 8.1 y 8.2 (inicio = fin) |
| `problema` | TEXT | NOT NULL, 1–200 car. | REQ-01 c | CUE 8.11–8.14 (catálogo en 007) |
| `aplicador_id` | UUID | FK → `persona`, NOT NULL | REQ-01 d | CUE 8.28–8.33 |
| `asesor_id` | UUID | FK → `persona`, NULL | REQ-01 d | CUE 8.45–8.50 |
| `equipo_id` | UUID | FK → `equipo`, NOT NULL | REQ-01 h | CUE 8.35 |
| `eficacia` | TEXT | NULL, CHECK IN (`buena`, `regular`, `mala`) | REQ-01 j | CUE 8.54 |
| `observaciones` | TEXT | NULL, ≤ 2000 car. | REQ-01 k | CUE 8.55 |
| `registrado_en` | TIMESTAMPTZ | NOT NULL; ≥ `fecha` y ≤ `now()` | REQ-09, R14 | |
| `fecha_vencimiento` | DATE | GENERATED `(fecha + interval '1 month')::date` | REQ-07, R14 | |
| `anotado_fuera_plazo` | BOOLEAN | NOT NULL; `registrado_en::date > fecha_vencimiento` | REQ-09 | |
| `completado_en` | TIMESTAMPTZ | CHECK (`eficacia IS NULL`) = (`completado_en IS NULL`) | REQ-07 | |
| `completado_fuera_plazo` | BOOLEAN | NOT NULL; `completado_en::date > fecha_vencimiento` | REQ-07 | |
| `anulado` | BOOLEAN | NOT NULL, por defecto falso | REQ-12 | |
| `version` | INTEGER | NOT NULL, ≥ 1 | R5 | |
| `en_conflicto` | BOOLEAN | NOT NULL, por defecto falso | R5 | |
| `recibido_en` | TIMESTAMPTZ | NOT NULL (llegada al servidor) | | |

Restricciones fuera de la tabla, aplicadas por la API en la misma transacción y probadas:

- `fecha ≤ hoy` (REQ-04). Al menos una fila en `tratamiento_parcela` y otra en `tratamiento_producto` (REQ-02).
- `aplicador_id` apunta a una persona de `tipo = 'aplicador'` y `asesor_id` a una de `tipo = 'asesor'`, de la
  misma explotación y **activas al registrar** (REQ-17).
- **REQ-13**: un disparador `BEFORE DELETE` en `tratamiento` rechaza el borrado si
  `fecha > current_date - interval '3 years'`. `tratamiento_parcela`, `tratamiento_producto` y `cambio` están
  protegidos por sus claves foráneas `RESTRICT`.

**Pendiente**: si PostgreSQL no admite la expresión de `fecha_vencimiento` como columna generada (debe ser
inmutable), se calcula en la inserción con la misma expresión. La prueba de los casos compartidos lo detecta.

#### Estado derivado (no se guarda, para que no haya incoherencias)

```text
anulado = true                → "anulado"
eficacia IS NULL              → "pendiente de completar"   (+ "vencido" si hoy > fecha_vencimiento)
eficacia IS NOT NULL          → "completo"
Marcas independientes:          "anotado fuera de plazo", "completado fuera de plazo", "en conflicto"
```

Transiciones:

```text
            registrar sin eficacia                 añadir eficacia (≤ vencimiento)
 (nuevo) ───────────────────────► pendiente ───────────────────────────────► completo
    │                                │  añadir eficacia (> vencimiento)          ▲
    │ registrar con eficacia         └──────────────────────────────────────────┘ + completado_fuera_plazo
    └──────────────────────────────────────────────────────────────────────────► completo
 pendiente | completo ── anular (motivo) ──► anulado   (definitivo; sigue visible en el historial)
 cualquiera ── cambio con versión antigua ──► en_conflicto ── resolver ──► sin conflicto
```

Corregir un tratamiento anulado no está permitido (`409`). Una corrección que cambia la `fecha` recalcula
`fecha_vencimiento` y las marcas de plazo; el historial guarda los valores anteriores.

### `tratamiento_parcela` (REQ-03, REQ-05; B.b, B.e y B.f)

| Columna | Tipo | Restricciones | SIEX |
| --- | --- | --- | --- |
| `tratamiento_id` | UUID | FK, PK compuesta | |
| `parcela_id` | UUID | FK, PK compuesta | |
| `superficie_tratada` | NUMERIC(10,2) | NOT NULL, CHECK > 0; ≤ `parcela.superficie` (API) | CUE 8.5 |
| `cultivo_especie` | TEXT | NOT NULL (copia al registrar, REQ-05) | CUE 8.6 |
| `cultivo_variedad` | TEXT | NOT NULL (copia al registrar) | |
| `producto_semilla` | TEXT | NULL (herbáceos con semilla tratada) | CUE 1.4 |

### `tratamiento_producto` (REQ-03; B.g y B.i)

| Columna | Tipo | Restricciones | SIEX |
| --- | --- | --- | --- |
| `tratamiento_id` | UUID | FK, PK compuesta | |
| `producto_id` | UUID | FK, PK compuesta | |
| `cantidad` | NUMERIC(12,3) | NOT NULL, CHECK > 0 | CUE 8.25 |
| `unidad_medida` | TEXT | NOT NULL, CHECK IN (`kg`, `L`) | CUE 8.27 |

### `cambio` (historial; REQ-11, REQ-12, R4, R5)

| Columna | Tipo | Restricciones |
| --- | --- | --- |
| `id` | UUID | PK = `idOperacion` del cliente (idempotencia, R4) |
| `tratamiento_id` | UUID | FK, NOT NULL |
| `tipo` | TEXT | CHECK IN (`creacion`, `correccion`, `anulacion`, `conflicto`, `resolucion_conflicto`) |
| `version_base` | INTEGER | NOT NULL (versión sobre la que se hizo el cambio) |
| `version_resultante` | INTEGER | NULL en `conflicto` (no se aplica) |
| `datos_anteriores` | JSONB | NULL en `creacion`; instantánea completa del tratamiento con parcelas y productos |
| `datos_nuevos` | JSONB | NOT NULL; instantánea completa |
| `motivo` | TEXT | NOT NULL en `correccion`, `anulacion` y `resolucion_conflicto`, salvo que el cambio solo añada la eficacia |
| `realizado_en` | TIMESTAMPTZ | NOT NULL (momento en el dispositivo) |
| `recibido_en` | TIMESTAMPTZ | NOT NULL |

La vista "qué se cambió" (dato, valor anterior y nuevo) se calcula comparando `datos_anteriores` y
`datos_nuevos`. Guardar instantáneas completas evita perder información en los cambios de varias filas
(parcelas y productos de una mezcla).

### `aviso_correo` (REQ-08, R10)

| Columna | Tipo | Restricciones |
| --- | --- | --- |
| `tratamiento_id` | UUID | FK, PK compuesta |
| `tipo` | TEXT | PK compuesta, CHECK IN (`proximo`, `vencido`) |
| `enviado_en` | TIMESTAMPTZ | NOT NULL |

La clave primaria garantiza un solo correo de cada tipo por tratamiento.

## Almacenamiento local de la PWA (IndexedDB con Dexie, R3)

| Almacén | Clave | Índices | Contenido |
| --- | --- | --- | --- |
| `parcelas`, `personas`, `equipos`, `productos` | `id` | `estado` | Copia de los datos maestros |
| `tratamientos` | `id` | `fecha`, `estadoSincronizacion`, `*parcelaIds`, `*productoIds` | Tratamientos con la misma forma que la API, más `estadoSincronizacion` |
| `cola` | `++orden` | `idOperacion` (único), `entidadId` | Operaciones pendientes en orden FIFO |
| `meta` | `clave` | | Última sincronización, explotación de la sesión |

Al iniciar sesión y tras vaciar la cola, la PWA descarga los datos maestros y los tratamientos (paginados) y
sustituye las copias locales, excepto los tratamientos con operaciones pendientes en la cola.

## Correspondencia con los requisitos

| Requisito | Dónde se garantiza |
| --- | --- |
| REQ-01, REQ-02 | Columnas NOT NULL de `tratamiento`, `tratamiento_parcela` y `tratamiento_producto`; validación en la API y la PWA |
| REQ-03 | Tablas intermedias `tratamiento_parcela` y `tratamiento_producto` |
| REQ-04 | CHECK > 0; superficie ≤ parcela y fecha ≤ hoy en la API y la PWA (casos compartidos) |
| REQ-05 | Copia del cultivo en `tratamiento_parcela` |
| REQ-06 | Almacenes `tratamientos` y `cola`; UUID del cliente; `cambio.id` idempotente |
| REQ-07, REQ-09 | `fecha_vencimiento`, `registrado_en`, `completado_en` y las marcas |
| REQ-08 | `aviso_correo`; aviso en la app calculado en el cliente con `fecha_vencimiento` |
| REQ-10 | Índices (`explotacion_id`, `fecha`), (`parcela_id`) y (`producto_id`) |
| REQ-11, REQ-12 | `cambio` con instantáneas y motivo; `anulado` |
| REQ-13 | Disparador `BEFORE DELETE`; claves foráneas `RESTRICT` |
| REQ-14 a REQ-17 | Tablas maestras con `estado` y `fecha_baja`; validación de "activa al registrar" |
| REQ-20, REQ-21 | `usuario`, `sesion` y `token_restablecimiento` |

## Referencias

Fondo Español de Garantía Agraria [FEGA]. (2025a). *Anexo V. Definición de variables 3.11* (corrección de
errores de publicación, 20 de noviembre de 2025) [Hoja de cálculo]. Documentación técnica agrícola SIEX.
https://www.fega.gob.es/es/siex/documentacion-tecnica-agricola-siex/anexo-v-definicion-de-variables-311
