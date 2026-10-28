# Plan de implementación: Registro de tratamientos fitosanitarios

**Rama**: `001-registro-tratamientos` | **Fecha**: 2026-10-27 | **Spec**: [spec.md](spec.md) (aprobada el
2026-10-27)

**Entrada**: especificación de `specs/001-registro-tratamientos/spec.md` (con REQ-22, añadido tras la revisión
del plan, y con las tres correcciones del contraste con el BOE del 2026-10-27: conservación desde la emisión,
número de orden de la parcela y aprovechamiento), módulo 05 (`docs/conceptos/05-arquitectura-web.md`) y
constitución v1.1.1.

**Revisión del alumno (2026-10-27)**: se mantiene la contraseña de 15 caracteres como mínimo; el límite de
intentos de inicio de sesión entra en la 001 (REQ-22); se aceptan los umbrales de k6 (constitución v1.1.0); las
diferencias con el SIEX se aplazan a la 007.

**Artefactos de esta fase**: [research.md](research.md) (decisiones R1–R14 con fuentes) ·
[data-model.md](data-model.md) · [contracts/openapi.yaml](contracts/openapi.yaml) ·
[quickstart.md](quickstart.md)

## Resumen

El agricultor registra desde el móvil, con o sin cobertura, los tratamientos fitosanitarios que exige el
RD 1311/2012 (art. 16 y anexo III), los corrige y anula sin perder el historial, y recibe avisos (en la app y por
correo) antes de que venza el mes para completarlos. Técnicamente es una **PWA** (React + TypeScript) que guarda
los datos y una **cola de operaciones** en IndexedDB y la vacía al recuperar la red, una **API REST** (FastAPI)
que valida, aplica las reglas de plazo y guarda un historial inmutable, y **PostgreSQL 18 + pgvector**. Todo se
levanta con Docker Compose: Caddy (PWA y proxy con HTTPS), API, *worker* de plazos, base de datos y Mailpit.
Es la primera funcionalidad, así que también deja montados el esqueleto del proyecto y el primer pipeline de CI.

## Contexto técnico

**Lenguaje/versión**: Python 3.14 (API); TypeScript con Node.js 24 LTS (PWA). Versiones exactas de las
dependencias fijadas con ficheros de bloqueo en T-01 (R1).

**Dependencias principales**: FastAPI, Pydantic, SQLModel + Alembic, psycopg 3, pwdlib[argon2] (API); React,
Vite, vite-plugin-pwa (Workbox), Dexie, openapi-typescript (PWA); Caddy (servidor y proxy) (R1, R3, R7–R11).

**Almacenamiento**: PostgreSQL 18 con pgvector 0.8.7 (`pgvector/pgvector:0.8.7-pg18-trixie`; la extensión no se
usa hasta la 002). IndexedDB en el dispositivo (R3, R6).

**Pruebas**: pytest (unitarias, integración con PostgreSQL real, contrato), Vitest (PWA), Playwright (E2E, con
red simulada), k6 (rendimiento) (R12, R13).

**Plataforma**: **Chrome para Android** como plataforma de referencia para la demo y las pruebas E2E (decisión
del alumno, 2026-10-27). iOS/Safari es **compatible por diseño, no verificado**: la cola sin Background Sync
(R3) no depende de nada que Safari no tenga, pero no se prueba; queda como limitación y trabajo futuro.
Navegadores de escritorio para el desarrollo. Servidor en Docker Compose local.

**Tipo de proyecto**: aplicación web (PWA + API REST + base de datos).

**Objetivos de rendimiento**: con 20 usuarios simultáneos, p95 < 500 ms al registrar y < 300 ms en consultas,
menos del 1 % de errores (R12).

**Restricciones**: funcionamiento sin conexión (REQ-06); sin datos a servicios externos (principio VI); fechas
en `Europe/Madrid`; contexto seguro (HTTPS) para el service worker y la cookie de sesión (R11).

**Escala/alcance**: una explotación por usuario; para las pruebas, 50 explotaciones con 30 parcelas y
1 000 tratamientos cada una (3 años de conservación); unas 10 pantallas en la PWA.

## Comprobación de la constitución

*Puerta: antes de la fase 0 y de nuevo después del diseño (fase 1). Repetida el 2026-10-27 tras la revisión
del alumno, frente a la constitución v1.1.0, y revisada tras `/speckit-analyze` frente a la v1.1.1 (límite de
3 intentos por tarea, sin efecto sobre el diseño): se mantiene el resultado.*

| Principio | Comprobación | Antes | Después del diseño (revisión, v1.1.0) |
| --- | --- | --- | --- |
| I. La spec es la fuente de verdad | El plan solo implementa REQ de la spec. El límite de intentos se añadió **primero** a la spec (REQ-22) y después a research, data-model, contrato y quickstart. Las diferencias con el SIEX se aplazan a la 007 por decisión del alumno, sin cambiar la spec (R6). El contrato OpenAPI se verifica con una prueba (R7) | ✅ | ✅ |
| II. Humano en el bucle | Spec aprobada (2026-10-27) y modificada solo por decisión del alumno, con nota en la cabecera. Revisión del plan anotada en el registro. `/speckit-tasks` espera su aprobación | ✅ | ✅ (pendiente de aprobar) |
| III. Pruebas primero y trazabilidad | Cada REQ, incluido REQ-22, tiene criterios Dado/Cuando/Entonces; la tabla de [data-model.md](data-model.md#correspondencia-con-los-requisitos) indica dónde se garantiza cada uno; las pruebas citarán su `REQ-xx`; casos compartidos para las reglas (R8) | ✅ | ✅ |
| IV. Conformidad normativa con fuente | Campos del anexo III; cómputo del mes según el Código Civil, art. 5.1 (R14); nombres y escala de eficacia contrastados con el anexo V del SIEX (R6). Las cifras técnicas citan su fuente; las de REQ-22 (5 intentos, 15 min) están **marcadas como propuesta del agente** dentro de los márgenes de OWASP y NIST | ✅ | ✅ |
| V. Centrado en el agricultor | Formulario móvil y sin conexión, verificado en Chrome para Android, la plataforma de referencia; en iOS/Safari es compatible por diseño pero no se verifica (limitación declarada, R3); mensajes en lenguaje llano en errores, avisos y espera de acceso (contrato, 429). El registro en lenguaje natural sigue siendo el incumplimiento temporal justificado de la spec (funcionalidad 006) | ⚠️ justificado en la spec | ⚠️ justificado en la spec |
| VI. Seguridad y privacidad | Argon2id, token de sesión opaco con hash, cookie `__Host-` `HttpOnly` `Secure` `SameSite=Strict`, recuperación según OWASP y **límite de intentos por correo** sin revelar si la cuenta existe (R9, REQ-22); sin NIF de terceros; solo el correo como dato personal; secretos en `.env`; análisis estático y de dependencias en CI (R13) | ✅ | ✅ |
| VII. Simplicidad | Una sola vía de sincronización sin Background Sync (R3); idempotencia apoyada en el historial (R4); bucle simple para los avisos (R10); espera fija sin escalado exponencial y sin CAPTCHA (R9). Las piezas añadidas se justifican en "Complejidad justificada" | ✅ | ✅ |
| Restricciones técnicas (v1.1.0) | Stack de la constitución; pgvector en la imagen; Docker Compose local; **umbrales de k6 de la constitución v1.1.0** = R12 (sin diferencias). TODO(METRICAS_RAG) no afecta a la 001 | ✅ | ✅ |

**Resultado**: se supera la puerta. Única excepción: el principio V, ya declarado y justificado en la spec y
resuelto por la funcionalidad 006.

## Respuestas a las preguntas del módulo 05 (apartado 6)

| # | Pregunta | Respuesta | Detalle |
| --- | --- | --- | --- |
| 1 | Estructura del repositorio | Monorrepositorio: `backend/`, `frontend/`, `compartido/`, `e2e/`, `rendimiento/`, `despliegue/`, `compose.yaml` en la raíz | R2 y [Estructura del proyecto](#estructura-del-proyecto) |
| 2 | Sin conexión e iOS | Dexie/IndexedDB con copias de los datos maestros, los tratamientos y una cola FIFO de operaciones. La cola se vacía al abrir la app, con el evento `online`, al encolar y cada 60 s. Sin Background Sync, así que iOS se comportaría igual que Android; `storage.persist()` y aviso de pendientes. Referencia: Chrome para Android; iOS compatible por diseño, no verificado | R3 |
| 3 | Idempotencia | UUID generados en el cliente para tratamientos, productos y operaciones. Un reintento de creación devuelve 200; `cambio.id = idOperacion` evita aplicar dos veces una modificación y el reintento repite la respuesta original (200 si se aplicó, 409 si quedó en conflicto) | R4 |
| 4 | Conflictos | `version` en el tratamiento. Si llega un cambio con una versión antigua, se guarda como `conflicto` en el historial, se responde 409 con las dos versiones y el agricultor elige (`resolucion_conflicto`) | R5 |
| 5 | Modelo de datos | Claves foráneas `RESTRICT`, `CHECK`, bajas lógicas, historial con instantáneas JSONB, disparador que impide borrar antes de 3 años y nombres del anexo V del SIEX | R6, [data-model.md](data-model.md) |
| 6 | Contrato de API | OpenAPI 3.1 validado con Redocly (sin errores). Prueba de contrato en pytest | R7, [contracts/openapi.yaml](contracts/openapi.yaml) |
| 7 | Validaciones sin divergencias | Tipos generados desde el OpenAPI (el CI falla si difieren) y reglas implementadas en las dos capas, probadas con el mismo fichero de casos en pytest y Vitest | R8 |
| 8 | Cuentas y sesión | Argon2id (pwdlib), mínimo de 15 caracteres; token opaco con hash en la base de datos y cookie `__Host-sesion`; 30 días de inactividad y 90 absolutos; recuperación con token de un solo uso de 1 hora; límite de 5 fallos en 15 minutos → espera de 15 minutos y 429 (REQ-22) | R9 |
| 9 | Correo y plazos | SMTP con `smtplib`; Mailpit en Compose con API REST para las pruebas; `worker` cada hora; `aviso_correo` con clave primaria para enviar un solo correo de cada tipo | R10 |
## Estructura del proyecto

### Documentación (esta funcionalidad)

```text
specs/001-registro-tratamientos/
├── spec.md              # Especificación aprobada
├── plan.md              # Este fichero
├── research.md          # Fase 0: decisiones R1–R14 con fuentes
├── data-model.md        # Fase 1: modelo relacional e IndexedDB
├── quickstart.md        # Fase 1: guía de validación
├── contracts/
│   └── openapi.yaml     # Fase 1: contrato de la API
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks; aún no creado)
```

### Código fuente (raíz del repositorio)

```text
compose.yaml                  # web, api, worker, db, mailpit
.env.example                  # variables documentadas (sin secretos)
.github/workflows/ci.yml      # lint, pruebas, contrato, E2E, k6, auditoría de dependencias

despliegue/
└── Caddyfile                 # PWA estática + proxy /api + tls internal

backend/
├── pyproject.toml            # uv; ruff, mypy, pytest
├── Dockerfile                # imagen común de api y worker
├── alembic/                  # migraciones (una por cambio de esquema)
├── src/cuaderno/
│   ├── main.py               # aplicación FastAPI
│   ├── config.py             # variables de entorno
│   ├── db.py                 # sesión de SQLModel
│   ├── modelos/              # tablas (data-model.md)
│   ├── esquemas/             # modelos Pydantic de entrada y salida (contrato)
│   ├── dominio/              # reglas puras: validacion.py, plazos.py, estados.py, historial.py
│   ├── servicios/            # cuentas.py, sesiones.py, tratamientos.py, correo.py
│   ├── api/                  # routers: cuenta, parcelas, personas, equipos, productos, tratamientos, avisos
│   └── avisos.py             # punto de entrada del worker (revisión de plazos)
└── tests/
    ├── unit/                 # dominio (incluye los casos compartidos)
    ├── integration/          # API + PostgreSQL + Mailpit
    └── contract/             # rutas y códigos frente a contracts/openapi.yaml

frontend/
├── package.json              # Vite, React, vite-plugin-pwa, Dexie, Vitest
├── vite.config.ts            # manifiesto y service worker (generateSW)
├── src/
│   ├── api/                  # openapi.json + tipos generados + cliente
│   ├── db/                   # esquema Dexie (almacenes de data-model.md)
│   ├── sync/                 # cola de operaciones y vaciado
│   ├── dominio/              # validacion.ts, plazos.ts, avisos.ts
│   ├── paginas/              # cuenta, cuaderno, tratamiento, datos de la explotación, historial
│   └── componentes/
└── tests/                    # Vitest (incluye los casos compartidos)

compartido/
└── casos-validacion.json     # casos de las reglas REQ-02, 04, 07 y 09 para pytest y Vitest

e2e/                          # Playwright: historias 1–4, sin red, conflicto
rendimiento/                  # k6: escenario y umbrales de R12; script de siembra de datos
```

**Decisión de estructura**: aplicación web con frontend y backend separados en el mismo repositorio, más
carpetas para lo que comparten (casos de validación) y para las pruebas que atraviesan todo el sistema (E2E y
rendimiento) (R2).

## Diferencias detectadas con el SIEX (para la funcionalidad 007)

El anexo V del SIEX (FEGA, v3.11) pide datos que la spec aprobada no recoge: NIF, apellidos y nº ROPO del
aplicador y del asesor; problemática por categorías de catálogo y justificación de la actuación; cultivo y
variedad como códigos del catálogo; "Aplicación manual (S/N)". **El alumno las aplaza a la 007 a sabiendas (2026-10-27)**: no son exigencias del
RD 1311/2012 para el registro y afectan a la exportación. Se decidirán al especificar la 007, empezando por la
spec si hiciera falta (principio I). Detalle en R6.

## Pendientes

1. Confirmar en T-01 que las dependencias de Python funcionan con 3.14; si no, usar 3.13 (R1).
2. Probar en el móvil Android de referencia la confianza en la autoridad de Caddy (R11), antes de la demo.
3. Verificar la configuración de `pip-audit`, `npm audit` y las reglas de seguridad de `ruff` con su
   documentación oficial (R13).
4. Comprobar en la primera migración que PostgreSQL acepta como inmutables las expresiones de las columnas
   generadas (`fecha_vencimiento` y marcas de plazo); si no, se calculan en la API (data-model).
5. Anexo VII (catálogos) y diferencias con el SIEX: aplazados a la 007 por decisión del alumno (R6).

Resueltos en la revisión del 2026-10-27: límite de intentos (ahora REQ-22) y enmienda de la constitución con
los umbrales de k6 (v1.1.0).

## Complejidad justificada

La constitución se cumple salvo una excepción temporal y justificada, que figura en la primera fila. El resto de
la tabla justifica, según el principio VII, las piezas que van más allá del mínimo del módulo 05 (tres servicios:
`web`, `api` y `db`).

| Pieza añadida o excepción | Por qué hace falta | Alternativa más simple descartada porque… |
| --- | --- | --- |
| **Excepción al principio V**: el registro se hace con un formulario, sin texto ni voz en lenguaje natural (y, por tanto, sin la confirmación de registros generados por la IA) | Decisión del alumno del 2026-10-26: primera iteración SDD más corta y sin depender del presupuesto de la API (pendientes-tutor #14). Se resuelve en la funcionalidad 006, que reutiliza este registro (spec, Supuestos) | Incluir ya el lenguaje natural: alarga la 001 y la hace depender del coste de la API, que aún no está resuelto |
| Servicio `worker` | Los avisos por correo de REQ-08 tienen que salir aunque nadie abra la app | Dentro de la API: con varios procesos se duplican envíos, y añade la dependencia APScheduler |
| Servicio `mailpit` | Probar de verdad el correo de REQ-08 y REQ-21 sin cuentas ni secretos externos | Simular el SMTP en las pruebas: no prueba el envío real ni sirve para la demo |
| Caddy en `web` | Mismo origen (sin CORS, cookie `SameSite=Strict`) y HTTPS local para el service worker y la demo en móvil | nginx + mkcert: dos piezas; servir la PWA desde FastAPI mezcla responsabilidades |
| Vitest | Probar sin navegador la cola sin conexión y las reglas de la PWA, y ejecutar los casos compartidos | Solo Playwright: lento y poco preciso para la lógica pura |
| Dexie | Índices para filtrar sin conexión y versionado del esquema local | IndexedDB sin envoltorio: más código propio y más errores |
| Cola de operaciones y conflictos | Exigidos por REQ-06, SC-003 y el caso límite de conflicto | No hay alternativa más simple que cumpla la spec |
| Casos de validación compartidos | Garantizan que la PWA y la API aplican las mismas reglas (pregunta 7) | Confiar en la revisión manual: las divergencias pasarían desapercibidas |
