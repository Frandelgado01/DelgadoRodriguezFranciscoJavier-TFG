# Plan de implementación: Registro de tratamientos fitosanitarios

**Rama**: `001-registro-tratamientos` | **Fecha**: 2026-10-27 | **Spec**: [spec.md](spec.md) (aprobada el
2026-10-27)

**Entrada**: especificación de `specs/001-registro-tratamientos/spec.md`, módulo 05
(`docs/conceptos/05-arquitectura-web.md`) y constitución v1.0.0.

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

**Plataforma**: navegadores móviles (Chrome para Android y Safari para iOS, sin Background Sync, R3) y de
escritorio; servidor en Docker Compose local.

**Tipo de proyecto**: aplicación web (PWA + API REST + base de datos).

**Objetivos de rendimiento**: con 20 usuarios simultáneos, p95 < 500 ms al registrar y < 300 ms en consultas,
menos del 1 % de errores (R12).

**Restricciones**: funcionamiento sin conexión (REQ-06); sin datos a servicios externos (principio VI); fechas
en `Europe/Madrid`; contexto seguro (HTTPS) para el service worker y la cookie de sesión (R11).

**Escala/alcance**: una explotación por usuario; para las pruebas, 50 explotaciones con 30 parcelas y
1 000 tratamientos cada una (3 años de conservación); unas 10 pantallas en la PWA.

## Comprobación de la constitución

*Puerta: antes de la fase 0 y de nuevo después del diseño (fase 1).*

| Principio | Comprobación | Antes | Después del diseño |
| --- | --- | --- | --- |
| I. La spec es la fuente de verdad | El plan solo implementa REQ de la spec. Las diferencias con el SIEX que exigirían cambiar requisitos no se aplican aquí: quedan anotadas para la 007 (R6). El contrato OpenAPI se verifica con una prueba (R7) | ✅ | ✅ |
| II. Humano en el bucle | Spec aprobada por el alumno (2026-10-27). Este plan espera su aprobación antes de `/speckit-tasks` | ✅ | ✅ (pendiente de aprobar) |
| III. Pruebas primero y trazabilidad | Cada REQ tiene casos de aceptación; la tabla de [data-model.md](data-model.md#correspondencia-con-los-requisitos) indica dónde se garantiza cada uno; las pruebas citarán su `REQ-xx`; casos compartidos para las reglas (R8) | ✅ | ✅ |
| IV. Conformidad normativa con fuente | Campos del anexo III; cómputo del mes según el Código Civil, art. 5.1 (R14); nombres y escala de eficacia contrastados con el anexo V del SIEX (R6). No se inventan cifras: las técnicas (umbrales, caducidades) se justifican con su fuente | ✅ | ✅ |
| V. Centrado en el agricultor | Formulario móvil, sin conexión en Android e iOS (R3), mensajes en lenguaje llano en errores y avisos (contrato). El registro en lenguaje natural sigue siendo el incumplimiento temporal justificado de la spec (funcionalidad 006) | ⚠️ justificado en la spec | ⚠️ justificado en la spec |
| VI. Seguridad y privacidad | Argon2id, token de sesión opaco con hash, cookie `__Host-` `HttpOnly` `Secure` `SameSite=Strict`, recuperación según OWASP (R9); sin NIF de terceros; solo el correo como dato personal; secretos en `.env`; análisis estático y de dependencias en CI (R13) | ✅ | ✅ |
| VII. Simplicidad | Una sola vía de sincronización sin Background Sync (R3); idempotencia apoyada en el historial (R4); bucle simple para los avisos (R10). Las piezas añadidas se justifican en "Complejidad justificada" | ✅ | ✅ |
| Restricciones técnicas | Stack de la constitución; pgvector incluido en la imagen; Docker Compose local; TODO(UMBRALES_RENDIMIENTO): propuesta de umbrales de k6 en R12 para incorporarla por enmienda | ✅ | ✅ |

**Resultado**: se supera la puerta. Única excepción: el principio V, ya declarado y justificado en la spec y
resuelto por la funcionalidad 006.

## Respuestas a las preguntas del módulo 05 (apartado 6)

| # | Pregunta | Respuesta | Detalle |
| --- | --- | --- | --- |
| 1 | Estructura del repositorio | Monorrepositorio: `backend/`, `frontend/`, `compartido/`, `e2e/`, `rendimiento/`, `despliegue/`, `compose.yaml` en la raíz | R2 y [Estructura del proyecto](#estructura-del-proyecto) |
| 2 | Sin conexión e iOS | Dexie/IndexedDB con copias de los datos maestros, los tratamientos y una cola FIFO de operaciones. La cola se vacía al abrir la app, con el evento `online`, al encolar y cada 60 s. Sin Background Sync, así que iOS se comporta igual que Android; `storage.persist()` y aviso de pendientes | R3 |
| 3 | Idempotencia | UUID generados en el cliente para tratamientos, productos y operaciones. Un reintento de creación devuelve 200; `cambio.id = idOperacion` evita aplicar dos veces una modificación | R4 |
| 4 | Conflictos | `version` en el tratamiento. Si llega un cambio con una versión antigua, se guarda como `conflicto` en el historial, se responde 409 con las dos versiones y el agricultor elige (`resolucion_conflicto`) | R5 |
| 5 | Modelo de datos | Claves foráneas `RESTRICT`, `CHECK`, bajas lógicas, historial con instantáneas JSONB, disparador que impide borrar antes de 3 años y nombres del anexo V del SIEX | R6, [data-model.md](data-model.md) |
| 6 | Contrato de API | OpenAPI 3.1 validado con Redocly (sin errores). Prueba de contrato en pytest | R7, [contracts/openapi.yaml](contracts/openapi.yaml) |
| 7 | Validaciones sin divergencias | Tipos generados desde el OpenAPI (el CI falla si difieren) y reglas implementadas en las dos capas, probadas con el mismo fichero de casos en pytest y Vitest | R8 |
| 8 | Cuentas y sesión | Argon2id (pwdlib); token opaco con hash en la base de datos y cookie `__Host-sesion`; 30 días de inactividad y 90 absolutos; recuperación con token de un solo uso de 1 hora | R9 |
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
variedad como códigos del catálogo; "Aplicación manual (S/N)". **No se cambian ahora**: no son exigencias del
RD 1311/2012 para el registro y afectan a la exportación. Se decidirán al especificar la 007, empezando por la
spec si hiciera falta (principio I). Detalle en R6.

## Pendientes

1. Confirmar en T-01 que las dependencias de Python funcionan con 3.14; si no, usar 3.13 (R1).
2. Probar en un iPhone real `storage.persist()` y la instalación en la pantalla de inicio (R3) y la confianza en
   la autoridad de Caddy (R11), antes de la demo.
3. Limitar los intentos de inicio de sesión: propuesto para la fase de validación (R9).
4. Verificar la configuración de `pip-audit`, `npm audit` y las reglas de seguridad de `ruff` con su
   documentación oficial (R13).
5. Comprobar que `fecha_vencimiento` se puede declarar como columna generada (data-model).
6. Anexo VII (catálogos) y diferencias con el SIEX: en la 007 (R6).
7. Enmienda de la constitución con los umbrales de k6 (R12) cuando el alumno apruebe el plan.

## Complejidad justificada

La constitución se cumple. Esta tabla justifica, según el principio VII, las piezas que van más allá del mínimo
del módulo 05 (tres servicios: `web`, `api` y `db`).

| Pieza añadida | Por qué hace falta | Alternativa más simple descartada porque… |
| --- | --- | --- |
| Servicio `worker` | Los avisos por correo de REQ-08 tienen que salir aunque nadie abra la app | Dentro de la API: con varios procesos se duplican envíos, y añade la dependencia APScheduler |
| Servicio `mailpit` | Probar de verdad el correo de REQ-08 y REQ-21 sin cuentas ni secretos externos | Simular el SMTP en las pruebas: no prueba el envío real ni sirve para la demo |
| Caddy en `web` | Mismo origen (sin CORS, cookie `SameSite=Strict`) y HTTPS local para el service worker y la demo en móvil | nginx + mkcert: dos piezas; servir la PWA desde FastAPI mezcla responsabilidades |
| Vitest | Probar sin navegador la cola sin conexión y las reglas de la PWA, y ejecutar los casos compartidos | Solo Playwright: lento y poco preciso para la lógica pura |
| Dexie | Índices para filtrar sin conexión y versionado del esquema local | IndexedDB sin envoltorio: más código propio y más errores |
| Cola de operaciones y conflictos | Exigidos por REQ-06, SC-003 y el caso límite de conflicto | No hay alternativa más simple que cumpla la spec |
| Casos de validación compartidos | Garantizan que la PWA y la API aplican las mismas reglas (pregunta 7) | Confiar en la revisión manual: las divergencias pasarían desapercibidas |
