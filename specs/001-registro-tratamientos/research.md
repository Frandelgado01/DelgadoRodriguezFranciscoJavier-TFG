# Investigación (fase 0): Registro de tratamientos fitosanitarios

**Funcionalidad**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Fecha**: 2026-10-27

Resuelve las decisiones técnicas abiertas del plan y las preguntas del apartado 6 del módulo 05
(`docs/conceptos/05-arquitectura-web.md`). Cada decisión sigue el formato Decisión / Motivo / Alternativas.
Las fuentes se consultaron el 2026-10-27 y se citan en APA al final. Lo que no se ha podido verificar se marca
como **pendiente**.

---

## R1. Versiones de la plataforma

- **Decisión**: Python 3.14 (serie en *bugfix*), Node.js 24 (LTS), PostgreSQL 18 con pgvector 0.8.7
  (imagen `pgvector/pgvector:0.8.7-pg18-trixie`). Las versiones exactas de React, Vite y el resto de
  dependencias se fijan (con fichero de bloqueo) en la primera tarea de implementación.
- **Motivo**: son las series con soporte activo en la fecha del plan (Python Software Foundation, s. f.;
  OpenJS Foundation, s. f.; PostgreSQL Global Development Group, s. f.-a). La imagen de pgvector trae la extensión
  ya compilada sobre PostgreSQL 18, así que la 002 (RAG) no tendrá que cambiar de imagen (pgvector, s. f.-b).
- **Alternativas**: Python 3.15 (más reciente, pero algunas dependencias podrían no tener todavía ruedas
  publicadas); Node 22 (en mantenimiento); imagen oficial `postgres:18` instalando pgvector a mano (más trabajo
  sin ventaja).
- **Resuelto en T-01 (2026-10-28)**: se mantiene **Python 3.14** (3.14.10). Todas las dependencias instalan desde
  ruedas con `uv` 0.13.6 en Windows y en la imagen `ghcr.io/astral-sh/uv:0.13.6-python3.14-trixie-slim`, y
  funcionan: FastAPI 0.162.0 (Starlette 1.10.0), Pydantic 2.14.1, SQLModel 0.0.48 (SQLAlchemy 2.1.6), Alembic
  1.20.1, psycopg 3.3.6 con su implementación binaria y pwdlib 0.3.1 (Argon2id). No hace falta bajar a 3.13.
  Versiones exactas en `backend/pyproject.toml` y `backend/uv.lock`, y en `frontend/package.json` y
  `frontend/package-lock.json`. Dos ajustes: el cliente de pruebas de Starlette 1.10 necesita `httpx2` (dependencia
  de desarrollo), y TypeScript se fija en **5.9.3** y no en la 7.0.2 (la última), porque openapi-typescript 7.13.0
  exige TypeScript 5 (`peerDependencies: ^5.x`).

## R2. Estructura del repositorio (pregunta 1)

- **Decisión**: monorrepositorio con `backend/` (FastAPI), `frontend/` (PWA), `compartido/` (casos de validación
  comunes, R8), `e2e/` (Playwright), `rendimiento/` (k6), `despliegue/` (Caddyfile) y `compose.yaml` en la raíz.
  Árbol completo en [plan.md](plan.md#estructura-del-proyecto).
- **Motivo**: la PWA y la API se versionan y se prueban juntas en el mismo PR. Así la trazabilidad
  REQ → T → commit → prueba (principio III) queda en un único historial y Compose levanta todo desde la raíz.
- **Alternativas**: dos repositorios (rompe la trazabilidad en un solo PR); un único proyecto con el frontend
  servido por FastAPI (mezcla dos cadenas de construcción).

## R3. Sin conexión: qué se guarda en IndexedDB y cómo se sincroniza (pregunta 2, REQ-06)

- **Decisión**:
  1. **Almacenamiento local** en IndexedDB mediante **Dexie** (envoltorio de IndexedDB con esquema versionado e
     índices declarativos) (Dexie, s. f.). Almacenes:
     - `parcelas`, `personas`, `equipos`, `productos`: copia de los datos maestros activos, para elegir de la
       lista y validar la superficie sin conexión.
     - `tratamientos`: los tratamientos de la explotación (incluidos los locales sin sincronizar), con
       `estadoSincronizacion` (`sincronizado` | `pendiente` | `conflicto`).
     - `cola`: **cola de operaciones pendientes** (*outbox*). Cada entrada tiene `idOperacion` (UUID),
       `tipo` (`crear_tratamiento`, `corregir_tratamiento`, `anular_tratamiento`, `crear_producto`,
       `resolver_conflicto`), `entidadId`, `versionBase`, `cuerpo`, `creadaEn` e `intentos`.
  2. **Vaciado de la cola** en orden FIFO, una operación cada vez, al **abrir la app**, al recibir el evento
     **`online`**, justo después de encolar si hay red y cada 60 s mientras la app está abierta y la cola no está
     vacía. Si una operación falla por red, se detiene el vaciado y se reintenta en el siguiente disparo; si
     falla con 401, se pide iniciar sesión sin borrar la cola; si falla con 409, se marca el conflicto (R5).
  3. **No se usa la Background Sync API.** El service worker solo se encarga de la carcasa de la app
     (precaché con `vite-plugin-pwa`, estrategia `generateSW` sobre Workbox) (Vite PWA, s. f.).
  4. **iOS**: Safari no implementa Background Sync (Can I use, s. f.), así que el mecanismo del punto 2 es el
     **único** en todas las plataformas y se comporta igual en Android e iOS. Para reducir el riesgo de que iOS
     borre los datos locales, la app pide almacenamiento persistente con `navigator.storage.persist()` (MDN Web
     Docs, s. f.-b) y recomienda instalarla en la pantalla de inicio. WebKit desaloja el almacenamiento por
     origen, del menos usado al más usado, salvo que el origen esté en modo persistente, y concede ese modo con
     heurísticas que tienen en cuenta si la web está instalada en la pantalla de inicio (WebKit, 2023). Como
     **los datos solo están a salvo cuando se sincronizan**, la interfaz muestra siempre cuántas operaciones
     quedan pendientes.
- **Motivo**: un único mecanismo que funciona en todos los navegadores es más simple de construir, de probar
  (Playwright simula la pérdida de red) y de explicar (principio VII) que combinar Background Sync y un
  mecanismo alternativo. REQ-06 se cumple siempre que la app se abra con conexión, que es el supuesto del
  módulo 05 (§ 1.1).
- **Alternativas**: cola de `workbox-background-sync` (en iOS se reintenta solo al arrancar el service worker,
  así que aporta poco y añade una segunda vía); IndexedDB sin envoltorio o con `idb` (más código propio para los
  índices de filtrado y las migraciones del esquema local).
- **Plataforma de referencia (decisión del alumno, 2026-10-27)**: **Chrome para Android** es la plataforma de la
  demo y de las pruebas E2E. iOS/Safari queda como **compatible por diseño, no verificado**: el mecanismo del
  punto 2 no depende de nada que Safari no tenga, pero no se prueba en un iPhone. Se declara como limitación y
  trabajo futuro en la memoria. La cola sin Background Sync se mantiene igual.

## R4. Identificadores e idempotencia (pregunta 3)

- **Decisión**:
  - El **cliente genera el UUID** (v4, `crypto.randomUUID()`) de cada tratamiento, producto y operación.
  - **Crear** (`POST /api/tratamientos`, `POST /api/productos`) lleva el `id` en el cuerpo. Si ya existe un
    recurso con ese `id` en la explotación y el contenido es idéntico, la API responde `200` con el recurso
    (reintento). Si el contenido es distinto, responde `409`.
  - **Modificar** (corregir, anular, resolver conflicto) lleva un `idOperacion`. La API guarda cada cambio en el
    historial con `id = idOperacion` (clave primaria), así que un reintento encuentra el cambio ya registrado y
    no lo aplica dos veces. La respuesta repite la del primer intento según el `tipo` del cambio guardado: `200`
    con el estado actual si se aplicó (`correccion`, `anulacion`, `resolucion_conflicto`), o **`409` con el
    mismo `conflictoId`** si quedó como `conflicto` (R5). Así un reintento nunca hace creer a la PWA que un
    cambio en conflicto se aplicó. No hace falta una tabla de idempotencia aparte.
- **Motivo**: es la técnica del módulo 05 (§ 1.2). Al aprovechar el propio historial (REQ-11) para la
  idempotencia, no hay que añadir ninguna estructura más. Es lo que permite cumplir "sin pérdida ni duplicados"
  (SC-003).
- **Alternativas**: cabecera `Idempotency-Key` con una tabla propia (más estado que mantener); identificadores
  del servidor con mapeo local de temporales (complica las referencias entre operaciones de la cola, por
  ejemplo un producto nuevo usado en un tratamiento nuevo).

## R5. Conflictos de sincronización (pregunta 4)

- **Decisión**: **control de concurrencia optimista** con un entero `version` en cada tratamiento.
  1. Toda modificación envía `versionBase`, la versión sobre la que se hizo el cambio.
  2. Si `versionBase` coincide con la versión actual, se aplica el cambio, se incrementa `version` y se guarda
     en el historial (`tipo = correccion` o `anulacion`).
  3. Si no coincide, **no se sobrescribe**. El cambio entrante se guarda en el historial con
     `tipo = conflicto` (datos propuestos completos y motivo), el tratamiento queda con `en_conflicto = true` y
     la API responde **`409`** con la versión vigente y la propuesta.
  4. El agricultor ve ambas versiones y elige: `POST /api/tratamientos/{id}/resolucion-conflicto` con la
     versión elegida (la vigente o la propuesta), `versionBase` actual y `idOperacion`. Se guarda un cambio
     `tipo = resolucion_conflicto` y se limpia la marca.
- **Motivo**: cumple el caso límite "Sincronización con conflicto": no se pierde ninguna versión, ambas quedan
  en el historial y decide el agricultor. Se usa `409` como en el módulo 05 (§ 2) en lugar de `412` con
  `If-Match`/`ETag`, que es la alternativa HTTP estándar (MDN Web Docs, s. f.-c), porque la versión viaja en el
  cuerpo junto al resto de la operación encolada y la PWA no tiene que gestionar cabeceras condicionales.
- **Alternativas**: "gana el último" (pierde datos, incumple la spec); fusión automática campo a campo (más
  compleja y puede dar resultados que nadie ha visto).

## R6. Modelo de datos y nombres alineados con el SIEX (pregunta 5)

- **Decisión**: modelo relacional en [data-model.md](data-model.md), con claves foráneas `ON DELETE RESTRICT`,
  restricciones `CHECK`, bajas lógicas (`estado`, `fecha_baja`), historial como instantáneas JSONB y un
  disparador que impide borrar un tratamiento hasta 3 años después de su emisión más reciente (REQ-13, art. 16.3).
  Los nombres de la parcela siguen el anexo III del RD 1311/2012: `numero_orden` (número de identificación
  correlativo, A.2.a) y `aprovechamiento` con `cultivo_lenoso` (A.2.d), tras el contraste con el BOE del
  2026-10-27. Los nombres de columnas siguen los
  campos del anexo V del SIEX (FEGA, 2025a) siempre que existe equivalente: `sigpac_provincia` …
  `sigpac_recinto` (REA, bloque 12, campos 2–8), `sistema_explotacion` (secano/regadío, campo 27),
  `superficie_tratada` en ha con dos decimales (CUE, bloque 8, campo 5), `nombre_comercial` y
  `numero_registro` (campos 22 y 24), `cantidad` y `unidad_medida` (campos 25 y 27), `numero_roma`
  (campo 35), `eficacia` y `observaciones` (campos 54 y 55).
- **Comprobaciones con el anexo V** (bloque 8 del CUE, "Tratamientos fitosanitarios. Actuaciones
  fitosanitarias", y bloque 1.4, "Tratamiento de semillas"):
  - **Eficacia**: el catálogo del SIEX es "buena, regular o mala" (bloque 1.4, campo 11). Coincide con la
    clarificación del 2026-10-27, así que se guarda tal cual.
  - **Unidades**: el SIEX admite `L` y `kg` entre otras (campo 27). Se guardan con esa grafía (`L`, `kg`).
  - **Superficie tratada**: "en hectáreas con dos decimales" (campo 5) → `NUMERIC(10,2)`.
  - **Fechas**: el SIEX pide fecha de inicio y de fin (campos 1 y 2). La spec registra un tratamiento por día,
    así que en la exportación (007) inicio = fin = `fecha`.
- **Diferencias con la spec que afectan a la exportación (007), no a la 001**: se anotan aquí para decidirlas
  al especificar la 007, sin cambiar ahora la spec aprobada:
  1. El SIEX pide del aplicador y del asesor nombre, apellidos, **NIF** y **nº de inscripción ROPO** (campos
     28–33 y 45–50). La spec no pide NIF (minimización de datos, principio VI) y guarda el "número de carné".
     **Pendiente (007)**: confirmar si el número de carné equivale a la inscripción en el ROPO y si la
     exportación exige el NIF.
  2. El SIEX clasifica la **plaga o problema** por categorías de catálogo (malas hierbas, enfermedades,
     artrópodos, reguladores) y pide la **justificación de la actuación** (campos 11–15). La 001 guarda texto
     libre.
  3. El **cultivo** y la **variedad** se exportan como códigos del catálogo SIEX (anexo VII). La 001 guarda texto.
  4. El SIEX pide **"Aplicación manual (S/N)"** (campo 34), que la spec no recoge.
- **Motivo**: con columnas alineadas, la exportación será casi directa. Las diferencias de catálogo se resuelven
  mejor en la 007, con el anexo VII delante, que forzando ahora catálogos que la 001 no necesita (principio VII).
- **Alternativas**: modelo documental o JSON libre (pierde integridad, módulo 05 § 5); catálogos del SIEX ya en
  la 001 (alarga la iteración y depende de descargar el anexo VII).
- **Pendiente**: descargar el anexo VII (catálogos) al especificar la 007 (FEGA, s. f.).

## R7. Contrato de API (pregunta 6)

- **Decisión**: contrato **OpenAPI 3.1** escrito en la fase de diseño en
  [contracts/openapi.yaml](contracts/openapi.yaml). En la implementación, FastAPI genera el OpenAPI desde los
  modelos de Pydantic (FastAPI, s. f.-a), una prueba de contrato (pytest) comprueba que cada ruta, método y
  código de estado del contrato existe en la aplicación, y el OpenAPI generado se guarda en
  `frontend/src/api/openapi.json`.
- **Motivo**: el contrato es el artefacto SDD revisable antes de programar. La prueba de contrato impide que el
  código se aleje de él en silencio (principio I).
- **Alternativas**: solo el OpenAPI generado (no hay contrato que revisar antes de implementar); generar el
  servidor desde el contrato (cadena de herramientas extra, poco natural en FastAPI).

## R8. Validaciones de la PWA y de la API sin divergencias (pregunta 7)

- **Decisión**, en tres capas:
  1. **Tipos**: `openapi-typescript` genera los tipos de TypeScript a partir de `openapi.json` (OpenAPI
     TypeScript, s. f.). El CI regenera el fichero y **falla si difiere del versionado**, de modo que un cambio
     en la API sin actualizar la PWA rompe la construcción.
  2. **Reglas**: las reglas de REQ-02, REQ-04, REQ-07 y REQ-09 se implementan dos veces, en
     `backend/src/cuaderno/dominio/` (Python) y en `frontend/src/dominio/` (TypeScript), porque la PWA tiene que
     validar sin conexión.
  3. **Casos compartidos**: un único fichero `compartido/casos-validacion.json` recoge los casos de cada regla
     (entrada, resultado esperado, `REQ-xx`). **pytest y Vitest ejecutan los mismos casos**, así que si una
     implementación diverge, falla su prueba. Incluye los casos del cómputo del mes (31 ene → 28/29 feb).
- **Motivo**: las reglas entre campos (superficie ≤ superficie de la parcela, fecha ≤ hoy, vencimiento) no se
  expresan bien en JSON Schema, así que generar el validador desde el contrato no basta. Los casos compartidos
  son la forma más simple de garantizar el mismo comportamiento sin ejecutar Python en el navegador.
- **Alternativas**: validar solo en la API (incumple la validación sin conexión); validador JSON Schema en la PWA
  (cubre solo reglas de un campo); un único motor de reglas compartido (desproporcionado).

## R9. Cuentas, contraseñas y sesión (pregunta 8, REQ-20 y REQ-21)

- **Decisión**:
  - **Contraseñas**: hash **Argon2id** con `pwdlib` (`PasswordHash.recommended()`), la biblioteca que recomienda
    el tutorial de seguridad de FastAPI (FastAPI, s. f.-b), con al menos los parámetros mínimos de OWASP
    (19 MiB, 2 iteraciones, paralelismo 1) (OWASP, s. f.-c). Longitud **mínima de 15 caracteres y máxima de 128** (OWASP pide
    admitir al menos 64), sin reglas de composición, porque no hay segundo factor; la interfaz sugiere usar una frase (OWASP,
    s. f.-a). Mensaje de error de inicio de sesión genérico ("Correo o contraseña incorrectos").
  - **Sesión**: token **opaco** de 256 bits generado con un generador criptográfico. Se guarda en la base de
    datos **solo su hash** (SHA-256) y viaja en una cookie `__Host-sesion` con `Secure`, `HttpOnly`,
    `SameSite=Strict` y `Path=/`. Se crea un token nuevo al iniciar sesión y se invalida en el servidor al
    cerrarla (OWASP, s. f.-d). La API solo acepta `application/json` y se sirve en el mismo origen que la PWA
    (R11), lo que, junto con `SameSite=Strict`, cubre CSRF.
  - **Caducidad**: **30 días de inactividad y 90 días absolutos**. OWASP pone ejemplos de minutos u horas para
    aplicaciones web de oficina (OWASP, s. f.-d). Aquí la sesión tiene que durar días porque el agricultor
    registra sin conexión (REQ-20). Si la sesión caduca con operaciones en la cola, la cola se conserva y se
    envía tras volver a iniciar sesión.
  - **Recuperación**: token aleatorio de un solo uso, guardado como hash, que **caduca en 1 hora**. La respuesta
    es la misma exista o no la cuenta, el enlace se construye con la URL configurada (nunca con la cabecera
    `Host`), la página de restablecimiento envía `Referrer-Policy: no-referrer`, como mucho 3 solicitudes por
    cuenta y hora, y al restablecer se cierran todas las sesiones y se pide iniciar sesión de nuevo (OWASP,
    s. f.-b).
  - **Cierre de sesión en el dispositivo**: se borran los datos locales de IndexedDB solo si la cola está vacía.
    Si no lo está, se avisa de que hay registros sin enviar.
- **Motivo**: se siguen las guías de OWASP y la biblioteca que recomienda FastAPI. El token opaco en base de
  datos se puede revocar al cerrar sesión o al restablecer la contraseña, algo que un JWT sin estado no permite
  sin una lista de revocación (principio VI, con la solución más simple: principio VII).
- **Alternativas**: JWT en `localStorage` (expuesto a XSS y difícil de revocar); `passlib` (FastAPI lo
  reserva para hashes antiguos); OAuth con un proveedor externo (envía datos a terceros, principio VI).
- **Contraseña**: el alumno mantiene el mínimo de 15 caracteres, sin reglas de composición y sugiriendo una
  frase (decisión del 2026-10-27).
- **Límite de intentos (REQ-22, decisión del alumno del 2026-10-27)**:
  - Contador **por correo normalizado** (`lower(trim(correo))`), no por IP ni por `usuario_id`, para que la
    respuesta sea la misma exista o no la cuenta (OWASP, s. f.-a).
  - **5 fallos consecutivos dentro de una ventana de 15 minutos** → **espera de 15 minutos**. Las cifras son
    **propuesta del agente**: OWASP pide ajustar umbral, ventana y duración, pero no da valores (OWASP, s. f.-a),
    y NIST fija un máximo de 100 fallos consecutivos y pone como ejemplo esperas crecientes de 30 s a 1 h
    (National Institute of Standards and Technology [NIST], 2025, apdo. 3.2.2). 5 y 15 minutos están dentro de
    esos márgenes y no estorban a quien se equivoca un par de veces.
  - Espera **fija**, sin escalado exponencial (principio VII). Se revisará en la fase 7 si hiciera falta.
  - Durante la espera, `POST /api/sesion` responde **`429`** con `Retry-After` (segundos) y un mensaje en
    lenguaje llano. Se comprueba **antes** de verificar la contraseña, así que el ataque no gasta cómputo de
    Argon2.
  - La **recuperación de contraseña sigue disponible**, para que un atacante no pueda bloquear a un agricultor
    (OWASP, s. f.-a). Un inicio de sesión correcto o un restablecimiento ponen el contador a cero.
  - Implementación en la tabla `intento_acceso` (data-model), actualizada en la misma transacción que la
    verificación (`SELECT … FOR UPDATE`), para que dos peticiones simultáneas no se salten el límite.
- **Alternativas al límite**: contador por IP (se esquiva cambiando de IP y bloquea a quien comparte red);
  CAPTCHA (servicio externo, contrario al principio VI); esperas exponenciales (más complejas de explicar y
  probar).

## R10. Correo: avisos de plazo y recuperación (pregunta 9, REQ-08 y REQ-21)

- **Decisión**:
  - **Envío** por SMTP con la biblioteca estándar de Python (`smtplib`), configurado por variables de entorno
    (`SMTP_HOST`, `SMTP_PORT`, `CORREO_REMITENTE`, documentadas en `.env.example`).
  - **Pruebas en local**: servicio **Mailpit** en Compose (`axllent/mailpit`): SMTP en el puerto 1025 e
    interfaz web en el 8025. Recoge los correos sin enviarlos y ofrece una API REST para pruebas de integración
    (Mailpit, s. f.-a, s. f.-b). Las pruebas de integración y de Playwright consultan esa API para comprobar que
    el correo llegó una sola vez.
  - **Recuperación**: la API envía el correo en una tarea en segundo plano de FastAPI (`BackgroundTasks`) para
    responder enseguida y con el mismo tiempo exista o no la cuenta (FastAPI, s. f.-c).
  - **Revisión de plazos**: servicio `worker` en Compose, con la misma imagen que la API y otro comando
    (`python -m cuaderno.avisos`), que ejecuta la revisión **cada hora** (intervalo configurable). Por cada
    tratamiento sincronizado, no anulado y sin eficacia: si `hoy ≥ vencimiento − 7 días`, envía el correo
    `proximo`; si `hoy > vencimiento`, el correo `vencido`. Cada envío se anota en `aviso_correo` con clave
    primaria (`tratamiento_id`, `tipo`), lo que garantiza **un solo correo de cada tipo** aunque la revisión se
    repita o se ejecute dos veces. "Hoy" se calcula en la zona `Europe/Madrid`. Al ejecutarse cada hora, cubre el
    caso límite del tratamiento que se sincroniza tarde: el correo sale en la primera revisión después de la
    sincronización.
- **Motivo**: un bucle simple en un proceso aparte no añade dependencias, no duplica envíos si la API escala y
  se prueba llamando a la función de revisión con una fecha fija. Mailpit permite probar el correo de verdad
  sin cuenta externa ni secretos.
- **Alternativas**: APScheduler dentro de la API (dependencia extra y envíos duplicados con varios procesos);
  `cron` del sistema (otro proceso en la imagen); una tabla de salida para todos los correos (más robusta, pero
  innecesaria a esta escala).
- **Pendiente**: proveedor SMTP real para la demo si hiciera falta enviar a buzones reales. Por defecto, la demo
  enseña los correos en Mailpit.

## R11. Servir la PWA, mismo origen y HTTPS

- **Decisión**: servicio `web` con **Caddy**, que sirve la PWA construida y hace de proxy inverso de `/api/*`
  hacia el servicio `api`. Así PWA y API comparten origen (sin CORS y con cookie `SameSite=Strict`). Caddy da
  HTTPS automático con su propia autoridad de certificación local (`tls internal`) para `localhost` y para la IP
  de la red local de la demo (Caddy, s. f.).
- **Motivo**: los service workers y las cookies `Secure` necesitan un contexto seguro (módulo 05, § 4). Caddy
  resuelve en un único servicio el servidor estático, el proxy y el HTTPS local, que es el pendiente 3 del
  módulo 05.
- **Alternativas**: nginx con certificados de `mkcert` (dos piezas en lugar de una); servir la PWA desde FastAPI
  (mezcla responsabilidades y complica la caché del service worker).
- **Pendiente**: para la demo en el móvil Android de referencia (R3) hay que instalar en él la raíz de la
  autoridad de Caddy; si no, el navegador muestra errores de seguridad (Caddy, s. f.). Se probará antes de la
  demo. En iOS no se prueba (compatible por diseño, no verificado).

## R12. Umbrales iniciales de rendimiento (k6) (TODO de la constitución)

- **Decisión**: escenario de carga con **20 usuarios virtuales durante 2 minutos** sobre una base sembrada con
  50 explotaciones, cada una con 30 parcelas y 1 000 tratamientos (unos tres años de uso). Umbrales, que hacen
  fallar el pipeline si no se cumplen (Grafana Labs, s. f.):
  - `http_req_failed`: `rate<0.01` (menos del 1 % de errores).
  - Registrar un tratamiento (`POST /api/tratamientos`): `p(95)<500` ms.
  - Consultar tratamientos filtrados por parcela y periodo (`GET /api/tratamientos`): `p(95)<300` ms.
  - Resto de peticiones: `p(95)<300` ms.
- **Motivo**: 1 s es el límite para que el usuario no pierda el hilo de lo que hace, y 0,1 s se percibe como
  instantáneo (Nielsen, 1993). Con p95 por debajo de 0,3–0,5 s en el servidor, queda margen para la red móvil
  dentro de ese segundo. Además, SC-001 (registrar en menos de 2 minutos) y SC-005 (listado en menos de
  1 minuto) dependen sobre todo del tiempo del usuario, no del servidor. 20 usuarios simultáneos superan con
  holgura el uso esperado de la demo, con agricultores que registran a ratos. El volumen sembrado cubre los
  3 años de conservación (REQ-13).
- **Alternativas**: umbrales más estrictos (p95 < 200 ms), que no aportan nada perceptible y sí fragilidad en
  CI; no fijar umbrales, lo que incumple el TODO de la constitución.
- **Nota**: estos umbrales se incorporan a la constitución por enmienda (PATCH o MINOR) cuando el alumno apruebe
  el plan. Se revisarán con las primeras mediciones reales.

## R13. Pruebas y pipeline

- **Decisión**: **pytest** (unitarias de dominio, integración con PostgreSQL real y contrato), **Vitest**
  (unitarias de las reglas y de la cola de la PWA, y los casos compartidos de R8), **Playwright** (E2E de las
  historias 1–4, incluido el modo sin conexión con la red simulada) y **k6** (R12). Pipeline de GitHub Actions:
  lint y tipos, pruebas unitarias e integración, comprobación del contrato y de `openapi.json`, construcción de
  imágenes, E2E y k6 contra Compose, y análisis estático y de dependencias (`ruff` con reglas de seguridad,
  `pip-audit` y `npm audit --audit-level=high`). Una vulnerabilidad alta o crítica bloquea la fusión.
- **Motivo**: es el stack de pruebas de la constitución más Vitest, que es necesario para probar en Node la
  lógica sin conexión de la PWA y los casos compartidos (ver "Complejidad justificada" en el plan).
- **Pendiente**: verificar en T-01 con su documentación oficial la configuración de `pip-audit`, `npm audit`
  y las reglas `S` de `ruff`.

## R14. Fecha de vencimiento y "fuera de plazo"

- **Decisión**:
  - `fecha_vencimiento = fecha + 1 mes`, calculada por PostgreSQL como columna generada. La suma de meses de
    PostgreSQL mantiene el día del mes salvo que el mes nuevo no lo tenga, y entonces usa su último día
    (PostgreSQL Global Development Group, s. f.-b). Es exactamente el cómputo "de fecha a fecha" del art. 5.1
    del Código Civil, en la redacción del Decreto 1836/1974 (Código Civil, 1889/1974), acordado en la clarificación. La PWA y el *worker* usan la misma regla,
    verificada con los casos compartidos de R8.
  - `anotado_fuera_plazo` se calcula con `fecha_registro`, la fecha en `Europe/Madrid` de `registrado_en` (el
    momento en que el agricultor lo guardó en el dispositivo), no con la de llegada al servidor: un tratamiento
    anotado a tiempo sin conexión no debe salir como fuera de plazo por sincronizarse tarde. La API rechaza un
    `registrado_en` futuro o anterior a la fecha del tratamiento.
  - `completado_fuera_plazo` se calcula igual con `fecha_completado`, que procede de `completado_en`.
  - Las dos marcas son columnas generadas, pero **no usan `fecha_vencimiento`**, porque PostgreSQL no permite que
    una columna generada use otra. Repiten la expresión del vencimiento a partir de `fecha`. `fecha_registro` y
    `fecha_completado` las calcula la API, porque pasar un `TIMESTAMPTZ` a fecha depende de la zona horaria y no
    es inmutable. Detalle en [data-model.md](data-model.md#tratamiento).
- **Motivo**: una sola regla, en la base de datos y probada con los mismos casos en las dos capas.
- **Alternativas**: calcular el vencimiento solo en la aplicación (dos implementaciones sin garantía en la base).

---

## Referencias

Caddy. (s. f.). *Automatic HTTPS*. Recuperado el 27 de octubre de 2026, de
https://caddyserver.com/docs/automatic-https

Can I use. (s. f.). *Background Sync API*. Recuperado el 27 de octubre de 2026, de
https://caniuse.com/background-sync

Código Civil. (1889/1974). Real Decreto de 24 de julio de 1889, por el que se publica el Código Civil
(art. 5.1 en la redacción del Decreto 1836/1974, de 31 de mayo, por el que se sanciona con fuerza de ley el texto
articulado del título preliminar del Código Civil, *BOE* de 9 de julio de 1974, BOE-A-1974-1083).
Texto consolidado: https://www.boe.es/buscar/act.php?id=BOE-A-1889-4763

Dexie. (s. f.). *Version.stores()*. Recuperado el 27 de octubre de 2026, de
https://dexie.org/docs/Version/Version.stores()

FastAPI. (s. f.-a). *Features*. Recuperado el 27 de octubre de 2026, de https://fastapi.tiangolo.com/features/

FastAPI. (s. f.-b). *OAuth2 with password (and hashing), Bearer with JWT tokens*. Recuperado el 27 de octubre de
2026, de https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/

FastAPI. (s. f.-c). *Background tasks*. Recuperado el 27 de octubre de 2026, de
https://fastapi.tiangolo.com/tutorial/background-tasks/

Fondo Español de Garantía Agraria [FEGA]. (2025a). *Anexo V. Definición de variables 3.11* (corrección de
errores de publicación, 20 de noviembre de 2025) [Hoja de cálculo]. Documentación técnica agrícola SIEX.
https://www.fega.gob.es/es/siex/documentacion-tecnica-agricola-siex/anexo-v-definicion-de-variables-311

Fondo Español de Garantía Agraria [FEGA]. (s. f.). *Documentación técnica agrícola SIEX*. Recuperado el 27 de
octubre de 2026, de https://www.fega.gob.es/es/siex/documentacion-tecnica-agricola-siex

Grafana Labs. (s. f.). *Thresholds*. k6 documentation. Recuperado el 27 de octubre de 2026, de
https://grafana.com/docs/k6/latest/using-k6/thresholds/

Mailpit. (s. f.-a). *Documentation*. Recuperado el 27 de octubre de 2026, de https://mailpit.axllent.org/docs/

Mailpit. (s. f.-b). *Docker*. Recuperado el 27 de octubre de 2026, de
https://mailpit.axllent.org/docs/install/docker/

MDN Web Docs. (s. f.-a). *Background Synchronization API*. Mozilla. Recuperado el 27 de octubre de 2026, de
https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API

MDN Web Docs. (s. f.-b). *StorageManager: persist() method*. Mozilla. Recuperado el 27 de octubre de 2026, de
https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist

MDN Web Docs. (s. f.-c). *412 Precondition Failed*. Mozilla. Recuperado el 27 de octubre de 2026, de
https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/412

National Institute of Standards and Technology [NIST]. (2025). *Digital identity guidelines: Authentication and
authenticator management* (NIST Special Publication 800-63B-4). https://pages.nist.gov/800-63-4/sp800-63b.html

Nielsen, J. (1993). *Response times: The 3 important limits*. Nielsen Norman Group.
https://www.nngroup.com/articles/response-times-3-important-limits/

OpenAPI TypeScript. (s. f.). *Introduction*. Recuperado el 27 de octubre de 2026, de
https://openapi-ts.dev/introduction

OpenJS Foundation. (s. f.). *Node.js releases*. Recuperado el 27 de octubre de 2026, de
https://nodejs.org/en/about/previous-releases

OWASP. (s. f.-a). *Authentication cheat sheet*. OWASP Cheat Sheet Series. Recuperado el 27 de octubre de 2026, de
https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html

OWASP. (s. f.-b). *Forgot password cheat sheet*. OWASP Cheat Sheet Series. Recuperado el 27 de octubre de 2026,
de https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html

OWASP. (s. f.-c). *Password storage cheat sheet*. OWASP Cheat Sheet Series. Recuperado el 27 de octubre de 2026,
de https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html

OWASP. (s. f.-d). *Session management cheat sheet*. OWASP Cheat Sheet Series. Recuperado el 27 de octubre de
2026, de https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html

pgvector. (s. f.-a). *pgvector: Open-source vector similarity search for Postgres* [Repositorio de GitHub].
Recuperado el 27 de octubre de 2026, de https://github.com/pgvector/pgvector

pgvector. (s. f.-b). *pgvector/pgvector* [Imagen de Docker]. Docker Hub. Recuperado el 27 de octubre de 2026, de
https://hub.docker.com/r/pgvector/pgvector

PostgreSQL Global Development Group. (s. f.-a). *Versioning policy*. Recuperado el 27 de octubre de 2026, de
https://www.postgresql.org/support/versioning/

PostgreSQL Global Development Group. (s. f.-b). *Date/time functions and operators*. PostgreSQL documentation.
Recuperado el 27 de octubre de 2026, de https://www.postgresql.org/docs/current/functions-datetime.html

Python Software Foundation. (s. f.). *Download Python*. Recuperado el 27 de octubre de 2026, de
https://www.python.org/downloads/

Vite PWA. (s. f.). *Getting started*. Recuperado el 27 de octubre de 2026, de
https://vite-pwa-org.netlify.app/guide/

WebKit. (2023). *Updates to storage policy*. https://webkit.org/blog/14403/updates-to-storage-policy/
