---
description: "Tareas de implementación de la funcionalidad 001: registro de tratamientos fitosanitarios"
---

# Tareas: Registro de tratamientos fitosanitarios

**Entrada**: `specs/001-registro-tratamientos/`: [spec.md](spec.md) (aprobada, con REQ-22), [plan.md](plan.md)
(aprobado el 2026-10-27), [research.md](research.md) (R1–R14), [data-model.md](data-model.md),
[contracts/openapi.yaml](contracts/openapi.yaml), [quickstart.md](quickstart.md) y constitución v1.1.0.

**Pruebas**: obligatorias (principio III, NO NEGOCIABLE). Para cada REQ, la tarea que escribe sus pruebas a
partir de los criterios Dado/Cuando/Entonces va **antes** de la que lo implementa; la prueba **falla primero** y
pasa después. Cada prueba cita su `REQ-xx` en el nombre o en el docstring.

**Commits**: uno por tarea, en español, empezando por el identificador: `T-07: ...` (CLAUDE.md).

## Hitos de seguimiento

El alumno sigue la implementación por **hitos**, no tarea a tarea (decisión del 2026-10-27). Cada hito es una
fase de este fichero y termina en su punto de control. El agente implementa las tareas de **un hito** (un commit
por tarea, pruebas primero, marcando `[X]` en este fichero), se **detiene en el punto de control** y presenta un
resumen: tareas hechas, pruebas, estado del CI y cualquier desviación. El alumno comprueba el criterio del hito y
lo aprueba antes de empezar el siguiente. El estado de los hitos se marca en la descripción de la PR #1.

| Hito | Fase | Tareas | Criterio de revisión del alumno |
| --- | --- | --- | --- |
| H1 Esqueleto | 1 | T-01 a T-06 | `docker compose up` arranca `db`, `mailpit`, `api` y `web` (el `worker` llega en T-51) y el CI está en verde en la PR #1 |
| H2 Cuentas | 2 | T-07 a T-19 | Crear cuenta, entrar, salir, recuperar la contraseña y comprobar el límite de intentos |
| H3 Datos de la explotación | 3 (US4) | T-20 a T-29 | Dar de alta, modificar y dar de baja parcela, aplicador, equipo y producto |
| H4 Registrar (MVP) | 4 (US1) | T-30 a T-42 | Registrar con y sin conexión y ver el tratamiento en el cuaderno |
| H5 Plazos y avisos | 5 (US2) | T-43 a T-52 | Tratamiento pendiente, aviso en la app, correo único en Mailpit, completar la eficacia |
| H6 Consulta e historial | 6 (US3) | T-53 a T-62 | Filtrar, corregir, anular, ver el historial y resolver un conflicto |
| H7 Cierre | 7 | T-63 a T-71 (T-70 la última) | E2E y k6 en verde, quickstart en el Android de la demo, sesión con agricultores (SC-001, SC-005, SC-007) y `/speckit-converge` sin pendientes |

## Formato: `- [ ] T-xx [P?] [Historia?] Descripción (trazabilidad)`

- **[P]**: se puede hacer en paralelo (ficheros distintos y sin dependencias de tareas incompletas).
- **[US1]…[US4]**: historia de usuario de la spec (US1 = historia 1, registrar; US2 = historia 2, plazo y
  eficacia; US3 = historia 3, consultar, corregir y conservar; US4 = historia 4, datos de la explotación).
- **Trazabilidad** al final de cada tarea: los `REQ-xx` que cubre o, en infraestructura, el principio o la
  decisión del plan (R1–R14) que la motiva.

## Orden de las fases

Setup → Base común (cuentas y sesión) → **US4** (P1) → **US1** (P1) → **US2** (P2) → **US3** (P2) → Cierre.
US4 va antes que US1, aunque las dos son P1, porque sin parcelas, aplicadores y equipos no se puede registrar un
tratamiento (spec, historia 4: "sin parcelas, aplicadores y equipos no se puede registrar un tratamiento").

---

## Fase 1 (H1): Setup (esqueleto del proyecto)

**Objetivo**: repositorio con la estructura del plan, entorno de Compose arrancable y pipeline mínimo en la PR en
borrador #1.

- [X] T-01 Crear el esqueleto del repositorio según el plan: carpetas `backend/`, `frontend/`, `compartido/`,
  `e2e/`, `rendimiento/` y `despliegue/`; `backend/pyproject.toml` con `uv` y `backend/uv.lock` (FastAPI,
  Pydantic, SQLModel, Alembic, psycopg 3, `pwdlib[argon2]`, pytest); `frontend/package.json` y
  `frontend/package-lock.json` con Node.js 24 (React, Vite, vite-plugin-pwa, Dexie, openapi-typescript, Vitest),
  todas las versiones **exactas** y fijadas por los ficheros de bloqueo; `backend/Dockerfile` (imagen común de
  `api` y `worker`); `compose.yaml` **solo con los servicios `db`** (`pgvector/pgvector:0.8.7-pg18-trixie`,
  volumen persistente) **y `mailpit`** (`axllent/mailpit`, SMTP 1025 e interfaz 8025): `web` se añade en T-04,
  `api` en T-05 y `worker` en T-51, cuando existe su código; `.env.example` con las variables documentadas de
  estos servicios y de la API (base de datos, `URL_PUBLICA`, `SMTP_HOST`, `SMTP_PORT`, `CORREO_REMITENTE`) y sin
  secretos; una prueba mínima en cada lado para que el CI no falle por no encontrar pruebas (pytest devuelve el
  código 5 sin pruebas y Vitest falla sin ficheros de prueba): `backend/tests/test_humo.py` comprueba que el
  paquete `cuaderno` se importa y `frontend/tests/humo.test.ts` que el módulo de entrada se carga; y
  `.github/workflows/ci.yml` mínimo (instalar dependencias desde los ficheros de bloqueo y ejecutar pytest y
  Vitest) en `pull_request` y `push`. **Pendiente R1**: comprobar que todas las
  dependencias de Python instalan y arrancan con Python 3.14; si alguna no publica ruedas, fijar Python 3.13 en
  `pyproject.toml`, `Dockerfile` y CI y anotarlo en research R1. Criterio de hecho: `docker compose up` levanta
  `db` y `mailpit` y el pipeline se ejecuta en verde en la PR en borrador #1. (R1, R2, R10, R13; principio VI:
  secretos en `.env`)
- [X] T-02 [P] Configurar la calidad del backend en `backend/pyproject.toml` y `.github/workflows/ci.yml`:
  `ruff` (formato y lint, **con las reglas `S` de seguridad**), `mypy` en modo estricto sobre `src/cuaderno`,
  y `pip-audit` sobre `uv.lock`, de modo que una vulnerabilidad alta o crítica haga fallar el pipeline.
  **Pendiente R13**: verificar la configuración de las tres herramientas con su documentación oficial y citarla
  en research R13. (R13; principio VI)
- [X] T-03 [P] Configurar la calidad del frontend en `frontend/package.json`, `frontend/eslint.config.js`,
  `frontend/tsconfig.json` y `.github/workflows/ci.yml`: ESLint, `tsc --noEmit` en modo estricto, Vitest y
  `npm audit --audit-level=high` (falla con vulnerabilidades altas o críticas). **Pendiente R13**: verificar la
  configuración de `npm audit` con su documentación oficial. (R13; principio VI)
- [ ] T-04 Configurar el servicio `web` en `despliegue/Caddyfile` y `frontend/Dockerfile` (construcción de la PWA
  con Vite y Caddy como imagen final): servir la PWA estática, hacer de proxy inverso de `/api/*` hacia `api` (mismo
  origen) y dar HTTPS con `tls internal` para `localhost`; añadir el servicio `web` a `compose.yaml`. Documentar
  en `quickstart.md` cómo confiar en la autoridad local en el portátil. (R11)
- [ ] T-05 Crear la aplicación FastAPI base en `backend/src/cuaderno/main.py`, `config.py` (lectura de las
  variables de `.env.example`, zona `Europe/Madrid`) y `db.py` (motor y sesión de SQLModel con psycopg 3), con el
  prefijo `/api` y la documentación interactiva en `/api/docs`; e inicializar Alembic en `backend/alembic/`
  apuntando a los modelos de `backend/src/cuaderno/modelos/`; añadir el servicio `api` a `compose.yaml` con la
  imagen de `backend/Dockerfile`. Criterio: `docker compose up` arranca `db`, `mailpit`, `api` y `web` (H1).
  (R2, R7)
- [ ] T-06 Preparar la infraestructura de pruebas del backend en `backend/tests/conftest.py`: base de datos
  PostgreSQL de pruebas aparte (migrada con `alembic upgrade head` y limpiada entre pruebas), cliente HTTP de
  FastAPI, reloj inyectable para fijar "hoy" en `Europe/Madrid` y un cliente de la API REST de Mailpit para leer
  y vaciar los correos recibidos. Añadir al CI los servicios `db` y `mailpit` para las pruebas de integración.
  (R10, R13; principio III)

**Punto de control**: el entorno arranca, el pipeline está en verde en la PR #1 y hay base para escribir pruebas.

---

## Fase 2 (H2): Base común (cuentas, sesión y piezas compartidas)

**Objetivo**: acceso seguro al cuaderno (REQ-20 a REQ-22) y piezas que usan todas las historias: casos de
validación compartidos, prueba de contrato, cliente de API tipado y almacenamiento local de la PWA.

**⚠️ Ninguna historia empieza antes de terminar esta fase.**

- [ ] T-07 [P] Crear el fichero de casos compartidos `compartido/casos-validacion.json` (formato: regla,
  entrada, resultado esperado, `req`) y los dos ejecutores que lo recorren:
  `backend/tests/unit/test_casos_compartidos.py` (pytest) y `frontend/tests/casos-compartidos.test.ts`
  (Vitest). Cada caso se ejecuta como una prueba con su `REQ-xx` en el nombre. (R8; principio III)
- [ ] T-08 [P] Crear la utilidad de prueba de contrato en `backend/tests/contract/contrato.py`: carga
  `specs/001-registro-tratamientos/contracts/openapi.yaml` y comprueba, para una lista de operaciones dada,
  que la ruta, el método y los códigos de estado documentados existen en el OpenAPI generado por FastAPI.
  Cada historia la usa en su prueba de contrato. (R7; principio I)
- [ ] T-09 Escribir las pruebas de REQ-20 (deben fallar) en `backend/tests/integration/test_cuenta_sesion.py` y
  `backend/tests/contract/test_contrato_cuenta.py`: crear cuenta (201, crea la explotación e inicia sesión);
  correo repetido → 409; contraseña de menos de 15 o más de 128 caracteres → 422, sin reglas de composición;
  el hash es Argon2id y la contraseña en claro no se guarda; inicio de sesión correcto → 204 con cookie
  `__Host-sesion` con `Secure`, `HttpOnly`, `SameSite=Strict` y `Path=/`, y token nuevo en cada inicio; fallo →
  401 con "Correo o contraseña incorrectos"; en la base solo está el hash SHA-256 del token; la sesión caduca a
  los 30 días sin uso y a los 90 absolutos; cerrar sesión la invalida en el servidor; `GET /cuenta/yo` sin
  sesión → 401; un usuario no ve los datos de otra explotación (404); la base rechaza un correo repetido con
  otras mayúsculas. Contrato: `POST /cuenta`,
  `GET /cuenta/yo`, `POST /sesion`, `DELETE /sesion`. (REQ-20)
- [ ] T-10 Implementar REQ-20. Migración y modelos en `backend/alembic/versions/` y
  `backend/src/cuaderno/modelos/cuentas.py`: `usuario` (`id` UUID PK; `correo` TEXT NOT NULL, UNIQUE sobre
  `lower(correo)`; `hash_contrasena` TEXT NOT NULL; `creado_en` TIMESTAMPTZ NOT NULL), `explotacion` (`id` UUID
  PK; `usuario_id` FK NOT NULL, UNIQUE; `creada_en` TIMESTAMPTZ NOT NULL) y `sesion` (`hash_token` BYTEA PK;
  `usuario_id` FK NOT NULL; `creada_en`, `ultimo_uso` y `expira_en` TIMESTAMPTZ NOT NULL; `revocada_en`
  TIMESTAMPTZ NULL), con claves foráneas `ON DELETE RESTRICT`. Servicios y API en
  `backend/src/cuaderno/servicios/cuentas.py`, `servicios/sesiones.py`, `esquemas/cuenta.py` y `api/cuenta.py`:
  hash con `pwdlib` (`PasswordHash.recommended()`, Argon2id con al
  menos 19 MiB, 2 iteraciones y paralelismo 1); token opaco de 256 bits con generador criptográfico, guardado
  como SHA-256; cookie y caducidades de R9; dependencia de FastAPI que exige sesión válida, actualiza
  `ultimo_uso` y devuelve la explotación del usuario, que filtra todas las consultas; la API solo acepta
  `application/json`. Pasan las pruebas de T-09. (REQ-20)
- [ ] T-11 Escribir las pruebas de REQ-21 (deben fallar) en `backend/tests/integration/test_recuperacion.py` y
  ampliar `test_contrato_cuenta.py`: `POST /cuenta/recuperacion` responde 202 con el mismo mensaje exista o no la
  cuenta; Mailpit recibe un único correo con un enlace construido con `URL_PUBLICA` (nunca con la cabecera
  `Host`); el token caduca a la hora y solo vale una vez (400 en el segundo uso); más de 3 solicitudes por cuenta
  y hora no envían más correos; al confirmar se cambia la contraseña, se revocan todas las sesiones y los demás
  tokens, no se inicia sesión y se borra la fila de `intento_acceso`; la página de restablecimiento envía
  `Referrer-Policy: no-referrer`; el correo es el único dato personal de la cuenta. Contrato:
  `POST /cuenta/recuperacion` y `POST /cuenta/recuperacion/confirmar`. (REQ-21)
- [ ] T-12 Implementar REQ-21. Migración y modelo `token_restablecimiento` en
  `backend/src/cuaderno/modelos/cuentas.py` (`hash_token` BYTEA PK; `usuario_id` FK NOT NULL; `creado_en` y
  `expira_en` TIMESTAMPTZ NOT NULL; `usado_en` TIMESTAMPTZ NULL, un solo uso). Servicios en
  `backend/src/cuaderno/servicios/correo.py` (envío SMTP con `smtplib` según
  `SMTP_HOST`, `SMTP_PORT` y `CORREO_REMITENTE`) y en `servicios/cuentas.py` y `api/cuenta.py` (token aleatorio
  guardado como hash, caducidad de 1 hora, límite de 3 por hora, envío en `BackgroundTasks` para responder igual
  exista o no la cuenta). Pasan las pruebas de T-11. (REQ-21)
- [ ] T-13 Escribir las pruebas de REQ-22 (deben fallar) en `backend/tests/integration/test_limite_intentos.py`
  y ampliar `test_contrato_cuenta.py` (429 en `POST /sesion`), siguiendo los criterios de la spec: 5 fallos
  consecutivos en 15 minutos → el sexto intento, aunque la contraseña sea correcta, recibe 429 con `Retry-After`
  y el mensaje "Has fallado la contraseña 5 veces. Espera 15 minutos o recupera tu contraseña."; pasados los
  15 minutos se entra y el contador vuelve a cero; un fallo con el primero de hace más de 15 minutos reinicia la
  ventana; un restablecimiento permite entrar enseguida; un correo sin cuenta recibe exactamente la misma
  respuesta; durante la espera no se verifica la contraseña (no se llama a Argon2); dos peticiones simultáneas
  no se saltan el límite. (REQ-22)
- [ ] T-14 Implementar REQ-22. Migración y modelo `intento_acceso` en `backend/src/cuaderno/modelos/cuentas.py`
  (`correo_normalizado` TEXT PK, sin FK; `fallos_consecutivos` SMALLINT NOT NULL, CHECK ≥ 0; `primer_fallo_en`
  y `bloqueado_hasta` TIMESTAMPTZ NULL; sin contraseñas ni IP). Lógica en
  `backend/src/cuaderno/servicios/sesiones.py` y `api/cuenta.py`: contador por
  `lower(trim(correo))` en `intento_acceso`, leído con `SELECT … FOR UPDATE` antes de verificar la contraseña;
  ventana de 15 minutos; al 5.º fallo `bloqueado_hasta = now() + 15 min`; 429 con `Retry-After` y cuerpo
  `EsperaAcceso`; un acceso correcto o un restablecimiento borran la fila. Pasan las pruebas de T-13. (REQ-22)
- [ ] T-15 Exportar el OpenAPI generado a `frontend/src/api/openapi.json` con un script
  (`backend/scripts/exportar_openapi.py`), generar los tipos con openapi-typescript en
  `frontend/src/api/tipos.ts`, crear el cliente en `frontend/src/api/cliente.ts` (mismo origen, JSON) y añadir
  al CI el paso que regenera ambos ficheros y **falla si difieren de los versionados**. (R7, R8)
- [ ] T-16 [P] Crear el esquema local de la PWA en `frontend/src/db/esquema.ts` con Dexie, con los almacenes de
  data-model: `parcelas`, `personas`, `equipos` y `productos` (clave `id`, índice `estado`); `tratamientos`
  (clave `id`; índices `fecha`, `estadoSincronizacion`, `*parcelaIds`, `*productoIds`); `cola` (clave
  `++orden`; índice único `idOperacion`; índice `entidadId`) y `meta` (clave `clave`). Prueba en
  `frontend/tests/db/esquema.test.ts`. Base de REQ-06, que se prueba en T-24, T-37 y T-39. (R3)
- [ ] T-17 Añadir a `compartido/casos-validacion.json` los casos de la contraseña (15 a 128 caracteres,
  cualquier carácter, incluidos espacios y Unicode, sin reglas de composición) y del correo; deben fallar en
  pytest y Vitest. Después implementarlos en `backend/src/cuaderno/dominio/validacion.py` y
  `frontend/src/dominio/validacion.ts`. (REQ-20; R8)
- [ ] T-18 Crear la carcasa de la PWA en `frontend/vite.config.ts` y `frontend/src/main.tsx`: manifiesto,
  service worker con `vite-plugin-pwa` (estrategia `generateSW`, solo precaché de la carcasa, **sin Background
  Sync**) y navegación entre las páginas del plan. Prueba en `frontend/tests/pwa.test.ts`: la configuración no
  registra Background Sync. (R3, R11; principio V)
- [ ] T-19 Implementar las páginas de cuenta en `frontend/src/paginas/cuenta/`: crear cuenta (sugiere usar una
  frase), iniciar sesión, cerrar sesión (borra IndexedDB solo si la cola está vacía; si no, avisa de que hay
  registros sin enviar), "He olvidado mi contraseña", restablecer contraseña y el mensaje de espera en lenguaje
  llano cuando la API responde 429, con los minutos que faltan. Pruebas de componentes en
  `frontend/tests/paginas/cuenta.test.tsx`, escritas antes. (REQ-20, REQ-21, REQ-22)

**Punto de control**: un agricultor crea su cuenta, entra, sale y recupera la contraseña; el límite de intentos
funciona; el CI comprueba el contrato y que los tipos están al día.

---

## Fase 3 (H3): Historia 4 — Mantener los datos de la explotación (P1)

**Objetivo**: dar de alta, modificar y dar de baja parcelas, personas, equipos y productos, y tenerlos
disponibles en el móvil.

**Prueba independiente**: dar de alta una parcela con su referencia SIGPAC, un aplicador y un equipo, y
comprobar que aparecen en las listas (spec, historia 4).

- [ ] T-20 [US4] Escribir las pruebas de REQ-14 (deben fallar) en `backend/tests/integration/test_parcelas.py`
  y `backend/tests/contract/test_contrato_parcelas.py`: alta con todos los datos de A.2 (escenario 1: *Vitis
  vinifera*, Airén, leñoso, 4,2 ha) → 201 y aparece en `GET /parcelas` con su `numeroOrden`; **número de orden**
  (A.2.a): la primera parcela de la explotación recibe 1 y las siguientes 2, 3…; cada explotación tiene su
  propia serie; dar de baja la 2 y dar de alta otra → recibe 4 (no se reutiliza); dos altas simultáneas reciben
  números distintos; el cliente no puede fijarlo ni cambiarlo con `PUT`; `nombre` es opcional; modificar con
  `PUT`; rechazos 422 con mensaje llano para superficie ≤ 0, `aprovechamiento` fuera de (`forestal`, `pastos`,
  `cultivo`), **`cultivo_lenoso` activo sin `cultivo_especie` o sin `cultivo_variedad`** (A.2.d),
  `cultivo_lenoso` activo con un aprovechamiento distinto de `cultivo`, `sistema_explotacion`
  fuera de (`secano`, `regadio`), regadío sin `sistema_riego` o secano con él, `protegido` sin
  `tipo_proteccion` o al revés, y componentes SIGPAC fuera de rango (provincia 1–99; municipio, polígono,
  parcela y recinto ≥ 1; agregado y zona ≥ 0); 409 si ya hay una parcela **activa** con la misma referencia
  SIGPAC completa. Contrato: `GET` y `POST /parcelas`, `PUT /parcelas/{id}`. (REQ-14)
- [ ] T-21 [US4] Implementar REQ-14: migración y modelo `parcela` en `backend/alembic/versions/` y
  `backend/src/cuaderno/modelos/parcela.py` con las columnas y restricciones de data-model (`numero_orden`
  INTEGER NOT NULL, CHECK ≥ 1, UNIQUE (`explotacion_id`, `numero_orden`), asignado con
  `explotacion.ultimo_numero_parcela` (INTEGER NOT NULL, por defecto 0) en la misma transacción del alta;
  `nombre` TEXT NULL, 1–100 car.; `sigpac_provincia` SMALLINT NOT NULL, 1–99; `sigpac_municipio` SMALLINT NOT NULL, ≥ 1;
  `sigpac_agregado` y `sigpac_zona` SMALLINT NOT NULL, ≥ 0; `sigpac_poligono`, `sigpac_parcela` y
  `sigpac_recinto` INTEGER NOT NULL, ≥ 1; `superficie` NUMERIC(10,4) NOT NULL, CHECK > 0; `uso_sigpac` TEXT NOT
  NULL; `aprovechamiento` CHECK IN (`forestal`, `pastos`, `cultivo`); `cultivo_lenoso` BOOLEAN NOT NULL, por
  defecto falso, CHECK `NOT cultivo_lenoso OR aprovechamiento = 'cultivo'`; `cultivo_especie` y
  `cultivo_variedad` TEXT NULL, cada una con CHECK `NOT cultivo_lenoso OR <columna> IS NOT NULL`; `sistema_explotacion` CHECK IN (`secano`, `regadio`); CHECK (`sistema_explotacion = 'regadio'`) =
  (`sistema_riego IS NOT NULL`); `protegido` BOOLEAN NOT NULL; CHECK `protegido` = (`tipo_proteccion IS NOT
  NULL`); `sistema_certificacion` y `marco_control_plagas` TEXT NULL; `estado` CHECK IN (`activa`, `baja`);
  CHECK (`estado = 'baja'`) = (`fecha_baja IS NOT NULL`); índice único parcial por explotación y referencia
  SIGPAC `WHERE estado = 'activa'`), más `esquemas/parcela.py` y `api/parcelas.py`. Pasan las pruebas de T-20.
  (REQ-14)
- [ ] T-22 [P] [US4] Escribir las pruebas de REQ-15 (deben fallar) en
  `backend/tests/integration/test_personas_equipos.py` y `backend/tests/contract/test_contrato_personas_equipos.py`:
  alta, listado y modificación de personas (`nombre` 1–150 car.; `tipo` IN (`aplicador`, `asesor`);
  `numero_carne` 1–30 car.) y de equipos (`descripcion` 1–150 car.; `fecha_adquisicion_o_inspeccion` NOT NULL y
  ≤ hoy; `numero_roma` opcional de hasta 30 car., "si procede"); el esquema de persona no tiene NIF ni otros
  datos personales; un equipo con número ROMA lo devuelve (escenario 3). Contrato: `GET`/`POST /personas`,
  `PUT /personas/{id}`, `GET`/`POST /equipos`, `PUT /equipos/{id}`. (REQ-15)
- [ ] T-23 [US4] Implementar REQ-15: migraciones y modelos `persona` y `equipo` en
  `backend/src/cuaderno/modelos/persona.py` y `modelos/equipo.py` con las restricciones de data-model (las de
  T-22, más `estado` CHECK IN (`activa`, `baja`) y `fecha_baja` como en `parcela`), y `esquemas/` y
  `api/personas.py` y `api/equipos.py`. Pasan las pruebas de T-22. (REQ-15)
- [ ] T-24 [P] [US4] Escribir las pruebas de REQ-16 (deben fallar) en `backend/tests/integration/test_productos.py`
  y `backend/tests/contract/test_contrato_productos.py`: alta con `id` generado por el cliente,
  `nombre_comercial` (1–150 car.) y `numero_registro` (1–30 car.) → 201; reintento con el mismo `id` y el mismo
  contenido → 200 con el producto; mismo `id` y distinto contenido → 409; se admiten dos productos con el mismo
  número de registro (sin restricción de unicidad); el producto se reutiliza en el listado. Contrato:
  `GET`/`POST /productos`. (REQ-16, REQ-06)
- [ ] T-25 [US4] Implementar REQ-16: migración y modelo `producto` en `backend/src/cuaderno/modelos/producto.py`,
  `esquemas/producto.py` y `api/productos.py`, con creación idempotente por `id` (R4). Pasan las pruebas de
  T-24. (REQ-16, REQ-06)
- [ ] T-26 [US4] Escribir las pruebas de REQ-17 (deben fallar) en `backend/tests/integration/test_bajas.py` y
  ampliar las pruebas de contrato con `POST /parcelas/{id}/baja`, `/personas/{id}/baja`, `/equipos/{id}/baja` y
  `/productos/{id}/baja`: la baja pone `estado = 'baja'` y `fecha_baja`; el elemento deja de salir en los
  listados salvo con `incluir_bajas=true`; nunca se borra la fila. (La parte "no se puede usar en tratamientos
  nuevos" se prueba en T-35.) (REQ-17)
- [ ] T-27 [US4] Implementar REQ-17: los endpoints de baja y el filtro `incluir_bajas` en
  `backend/src/cuaderno/api/parcelas.py`, `personas.py`, `equipos.py` y `productos.py`, sin ningún `DELETE`.
  Pasan las pruebas de T-26. (REQ-17)
- [ ] T-28 [US4] Escribir las pruebas (deben fallar) de la descarga de los datos maestros a Dexie en
  `frontend/tests/sync/maestros.test.ts`: al iniciar sesión y tras vaciar la cola se sustituyen las copias
  locales de `parcelas`, `personas`, `equipos` y `productos` por las activas del servidor. Implementarla después
  en `frontend/src/sync/maestros.ts`. (REQ-14, REQ-15, REQ-16; R3)
- [ ] T-29 [US4] Implementar las páginas de datos de la explotación en `frontend/src/paginas/explotacion/`
  (parcelas, personas, equipos y productos): listar, dar de alta, modificar y dar de baja, con conexión; las
  parcelas se listan y se identifican por su número de orden, con el nombre si lo tienen, y el formulario pide
  aprovechamiento y "cultivo leñoso" (especie y variedad obligatorias si se marca); los
  rechazos de la API se muestran con su mensaje llano junto al campo. Pruebas de componentes en
  `frontend/tests/paginas/explotacion.test.tsx`, escritas antes. (REQ-14, REQ-15, REQ-16, REQ-17)

**Punto de control**: la historia 4 funciona y se puede probar sola (prueba independiente de la spec).

---

## Fase 4 (H4): Historia 1 — Registrar un tratamiento (P1) 🎯 MVP

**Objetivo**: registrar un tratamiento con todos los datos de la sección B del anexo III, desde el móvil y sin
conexión.

**Prueba independiente**: con una parcela, un aplicador y un equipo dados de alta, registrar un tratamiento y
comprobar que aparece en el cuaderno con todos los campos de la sección B (spec, historia 1).

- [ ] T-30 [P] [US1] Añadir a `compartido/casos-validacion.json` los casos de REQ-02 y REQ-04 (deben fallar en
  pytest y Vitest): faltan fecha, parcelas, problema, aplicador, especie o variedad, superficie, producto, equipo
  o cantidad → error con el campo y un mensaje llano; asesor, ROMA, producto de la semilla, eficacia y
  observaciones opcionales; superficie tratada ≤ 0, con más de 2 decimales o mayor que la de la parcela (5 ha en
  una de 4,2 → "La superficie tratada (5 ha) es mayor que la de la parcela (4,2 ha).") → error; cantidad ≤ 0 →
  error; unidad distinta de `kg` o `L` → error; fecha posterior a hoy → error. (REQ-02, REQ-04)
- [ ] T-31 [P] [US1] Implementar las reglas de T-30 en `backend/src/cuaderno/dominio/validacion.py`. Pasan los
  casos en pytest. (REQ-02, REQ-04)
- [ ] T-32 [P] [US1] Implementar las reglas de T-30 en `frontend/src/dominio/validacion.ts`. Pasan los casos en
  Vitest. (REQ-02, REQ-04)
- [ ] T-33 [US1] Escribir las pruebas del esquema de tratamientos (deben fallar) en
  `backend/tests/integration/test_esquema_tratamiento.py`: CHECK `superficie_tratada` > 0 con NUMERIC(10,2);
  `cantidad` > 0; `unidad_medida` IN (`kg`, `L`); `eficacia` NULL o IN (`buena`, `regular`, `mala`);
  `fecha_registro >= fecha`; `version` ≥ 1; claves foráneas `RESTRICT`. (REQ-01, REQ-03, REQ-04)
- [ ] T-34 [US1] Escribir la migración y los modelos de tratamientos en `backend/alembic/versions/` y
  `backend/src/cuaderno/modelos/tratamiento.py`: `tratamiento` (`id` UUID PK del cliente; `explotacion_id` FK
  NOT NULL; `fecha` DATE NOT NULL; `problema` TEXT NOT NULL, 1–200 car.; `aplicador_id` FK → `persona` NOT
  NULL; `asesor_id` FK → `persona` NULL; `equipo_id` FK → `equipo` NOT NULL; `eficacia` TEXT NULL, CHECK IN
  (`buena`, `regular`, `mala`); `observaciones` TEXT NULL, ≤ 2000 car.; `registrado_en` TIMESTAMPTZ NOT NULL;
  `fecha_registro` DATE NOT NULL, CHECK `fecha_registro >= fecha`, **no generada**; `anulado` BOOLEAN NOT NULL
  por defecto falso; `version` INTEGER NOT NULL ≥ 1; `en_conflicto` BOOLEAN NOT NULL por defecto falso;
  `recibido_en` TIMESTAMPTZ NOT NULL), `tratamiento_parcela` (PK compuesta; `superficie_tratada`
  NUMERIC(10,2) NOT NULL, CHECK > 0; `cultivo_especie` y `cultivo_variedad` TEXT NOT NULL; `producto_semilla`
  TEXT NULL), `tratamiento_producto` (PK compuesta; `cantidad` NUMERIC(12,3) NOT NULL, CHECK > 0;
  `unidad_medida` TEXT NOT NULL, CHECK IN (`kg`, `L`)) y `cambio` (`id` UUID PK = `idOperacion`; `tipo` CHECK
  IN (`creacion`, `correccion`, `anulacion`, `conflicto`, `resolucion_conflicto`); `version_base` NOT NULL;
  `version_resultante` NULL; `datos_anteriores` JSONB NULL; `datos_nuevos` JSONB NOT NULL; `motivo` TEXT;
  `realizado_en` y `recibido_en` TIMESTAMPTZ NOT NULL). Las columnas de plazo se añaden en T-47. Pasan las
  pruebas de T-33. (REQ-01, REQ-03, REQ-04)
- [ ] T-35 [US1] Escribir las pruebas de registro (deben fallar) en
  `backend/tests/integration/test_registrar_tratamiento.py` y `backend/tests/contract/test_contrato_tratamientos.py`
  con los escenarios de la historia 1: escenario 1 (viñedo Airén de 4,2 ha, mildiu, 3,5 ha, 2 kg, equipo con
  ROMA) → 201 y `GET /tratamientos/{id}` devuelve todos los datos introducidos, con el `numeroOrden` de cada
  parcela tratada (B.b); escenario 2 (sin producto o sin
  cantidad) → 422 con el dato que falta; escenario 3 (5 ha en una parcela de 4,2) → 422 con la superficie
  máxima; escenario 4 (dos productos en mezcla sobre dos parcelas) → cada producto con su cantidad y cada parcela
  con su superficie; el cultivo se guarda como copia y no cambia si después se modifica el de la parcela; una
  parcela, persona, equipo o producto de baja, un aplicador de tipo `asesor` o datos de otra explotación → 422;
  se guarda un cambio `creacion`; `fecha_registro` es la fecha de `registrado_en` en `Europe/Madrid` y se
  rechaza un `registrado_en` futuro o anterior a la fecha. Contrato: `POST /tratamientos` y
  `GET /tratamientos/{id}`. (REQ-01, REQ-02, REQ-03, REQ-04, REQ-05, REQ-17)
- [ ] T-36 [US1] Implementar el registro en `backend/src/cuaderno/servicios/tratamientos.py`,
  `esquemas/tratamiento.py` y `api/tratamientos.py`: todo en una transacción; validación con
  `dominio/validacion.py` más las comprobaciones contra la base (superficie de la parcela, elementos activos,
  tipo de persona, misma explotación); copia del cultivo en `tratamiento_parcela`; cálculo de `fecha_registro`;
  cambio `creacion` con la instantánea completa. Pasan las pruebas de T-35. (REQ-01, REQ-02, REQ-03, REQ-04,
  REQ-05, REQ-17)
- [ ] T-37 [US1] Escribir las pruebas de idempotencia del registro (deben fallar) en
  `backend/tests/integration/test_idempotencia_registro.py`: reintento con el mismo `id` y el mismo contenido →
  200 y un solo tratamiento; mismo `id` y otro contenido → 409; un producto nuevo y un tratamiento que lo usa,
  enviados en ese orden, se crean bien aunque se reintenten. (REQ-06)
- [ ] T-38 [US1] Implementar la idempotencia por `id` en `backend/src/cuaderno/servicios/tratamientos.py`
  (comparación del contenido con la instantánea de `creacion`). Pasan las pruebas de T-37. (REQ-06; R4)
- [ ] T-39 [US1] Escribir las pruebas de la cola sin conexión (deben fallar) en `frontend/tests/sync/cola.test.ts`:
  al guardar sin red, el tratamiento queda en `tratamientos` como `pendiente` y su operación en `cola` con UUID
  propio; la cola se vacía en orden FIFO, una operación cada vez, al abrir la app, con el evento `online`, al
  encolar si hay red y cada 60 s; un fallo de red detiene el vaciado sin perder nada; un 401 conserva la cola y
  pide iniciar sesión; un reintento de una creación ya aplicada (200) no duplica nada; con 20 tratamientos
  encolados se sincronizan los 20 sin pérdida ni duplicados (SC-003); el contador de pendientes es correcto.
  (REQ-06)
- [ ] T-40 [US1] Implementar la cola en `frontend/src/sync/cola.ts` y `frontend/src/sync/vaciado.ts`
  (operaciones `crear_producto` y `crear_tratamiento`; disparadores de R3; estado `sincronizado`, `pendiente` o
  `conflicto`), la petición de `navigator.storage.persist()` y el contador de operaciones pendientes, siempre
  visible. Pasan las pruebas de T-39. (REQ-06; R3)
- [ ] T-41 [US1] Escribir las pruebas de componentes (deben fallar) del formulario en
  `frontend/tests/paginas/tratamiento.test.tsx` y después implementarlo en
  `frontend/src/paginas/tratamiento/`: fecha, parcelas con superficie tratada, problema, aplicador y asesor,
  productos con cantidad y unidad, equipo, eficacia (buena, regular, mala) y observaciones; elección de
  parcelas (identificadas por su número de orden), personas, equipos y productos activos desde Dexie; propone el cultivo actual de cada parcela, que se
  puede cambiar; producto de la semilla opcional; alta de un producto nuevo (nombre comercial y número de
  registro) sin salir del formulario y sin conexión, con aviso si ya hay uno con el mismo número de registro;
  mensajes llanos de `validacion.ts` antes de guardar; guarda en local y encola. (REQ-01, REQ-02, REQ-03,
  REQ-04, REQ-05, REQ-06, REQ-16)
- [ ] T-42 [US1] Implementar la vista básica del cuaderno en `frontend/src/paginas/cuaderno/` (lista de
  tratamientos locales y sincronizados, ordenados por fecha, con su estado de sincronización y el detalle con
  todos los campos de la sección B; cada parcela tratada se muestra por su número de orden), con pruebas de componentes escritas antes en
  `frontend/tests/paginas/cuaderno.test.tsx`. (REQ-01, REQ-06)

**Punto de control (MVP)**: con la historia 4 hecha, el agricultor registra tratamientos con y sin conexión y
los ve en el cuaderno.

---

## Fase 5 (H5): Historia 2 — Completar la eficacia y respetar el plazo de un mes (P2)

**Objetivo**: estados "pendiente de completar" y "completo", marcas de fuera de plazo y avisos en la app y por
correo.

**Prueba independiente**: guardar un tratamiento sin eficacia y comprobar que aparece como pendiente, que genera
un aviso al acercarse el vencimiento y que deja de estar pendiente al completar la eficacia (spec, historia 2).

- [ ] T-43 [P] [US2] Añadir a `compartido/casos-validacion.json` los casos del plazo (deben fallar): vencimiento
  "de fecha a fecha" (15 mar → 15 abr; 30 mar → 30 abr; 31 mar → 30 abr; 31 ene → 28 feb; 31 ene de año bisiesto
  → 29 feb); `anotado_fuera_plazo` cuando `fecha_registro` > vencimiento (y no cuando es igual);
  `completado_fuera_plazo` igual con `fecha_completado`; fecha local en `Europe/Madrid` de un `TIMESTAMPTZ`
  cercano a medianoche; estado derivado (`anulado`, `pendiente`, `completo`) y `vencido`; avisos a 7 días o
  menos y vencidos, con los días restantes. (REQ-07, REQ-08, REQ-09)
- [ ] T-44 [P] [US2] Implementar las reglas de T-43 en `backend/src/cuaderno/dominio/plazos.py` y
  `dominio/estados.py`. Pasan los casos en pytest. (REQ-07, REQ-08, REQ-09)
- [ ] T-45 [P] [US2] Implementar las reglas de T-43 en `frontend/src/dominio/plazos.ts` y
  `frontend/src/dominio/avisos.ts`. Pasan los casos en Vitest. (REQ-07, REQ-08, REQ-09)
- [ ] T-46 [US2] Escribir las pruebas de las columnas de plazo (deben fallar) en
  `backend/tests/integration/test_columnas_plazo.py`: con los casos de T-43, la base de datos calcula
  `fecha_vencimiento`, `anotado_fuera_plazo` y `completado_fuera_plazo` igual que `dominio/plazos.py`; CHECK
  (`eficacia IS NULL`) = (`completado_en IS NULL`) y (`completado_en IS NULL`) = (`fecha_completado IS NULL`).
  (REQ-07, REQ-09)
- [ ] T-47 [US2] Escribir la migración de las columnas de plazo en `backend/alembic/versions/` y
  `modelos/tratamiento.py`: `completado_en` TIMESTAMPTZ y `fecha_completado` DATE (**no generada**) con los
  CHECK de T-46; columnas **generadas** `fecha_vencimiento` = `(fecha + interval '1 month')::date`,
  `anotado_fuera_plazo` = `fecha_registro > (fecha + interval '1 month')::date` y `completado_fuera_plazo` =
  `coalesce(fecha_completado > (fecha + interval '1 month')::date, false)`, sin referirse a otra columna
  generada. **Pendiente de data-model**: comprobar que PostgreSQL acepta estas expresiones como inmutables; si
  no, calcularlas en la API con `dominio/plazos.py`, guardarlas como columnas normales y anotarlo en
  data-model. Pasan las pruebas de T-46. (REQ-07, REQ-09)
- [ ] T-48 [US2] Escribir las pruebas de completar la eficacia (deben fallar) en
  `backend/tests/integration/test_completar_eficacia.py` y ampliar el contrato con `PATCH /tratamientos/{id}`:
  un tratamiento sin eficacia devuelve `estado = pendiente` y su `fechaVencimiento` (escenario 1); un `PATCH`
  que solo añade la eficacia, sin motivo, con `versionBase` vigente → 200, `estado = completo`, `version` + 1 y
  un cambio `correccion` en el historial (escenario 4); si `fecha_completado` > vencimiento →
  `completadoFueraPlazo = true` con su fecha; un tratamiento con fecha de hace más de un mes se guarda con
  `anotadoFueraPlazo = true` (escenario 5); un reintento con el mismo `idOperacion` → 200 sin aplicarlo dos
  veces. (REQ-07, REQ-09, REQ-11)
- [ ] T-49 [US2] Implementar `PATCH /tratamientos/{id}` en `backend/src/cuaderno/servicios/tratamientos.py` y
  `api/tratamientos.py`: aplica `cambios` sobre `versionBase` en una transacción con `dominio/validacion.py`;
  motivo obligatorio salvo si solo se añade la eficacia; calcula `completado_en` y `fecha_completado`; guarda el
  cambio con `id = idOperacion` e instantáneas anterior y nueva; un `idOperacion` repetido devuelve 200 sin
  aplicar. Los conflictos de versión se completan en T-57 y T-58. Pasan las pruebas de T-48. (REQ-07, REQ-09, REQ-11)
- [ ] T-50 [US2] Escribir las pruebas de avisos (deben fallar) en `backend/tests/integration/test_avisos.py` y
  ampliar el contrato con `GET /avisos`: `GET /avisos` devuelve los pendientes que vencen en 7 días o menos y
  los vencidos, con el dato que falta (`eficacia`), los días restantes y un mensaje llano (escenario 2); con
  "hoy" fijo en `Europe/Madrid`, `revisar_plazos(hoy)` envía a Mailpit **un** correo `proximo` al entrar en los
  7 días y **un** `vencido` al vencer sin completar, cuyo contenido es el mismo que el del aviso (el tratamiento,
  el dato que falta y los días que quedan, igual que `GET /avisos`), y no repite ninguno aunque se ejecute dos veces (escenario
  3); no avisa de tratamientos anulados ni completos; un tratamiento sincronizado tarde, ya dentro de los 7 días,
  recibe su correo en la siguiente revisión; al completar la eficacia desaparece de `GET /avisos`. (REQ-08)
- [ ] T-51 [US2] Implementar los avisos: migración y modelo `aviso_correo` (PK compuesta `tratamiento_id` y
  `tipo`; `tipo` CHECK IN (`proximo`, `vencido`); `enviado_en` TIMESTAMPTZ NOT NULL) en
  `backend/src/cuaderno/modelos/aviso.py`; `GET /avisos` en `api/avisos.py`; la revisión de plazos en
  `backend/src/cuaderno/avisos.py` (`python -m cuaderno.avisos`, bucle cada hora con intervalo configurable,
  envío con `servicios/correo.py` y registro en `aviso_correo` en la misma transacción); el servicio `worker` en
  `compose.yaml` (misma imagen que `api`, comando `python -m cuaderno.avisos`) y la variable del intervalo de
  revisión en `.env.example`. Pasan las pruebas de T-50. (REQ-08; R10)
- [ ] T-52 [US2] Escribir las pruebas de componentes (deben fallar) en `frontend/tests/paginas/avisos.test.tsx` y
  después implementar en `frontend/src/paginas/cuaderno/` y `frontend/src/componentes/`: aviso al abrir la app
  con el tratamiento, el dato que falta y los días que quedan, calculado sin conexión con `avisos.ts`; estados
  "pendiente de completar" con fecha de vencimiento, "completo", "anotado fuera de plazo" y "completado fuera de
  plazo"; aviso al guardar un tratamiento fuera de plazo; completar la eficacia desde el detalle (operación
  `corregir_tratamiento` en la cola). (REQ-07, REQ-08, REQ-09, REQ-06)

**Punto de control**: la historia 2 funciona y se puede probar sola.

---

## Fase 6 (H6): Historia 3 — Consultar, corregir y conservar el registro (P2)

**Objetivo**: filtros, corrección y anulación con historial, conflictos de sincronización resueltos por el
agricultor y conservación de 3 años.

**Prueba independiente**: registrar varios tratamientos, filtrarlos por parcela y periodo, corregir uno y anular
otro, y comprobar que ambos cambios quedan en el historial (spec, historia 3).

- [ ] T-53 [US3] Escribir las pruebas de consulta (deben fallar) en
  `backend/tests/integration/test_consulta_tratamientos.py` y ampliar el contrato con `GET /tratamientos`:
  filtros `desde`, `hasta`, `parcela_id`, `producto_id` y `estado` (`completo`, `pendiente`,
  `anotado_fuera_plazo`, `completado_fuera_plazo`, `anulado`); orden por fecha; paginación (`tamano` máx. 200);
  los anulados no aparecen salvo con `estado=anulado` (escenarios 1 y 3). (REQ-10, REQ-12)
- [ ] T-54 [US3] Implementar `GET /tratamientos` con filtros y paginación en
  `backend/src/cuaderno/servicios/tratamientos.py` y `api/tratamientos.py`, más la migración con los índices
  (`explotacion_id`, `fecha`), (`parcela_id`) en `tratamiento_parcela` y (`producto_id`) en
  `tratamiento_producto`. Pasan las pruebas de T-53. (REQ-10)
- [ ] T-55 [US3] Escribir las pruebas de corrección, anulación e historial (deben fallar) en
  `backend/tests/integration/test_corregir_anular.py` y ampliar el contrato con
  `POST /tratamientos/{id}/anulacion` y `GET /tratamientos/{id}/historial`: corregir la cantidad con motivo →
  valor nuevo, y el historial conserva el anterior, la fecha y el motivo (escenario 2); corregir sin motivo (si
  no es solo añadir la eficacia) → 422; corregir la fecha recalcula el vencimiento y las marcas; anular con
  motivo → deja el cuaderno vigente y sigue en el historial marcado como anulado (escenario 3); anular sin
  motivo → 422; corregir un anulado → 409; el historial devuelve los cambios en orden con sus `diferencias`
  (campo, anterior, nuevo). (REQ-11, REQ-12)
- [ ] T-56 [US3] Implementar la anulación (`POST /tratamientos/{id}/anulacion`), el historial
  (`GET /tratamientos/{id}/historial`, con `diferencias` calculadas desde las instantáneas) y el motivo
  obligatorio en las correcciones, en `backend/src/cuaderno/dominio/historial.py`,
  `servicios/tratamientos.py` y `api/tratamientos.py`. Pasan las pruebas de T-55. (REQ-11, REQ-12)
- [ ] T-57 [US3] Escribir las pruebas de conflictos (deben fallar) en `backend/tests/integration/test_conflictos.py`
  y ampliar el contrato con `POST /tratamientos/{id}/resolucion-conflicto`: un `PATCH` o una anulación con
  `versionBase` antigua no sobrescribe, guarda un cambio `conflicto` con los datos propuestos, marca
  `en_conflicto` y responde 409 con la versión vigente, la propuesta y el `conflictoId`; **el reintento de ese
  mismo `idOperacion` devuelve otra vez 409 con el mismo `conflictoId`, no 200**; resolver con `vigente` o
  `propuesta` aplica la elegida, guarda `resolucion_conflicto` con motivo y quita la marca; las dos versiones
  quedan en el historial; resolver con una versión ya superada → 409. (REQ-06, REQ-11; caso límite
  "Sincronización con conflicto"; R4, R5)
- [ ] T-58 [US3] Implementar los conflictos y su resolución en `backend/src/cuaderno/servicios/tratamientos.py` y
  `api/tratamientos.py`: control de concurrencia optimista con `version`; el reintento de un `idOperacion`
  repite la respuesta según el `tipo` del cambio guardado (200 si se aplicó; 409 con el mismo `conflictoId` si
  quedó como conflicto). Pasan las pruebas de T-57. (REQ-06, REQ-11; R4, R5)
- [ ] T-59 [US3] Escribir las pruebas de conservación (deben fallar) en
  `backend/tests/integration/test_conservacion.py`, según la emisión más reciente del registro (RD 1311/2012,
  art. 16.3): un `DELETE` directo en la base se rechaza si la mayor entre `fecha_registro` y la fecha del último
  cambio del historial es de hace menos de 3 años; casos: tratamiento de hace 4 años anotado entonces y sin
  cambios → se permite; de hace 4 años anotado tarde, hace 2 años y 11 meses → se rechaza; de hace 4 años con una
  corrección de hace 1 año → se rechaza; los de `tratamiento_parcela`, `tratamiento_producto` y `cambio` se rechazan por las claves
  foráneas `RESTRICT`; la API no tiene ninguna operación `DELETE` sobre tratamientos (escenario 4). (REQ-13)
- [ ] T-60 [US3] Escribir la migración en `backend/alembic/versions/` con el disparador `BEFORE DELETE` sobre
  `tratamiento` que calcula la emisión más reciente,
  `greatest(fecha_registro, max((cambio.realizado_en AT TIME ZONE 'Europe/Madrid')::date))`, y rechaza el borrado
  si es posterior a `current_date - interval '3 years'`. Pasan las pruebas de T-59. (REQ-13)
- [ ] T-61 [US3] Escribir las pruebas (deben fallar) de las operaciones de corrección, anulación y resolución en
  la cola, en `frontend/tests/sync/cola-cambios.test.ts`: `corregir_tratamiento`, `anular_tratamiento` y
  `resolver_conflicto` llevan `idOperacion` y `versionBase`; un 409 marca el tratamiento como `conflicto` y
  guarda las dos versiones; un reintento que vuelve a recibir 409 no lo da por aplicado. Implementarlas después
  en `frontend/src/sync/`. (REQ-06, REQ-11, REQ-12)
- [ ] T-62 [US3] Escribir las pruebas de componentes (deben fallar) en `frontend/tests/paginas/consulta.test.tsx`
  y después implementar en `frontend/src/paginas/cuaderno/` y `frontend/src/paginas/historial/`: filtros por
  periodo, parcela, producto y estado, ordenados por fecha; corregir con motivo; anular con motivo; ver el
  historial (qué cambió, valor anterior y nuevo, fecha y motivo); y la pantalla de conflicto con las dos
  versiones para elegir la vigente. (REQ-10, REQ-11, REQ-12)

**Punto de control**: las cuatro historias funcionan y se pueden probar por separado.

---

## Fase 7 (H7): Cierre (E2E, rendimiento y validación)

**Objetivo**: comprobar el sistema completo en la plataforma de referencia, los umbrales de rendimiento de la
constitución (v1.1.1) y la guía de validación, y medir con agricultores los criterios de éxito que dependen de
ellos. Orden: T-63 a T-69, después T-71 y, por último, T-70.

- [ ] T-63 Configurar Playwright en `e2e/playwright.config.ts` con el perfil de **Chrome para Android** (emulación
  de un dispositivo Android con Chromium) contra el entorno de Compose (`https://localhost`), y añadir el
  trabajo E2E a `.github/workflows/ci.yml`. **Confianza en HTTPS**: tras `docker compose up`, el CI copia la raíz
  de la autoridad local de Caddy del volumen de datos (`/data/caddy/pki/authorities/local/root.crt`) y la añade
  al almacén NSS del usuario del runner con
  `certutil -d sql:<nssdb> -A -t "C,," -n caddy-local -i root.crt` (procedimiento de la documentación de
  Chromium para Linux). `<nssdb>` es `$HOME/.local/share/pki/nssdb` desde Chromium M146 y `$HOME/.pki/nssdb` en
  versiones anteriores: comprobar cuál corresponde a la versión que instala Playwright. No usar
  `ignoreHTTPSErrors`, porque su documentación no garantiza el registro del service worker. **Prueba de humo**
  `e2e/humo.spec.ts`, que debe pasar en el CI **antes de escribir T-64 a T-66**: con el perfil de Android carga
  `https://localhost` sin error de certificado, el service worker queda activo, al iniciar sesión se guarda la
  cookie `__Host-sesion` y, con la red cortada, la carcasa de la app sigue cargando. iOS no se prueba
  (compatible por diseño, no verificado). (Decisión del 2026-10-27; R3, R11, R13)
- [ ] T-64 [P] Tras pasar la prueba de humo de T-63, escribir el E2E de cuenta y datos de la explotación en `e2e/cuenta-explotacion.spec.ts`: crear
  cuenta, cerrar y abrir sesión, recuperar la contraseña con el correo de Mailpit, límite de intentos, alta de
  parcela, aplicador, equipo y producto, y baja de una parcela (escenarios de la historia 4). (REQ-14, REQ-15,
  REQ-16, REQ-17, REQ-20, REQ-21, REQ-22)
- [ ] T-65 [P] Escribir el E2E de registro en `e2e/registrar.spec.ts`: escenarios 1 a 4 de la historia 1 y,
  con la red cortada por Playwright, 20 tratamientos registrados sin conexión que se sincronizan sin pérdida ni
  duplicados al recuperarla (escenario 5, SC-003), incluido un producto dado de alta sin conexión. (REQ-01 a
  REQ-06, REQ-16)
- [ ] T-66 [P] Escribir el E2E de plazos, consulta y conflictos en `e2e/plazos-consulta.spec.ts`: escenarios de
  la historia 2 (pendiente, aviso, correo único en Mailpit, completar, fuera de plazo) y de la historia 3
  (filtrar, corregir, anular, historial), y un conflicto con dos contextos de navegador sin red que se resuelve
  eligiendo una versión. (REQ-07 a REQ-12)
- [ ] T-67 Escribir la siembra y el escenario de k6 en `rendimiento/sembrar.py` (50 explotaciones con 30
  parcelas y 1 000 tratamientos cada una) y `rendimiento/carga.js` (20 usuarios virtuales durante 2 minutos)
  con los umbrales de la **constitución** (fijados en la v1.1.0, vigentes en la v1.1.1): `http_req_failed: rate<0.01`; p95 < 500 ms en
  `POST /api/tratamientos`; p95 < 300 ms en `GET /api/tratamientos` filtrado por parcela y periodo y en el resto.
  Añadir el trabajo al CI, que falla si no se cumplen. (R12; constitución v1.1.0)
- [ ] T-68 Completar la prueba de contrato en `backend/tests/contract/test_contrato_completo.py`: **todas** las
  operaciones de `contracts/openapi.yaml` existen en la API con sus códigos de estado, y la API no expone
  operaciones que no estén en el contrato. (R7; principio I)
- [ ] T-69 Validar la guía [quickstart.md](quickstart.md) en el móvil Android de la demo: instalar en el móvil
  la raíz de la autoridad de Caddy y comprobar que la PWA carga por HTTPS sin errores de seguridad y se instala
  (**pendiente R11**); recorrer los 8 escenarios de validación manual y anotar el resultado de cada uno en
  `quickstart.md`. Corregir la guía si algún paso no coincide con la implementación. (R11; quickstart)
- [ ] T-71 Sesión con agricultores, sin código (va antes de T-70): preparar el guion de tareas (registrar un
  tratamiento completo de una parcela y un producto; obtener el listado de tratamientos de una parcela en un
  periodo, como ante una inspección), las cuentas y los datos de ejemplo en el móvil Android de la demo y el
  consentimiento informado de los participantes; medir **SC-001** (tiempo de registro de un tratamiento completo,
  objetivo < 2 minutos), **SC-005** (tiempo hasta obtener el listado de una parcela en un periodo, objetivo
  < 1 minuto) y **SC-007** (proporción de agricultores que registran su primer tratamiento sin ayuda, objetivo
  ≥ 4 de cada 5); anotar los resultados, sin datos personales, en `docs/proceso/validacion-001.md` y en
  `docs/proceso/registro-iteraciones.md`. Si algún criterio no se cumple, se presenta al alumno antes de T-70.
  (SC-001, SC-005, SC-007; principio V)
- [ ] T-70 Comprobar la trazabilidad final (la **última** tarea, después de T-71): cada `REQ-01` a `REQ-17` y
  `REQ-20` a `REQ-22` tiene al menos una prueba que lo cita y pasa (búsqueda de `REQ-xx` en `backend/tests`,
  `frontend/tests` y `e2e`); T-71 está hecha y sus resultados anotados; el pipeline está en verde; ejecutar
  `/speckit-converge` y dejar el resultado en la PR #1. (Principio III; puertas de fusión de la constitución)

---

## Dependencias y orden de ejecución

### Entre fases

- **Setup (T-01 a T-06)**: sin dependencias. T-01 primero; T-02 y T-03 en paralelo después; T-04 a T-06 tras
  T-01.
- **Base común (T-07 a T-19)**: depende del Setup y **bloquea todas las historias**.
- **US4 (T-20 a T-29)**: depende de la base común.
- **US1 (T-30 a T-42)**: depende de US4 (parcelas, personas, equipos y productos).
- **US2 (T-43 a T-52)**: depende de US1 (tabla `tratamiento` y registro).
- **US3 (T-53 a T-62)**: depende de US1. T-57 y T-58 amplían el `PATCH` de T-49 (US2).
- **Cierre (T-63 a T-71)**: depende de las historias que se quieran validar. T-63, con su prueba de humo, va
  antes de T-64 a T-66; T-71 va después de T-69, y T-70 es la última. T-71 lleva un número mayor que T-70 porque
  se añadió después del análisis; el orden de ejecución es el indicado.

### Dentro de cada historia

Prueba (falla) → migración y modelo → servicio y endpoint (pasa la prueba) → cola de la PWA → páginas. Las
pruebas de cada REQ van siempre antes de su implementación.

### Oportunidades de paralelismo

- Setup: T-02 y T-03.
- Base común: T-07, T-08 y T-16 entre sí y con la cadena de cuentas (T-09 a T-14).
- US4: las pruebas T-22 y T-24 mientras se implementa T-21.
- US1: T-31 y T-32 (Python y TypeScript de las mismas reglas) tras T-30.
- US2: T-44 y T-45 tras T-43.
- Cierre: T-64, T-65 y T-66 tras T-63 (con la prueba de humo en verde).

### Ejemplo de paralelo: historia 1

```text
Tras T-30 (casos de REQ-02 y REQ-04 en compartido/casos-validacion.json):
  T-31: reglas en backend/src/cuaderno/dominio/validacion.py
  T-32: reglas en frontend/src/dominio/validacion.ts
```

---

## Estrategia de implementación

### MVP

1. Setup y base común (T-01 a T-19).
2. Historia 4 (T-20 a T-29), requisito de la 1.
3. Historia 1 (T-30 a T-42).
4. **Parar y validar**: registrar con y sin conexión (prueba independiente de la historia 1).

### Entrega incremental

Después del MVP, la historia 2 (avisos de plazo) y la 3 (consulta, corrección y conservación). Cada historia
termina con su punto de control y deja el pipeline en verde en la PR #1.

### Bucle de implementación

Por tarea: implementar → probar → corregir, con el límite de la constitución v1.1.1: **3 intentos de corrección
por tarea**. Un intento es cada cambio de código seguido de una ejecución de las pruebas de la tarea que siguen
fallando; la primera ejecución en rojo (la esperada) no cuenta, y un fallo del CI en la tarea cuenta como uno.
Al llegar a 3, el agente se detiene sin hacer commit y presenta al alumno las pruebas que fallan, lo intentado y
si cree que el requisito está mal definido (en ese caso se vuelve a la fase 2). Un commit por tarea (`T-xx: ...`), con el registro del proceso
actualizado en el mismo commit cuando proceda.

---

## Trazabilidad REQ → tareas

| Requisito | Pruebas (escritas antes) | Implementación | E2E y validación |
| --- | --- | --- | --- |
| REQ-01 | T-33, T-35 | T-34, T-36, T-41, T-42 | T-65 |
| REQ-02 | T-30, T-35 | T-31, T-32, T-36, T-41 | T-65 |
| REQ-03 | T-33, T-35 | T-34, T-36, T-41 | T-65 |
| REQ-04 | T-30, T-33, T-35 | T-31, T-32, T-34, T-36, T-41 | T-65 |
| REQ-05 | T-35 | T-36, T-41 | T-65 |
| REQ-06 | T-24, T-37, T-39, T-57, T-61 | T-25, T-38, T-40, T-41, T-42, T-52, T-58 | T-65, T-66 |
| REQ-07 | T-43, T-46, T-48 | T-44, T-45, T-47, T-49, T-52 | T-66 |
| REQ-08 | T-43, T-50 | T-44, T-45, T-51, T-52 | T-66 |
| REQ-09 | T-43, T-46, T-48 | T-44, T-45, T-47, T-49, T-52 | T-66 |
| REQ-10 | T-53 | T-54, T-62 | T-66 |
| REQ-11 | T-48, T-55, T-57, T-61 | T-49, T-56, T-58, T-62 | T-66 |
| REQ-12 | T-53, T-55, T-61 | T-56, T-62 | T-66 |
| REQ-13 | T-59 | T-60 | T-69 (escenario 8) |
| REQ-14 | T-20, T-28 | T-21, T-28, T-29 | T-64 |
| REQ-15 | T-22, T-28 | T-23, T-28, T-29 | T-64 |
| REQ-16 | T-24, T-28 | T-25, T-28, T-29, T-41 | T-64, T-65 |
| REQ-17 | T-26, T-35 | T-27, T-29, T-36 | T-64 |
| REQ-20 | T-09, T-17 | T-10, T-17, T-19 | T-64 |
| REQ-21 | T-11 | T-12, T-19 | T-64 |
| REQ-22 | T-13 | T-14, T-19 | T-64 |

Criterios de éxito: SC-002 → T-30 y T-35; SC-003 → T-39 y T-65; SC-004 → T-50 y T-66; SC-006 → T-55 y T-59;
SC-001, SC-005 y SC-007 → T-71 (sesión con agricultores).

Tareas de infraestructura y su motivo: T-01 (R1, R2, R10, R13, principio VI), T-02 y T-03 (R13, principio VI),
T-04 (R11), T-05 (R2, R7), T-06 (R10, R13, principio III), T-07 (R8), T-08 y T-68 (R7, principio I), T-15 (R7,
R8), T-16 (R3), T-18 (R3, R11), T-63 (decisión de plataforma, R3, R11), T-67 (R12, constitución v1.1.0), T-69 (R11) y
T-70 (principio III) y T-71 (SC-001, SC-005, SC-007; principio V).

Pendientes del plan convertidos en tareas: Python 3.14 o 3.13 → T-01; `pip-audit`, `npm audit` y reglas `S`
de `ruff` → T-02 y T-03; columnas generadas aceptadas por PostgreSQL → T-47; confianza en la autoridad de Caddy
en el móvil Android → T-69. El anexo VII y las diferencias con el SIEX quedan para la 007 (decisión del alumno).

## Notas

- Las tareas de páginas y de la cola de la PWA (T-17 a T-19, T-28, T-29, T-41, T-42, T-52, T-61 y T-62)
  incluyen sus pruebas de componentes o de Vitest, que se escriben primero dentro de la misma tarea. La prueba
  de API de cada REQ que cubren va siempre en una tarea anterior (tabla de trazabilidad).

- SC-001, SC-005 y SC-007 se miden con agricultores en T-71, una tarea sin código; `/speckit-converge` no puede
  dar la 001 por terminada sin ella, porque T-70 comprueba que está hecha.
- Las tareas de prueba de la PWA usan Vitest; las de la API, pytest con PostgreSQL y Mailpit reales; las E2E,
  Playwright contra Compose.
