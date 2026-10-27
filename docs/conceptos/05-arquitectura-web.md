# Módulo 05 — Arquitectura web: PWA, API REST y base de datos

Guía de conceptos del TFG. Base para revisar el plan de la funcionalidad 001 (fase 4), el apartado 4.1
(Constitución y arquitectura) y la parte de tecnologías del capítulo 2. Fuentes consultadas el 2026-10-27;
referencias en APA al final.

> El stack ya está aprobado (tutoría del 2026-10-23 y constitución v1.0.0). Este módulo no lo vuelve a decidir:
> explica qué es cada pieza, cómo encajan y qué decisiones quedan abiertas para el plan.

## En una frase

El Cuaderno de Campo es una aplicación **cliente-servidor en tres capas**: una **PWA** (React + TypeScript) que el
agricultor instala en el móvil y que guarda los registros en el propio dispositivo cuando no hay cobertura; una
**API REST** (Python + FastAPI) que valida y aplica las reglas de negocio; y una base de datos **PostgreSQL** que
guarda los datos de la explotación y, con la extensión **pgvector**, los vectores del RAG. Las tres piezas se
levantan juntas en local con **Docker Compose**.

## Vista general

```
 Móvil del agricultor (navegador)                 Servidor (local, Docker Compose)
┌──────────────────────────────────┐            ┌────────────────────────────┐
│ PWA: React + TypeScript          │   HTTPS    │ API REST: FastAPI          │
│  · interfaz (formularios)        │  JSON      │  · validación (Pydantic)   │
│  · IndexedDB: datos y cola de    │ ─────────► │  · reglas (plazos, avisos) │
│    cambios pendientes            │ ◄───────── │  · OpenAPI automático      │
│  · service worker: caché y       │            └─────────────┬──────────────┘
│    reintento al volver la red    │                          │ SQL
└──────────────────────────────────┘            ┌─────────────▼──────────────┐
                                                │ PostgreSQL + pgvector      │
                                                │  · tratamientos, parcelas… │
                                                │  · fragmentos y vectores   │
                                                │    del corpus (002, RAG)   │
                                                └────────────────────────────┘
```

| Capa | Tecnología | Responsabilidad | Requisitos de la 001 que la tocan |
| --- | --- | --- | --- |
| Presentación | PWA, React + TypeScript | Formularios en el móvil, funcionamiento sin conexión, avisos | REQ-01 a REQ-10, REQ-06 |
| Lógica | API REST, FastAPI + Pydantic | Validar, aplicar reglas (superficie, plazos), historial | REQ-02, REQ-04, REQ-09, REQ-11 a REQ-13 |
| Datos | PostgreSQL (+ pgvector desde la 002) | Persistencia, integridad, conservación 3 años | REQ-13 a REQ-17 |
| Despliegue | Docker Compose | Levantar las tres capas igual en el portátil y en el pipeline | Constitución: restricciones técnicas |

## 1. Progressive Web App (PWA)

Una PWA es una aplicación hecha con tecnologías web que ofrece una experiencia parecida a la de una app nativa:
como una web, funciona en varios sistemas con un único código; como una app, **se instala** en el dispositivo,
**funciona sin conexión** y en segundo plano (MDN Web Docs, s. f.-d). Se apoya en tres piezas:

- **Manifiesto de la aplicación web:** fichero JSON con el nombre, los iconos y el modo de visualización. Es lo
  que permite instalarla y abrirla desde la pantalla de inicio como cualquier otra app (MDN Web Docs, s. f.-d).
- **Service worker:** script que el navegador ejecuta en un hilo aparte de la página. Intercepta las peticiones
  de red (evento `fetch`) y puede responder desde una caché local (MDN Web Docs, s. f.-c). Dos estrategias
  típicas:
  - *Cache first:* primero la caché, luego la red. Rápida, pero puede servir contenido antiguo. Adecuada para la
    "carcasa" de la app (HTML, JS, CSS, iconos).
  - *Network first:* primero la red, y la caché si falla. Adecuada para datos que cambian.
- **IndexedDB:** base de datos **transaccional** del navegador, organizada en almacenes de objetos con índices,
  asíncrona y disponible también dentro del service worker (MDN Web Docs, s. f.-b). Es donde la PWA guarda los
  tratamientos y la cola de cambios pendientes mientras no hay red. (`localStorage` solo sirve para datos
  pequeños.)

**Para qué en el TFG:** el principio V de la constitución y REQ-06 exigen registrar tratamientos sin cobertura,
algo habitual en el campo. Una web normal no lo permite; una app nativa sí, pero obliga a mantener dos códigos
(Android e iOS) y a publicar en tiendas.

### 1.1 Sincronización al recuperar la conexión

La **Background Sync API** permite que el service worker repita una tarea cuando vuelve la red, incluso con la
pestaña cerrada; si la tarea falla, el navegador la reintenta un número limitado de veces, y si se interrumpe
empieza **desde el principio**, por lo que la tarea debe poder repetirse sin efectos dobles (MDN Web Docs,
s. f.-c).

**Limitación importante:** esta API es de disponibilidad limitada (MDN Web Docs, s. f.-a). Funciona en Chrome,
Edge y Chrome para Android, pero **no en Safari ni en Safari para iOS**, ni en Firefox (Can I use, s. f.). Un
agricultor con iPhone no la tendría. Por eso la PWA no puede depender solo de ella:

- La librería **Workbox** (equipo de Chrome) guarda las peticiones fallidas en IndexedDB y, donde no hay
  Background Sync, las reenvía cada vez que el service worker arranca, es decir, cuando el usuario vuelve a abrir
  la app (Chrome for Developers, s. f.).
- Alternativa propia: una cola en IndexedDB que la app vacía al abrirse y al recibir el evento `online`.

Cualquiera de las dos cumple REQ-06 si la app se abre al menos una vez con conexión. La elección es del plan.

### 1.2 Conflictos y operaciones repetidas

Al trabajar sin conexión aparecen dos problemas que la spec 001 ya contempla:

1. **Reintentos:** si se pierde la respuesta del servidor, el cliente reenvía el mismo tratamiento. Para que no
   se duplique, la operación debe ser **idempotente**. Una técnica habitual es que el **cliente genere el
   identificador** del tratamiento (un UUID) al crearlo; el servidor, si ya lo tiene, no lo crea dos veces.
2. **Ediciones en dos dispositivos:** la spec exige no perder ninguna versión, guardar ambas en el historial y
   pedir al agricultor que elija la vigente (caso límite "Sincronización con conflicto"). Para detectarlo, cada
   tratamiento lleva una **versión**; si el cliente envía un cambio sobre una versión que ya no es la última, el
   servidor responde con conflicto en lugar de sobrescribir (*control de concurrencia optimista*).

Ambas técnicas encajan con REQ-11 a REQ-13, que ya piden un historial de cambios con motivo.

## 2. API REST

**REST** (*Representational State Transfer*) es el estilo arquitectónico que Fielding (2000) definió para la web
en su tesis doctoral. Lo caracteriza un conjunto de restricciones:

| Restricción | Qué significa | En el TFG |
| --- | --- | --- |
| Cliente-servidor | Interfaz y datos separados | La PWA y la API evolucionan por separado |
| Sin estado | Cada petición lleva todo lo necesario; el servidor no guarda la sesión entre peticiones | Encaja con un cliente que se conecta a ratos |
| Caché | Las respuestas indican si se pueden reutilizar | El service worker cachea lo que la API permite |
| Interfaz uniforme | Recursos identificados por URL y manipulados mediante representaciones (JSON) con mensajes autodescriptivos | `/tratamientos/{id}`, `/parcelas`… |
| Sistema en capas | El cliente no sabe si habla con el servidor final o con un intermediario | Permite añadir un proxy sin cambiar la PWA |
| Código bajo demanda (opcional) | El servidor puede enviar código al cliente | No se usa |

En la práctica, una API REST sobre HTTP usa:

- **Recursos** con URL estables: `/parcelas`, `/tratamientos`, `/tratamientos/{id}/historial`.
- **Métodos** con significado: `GET` consulta, `POST` crea, `PUT`/`PATCH` modifica, `DELETE` elimina. Como la spec
  pide **anular** (REQ-12) y no borrar, la anulación será una modificación con motivo, no un `DELETE`.
- **Códigos de estado:** `200`/`201` correcto, `400`/`422` datos no válidos, `404` no existe, `409` conflicto de
  versión.

### 2.1 OpenAPI y FastAPI

La **especificación OpenAPI** es un estándar para describir APIs HTTP independiente del lenguaje, que permite
entender un servicio sin leer su código (OpenAPI Initiative, 2026). En SDD encaja de forma natural: el plan de
Spec Kit genera **contratos de API**, y OpenAPI es el formato en que se escriben.

**FastAPI** es un framework web de Python construido sobre OpenAPI y JSON Schema (FastAPI, s. f.-a):

- Se declaran los datos con **anotaciones de tipo** de Python y modelos de **Pydantic**, que validan
  automáticamente cada petición (longitudes, rangos, tipos) y rechazan lo que no cumple.
- Genera la **documentación interactiva** (Swagger UI y ReDoc) a partir del propio código.
- Está construido sobre Starlette, que aporta el servidor asíncrono, CORS y tareas en segundo plano.

**Para qué en el TFG:** las reglas de la spec (REQ-02 campos obligatorios, REQ-04 superficie válida, unidades en
kg o l) se expresan como validaciones de Pydantic, y cada una se prueba con pytest citando su `REQ-xx`. Python es
además el ecosistema natural del RAG (funcionalidad 002).

**Validar dos veces:** la PWA valida para dar respuesta inmediata al agricultor, incluso sin conexión; la API
vuelve a validar porque es la única fuente fiable. La regla vive en la spec; el plan decide cómo evitar que las
dos validaciones diverjan (por ejemplo, generando los tipos de TypeScript desde el contrato OpenAPI).

## 3. Base de datos: PostgreSQL y pgvector

**PostgreSQL** es un sistema de gestión de bases de datos relacional de código abierto. La versión mayor más
reciente con soporte es la **18** (soporte hasta noviembre de 2030) (PostgreSQL Global Development Group, s. f.).

Una base relacional encaja con el cuaderno porque sus datos son muy estructurados y relacionados: un tratamiento
pertenece a una explotación, afecta a una o varias parcelas, usa uno o varios productos con su cantidad y lo
aplica una persona con un equipo (anexo III del RD 1311/2012). Conceptos que aparecerán en el plan:

- **Modelo de datos:** tablas (parcela, persona, equipo, producto, tratamiento) y relaciones mediante **claves
  foráneas**. Las relaciones "varios a varios" (un tratamiento con varios productos en mezcla, REQ-03) se
  resuelven con una tabla intermedia que guarda la cantidad de cada producto.
- **Restricciones:** `NOT NULL`, `CHECK` (superficie > 0) y claves foráneas hacen que la base rechace datos
  incoherentes aunque falle otra capa.
- **Bajas lógicas e historial:** REQ-12, REQ-13 y REQ-17 piden no borrar nada. Se suele resolver con un campo de
  estado (activo, anulado, de baja) y una tabla de versiones o de auditoría.
- **Transacciones (ACID):** un tratamiento con sus productos y parcelas se guarda entero o no se guarda.
- **Migraciones:** cada cambio del esquema se escribe como un script versionado. El tutorial de FastAPI usa
  **SQLModel** (sobre SQLAlchemy y Pydantic) y recomienda **Alembic** para las migraciones (FastAPI, s. f.-b).
  Encaja con SDD: un cambio de requisito que afecta a los datos deja su migración en el mismo commit.

### 3.1 pgvector (desde la funcionalidad 002)

**pgvector** es una extensión de código abierto que añade a PostgreSQL la búsqueda por similitud de vectores,
guardándolos junto al resto de datos con transacciones ACID y `JOIN` (pgvector, s. f.):

- Distancias: euclídea (`<->`), producto interno negativo (`<#>`) y **coseno** (`<=>`), entre otras.
- Por defecto hace **búsqueda exacta** (*recall* perfecto). Con un índice aproximado se gana velocidad a cambio de
  algo de precisión: **HNSW** (mejor relación velocidad-precisión, más memoria) o **IVFFlat** (más rápido de
  construir, peor en consultas).

**Por qué una sola base de datos:** la decisión de la tutoría evita mantener una base vectorial aparte; el corpus
del RAG (unos pocos reales decretos y etiquetas) es pequeño. En la 001 **no se usa**, pero conviene que la
imagen de Docker la incluya desde el principio para no cambiar de imagen en la 002. Los detalles (embeddings,
fragmentación) son del módulo 06.

## 4. Despliegue local con Docker Compose

**Docker** empaqueta cada pieza con sus dependencias en un **contenedor**. **Docker Compose** describe en un
fichero `compose.yaml` una aplicación de varios contenedores: **servicios** (cada uno con su imagen y
configuración), **redes** entre ellos y **volúmenes** para los datos persistentes (Docker, s. f.).

Para la 001 serían tres servicios: `web` (la PWA), `api` (FastAPI) y `db` (PostgreSQL con pgvector), con un
volumen para que los datos sobrevivan a un reinicio. El mismo fichero sirve para la demo y para las pruebas del
pipeline de GitHub Actions.

**Detalle práctico:** los service workers solo funcionan en un **contexto seguro**: HTTPS, o `http://localhost`
para el desarrollo (MDN Web Docs, s. f.-e). En el portátil basta `localhost`, pero para probar la PWA desde un móvil real en la demo hará
falta HTTPS en la red local. Es una decisión del plan.

## 5. Alternativas y por qué se descartaron

| Alternativa | Ventaja | Por qué no (tutoría y constitución) |
| --- | --- | --- |
| App nativa (Android/iOS) | Mejor acceso al dispositivo y sincronización en segundo plano | Dos códigos y publicación en tiendas; demasiado para un TFG |
| Web clásica sin modo sin conexión | Más simple | Incumple el principio V y REQ-06 |
| Django o Flask | Django trae panel de administración y ORM | FastAPI genera OpenAPI y valida con tipos, lo que encaja con los contratos de SDD |
| MongoDB u otra base documental | Esquema flexible | Los datos del cuaderno son relacionales y necesitan integridad |
| Base vectorial aparte (Pinecone, Qdrant…) | Optimizada para vectores | Una segunda base que mantener; el corpus es pequeño |

## 6. Implicaciones para el plan de la 001 (qué revisar en la fase 4)

Cuando `/speckit-plan` genere el `plan.md`, conviene comprobar que responde a estas preguntas:

1. **Estructura del repositorio:** carpetas `frontend/` y `backend/` (o similar), y dónde viven el `compose.yaml`
   y las pruebas.
2. **Sin conexión:** qué se guarda en IndexedDB, cómo se forma la cola de cambios y qué hace en iOS, sin
   Background Sync (§ 1.1).
3. **Identificadores e idempotencia:** UUID generados en el cliente y reintentos seguros (§ 1.2).
4. **Conflictos:** cómo se detectan (versión) y cómo se guardan ambas versiones en el historial (§ 1.2).
5. **Modelo de datos:** tablas, claves foráneas, restricciones `CHECK`, bajas lógicas e historial para REQ-11 a
   REQ-17, con nombres alineados con el anexo V del SIEX.
6. **Contrato de API:** recursos, métodos y códigos de estado en OpenAPI.
7. **Validación compartida:** cómo se evita que las reglas de la PWA y de la API diverjan (§ 2.1).
8. **Usuarios:** la spec no pide autenticación. Hay que aclarar si la demo es para un único agricultor o hace falta
   inicio de sesión (principio VI).
9. **Complejidad justificada:** todo lo que vaya más allá de lo anterior debe justificarse (principio VII).

## 7. Pendientes de verificar

1. Herramienta de construcción del frontend (por ejemplo, Vite con un plugin de PWA): la decide el plan con su
   documentación oficial.
2. Cómo se genera el cliente de TypeScript desde el contrato OpenAPI y si merece la pena en la 001.
3. Cómo servir HTTPS en la red local para probar la PWA desde un móvil real en la demo.
4. Comportamiento de las PWA instaladas en iOS (almacenamiento disponible y cuándo se borra): consultar la
   documentación de WebKit antes de la demo.

## Preguntas de autocomprobación

1. ¿Qué tres piezas convierten una web en una PWA y qué hace cada una?
2. ¿Por qué la sincronización sin conexión no puede depender solo de la Background Sync API?
3. ¿Qué es una operación idempotente y por qué la necesita un cliente que se conecta a ratos?
4. ¿Qué restricción de REST hace que el servidor no guarde la sesión entre peticiones y por qué ayuda aquí?
5. ¿Por qué anular un tratamiento no es un `DELETE`?
6. ¿Qué ventaja tiene guardar los vectores del RAG en la misma base de datos que los tratamientos, y qué se
   pierde?

## Referencias

Can I use. (s. f.). *Background Sync API*. Recuperado el 27 de octubre de 2026, de https://caniuse.com/background-sync

Chrome for Developers. (s. f.). *workbox-background-sync*. Recuperado el 27 de octubre de 2026, de
https://developer.chrome.com/docs/workbox/modules/workbox-background-sync

Docker. (s. f.). *How Compose works*. Docker Docs. Recuperado el 27 de octubre de 2026, de
https://docs.docker.com/compose/intro/compose-application-model/

FastAPI. (s. f.-a). *Features*. Recuperado el 27 de octubre de 2026, de https://fastapi.tiangolo.com/features/

FastAPI. (s. f.-b). *SQL (relational) databases*. Recuperado el 27 de octubre de 2026, de
https://fastapi.tiangolo.com/tutorial/sql-databases/

Fielding, R. T. (2000). *Architectural styles and the design of network-based software architectures* [Tesis
doctoral, University of California, Irvine]. https://ics.uci.edu/~fielding/pubs/dissertation/top.htm

MDN Web Docs. (s. f.-a). *Background Synchronization API*. Mozilla. Recuperado el 27 de octubre de 2026, de
https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API

MDN Web Docs. (s. f.-b). *IndexedDB API*. Mozilla. Recuperado el 27 de octubre de 2026, de
https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API

MDN Web Docs. (s. f.-c). *Offline and background operation*. Mozilla. Recuperado el 27 de octubre de 2026, de
https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation

MDN Web Docs. (s. f.-d). *Progressive web apps*. Mozilla. Recuperado el 27 de octubre de 2026, de
https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps

MDN Web Docs. (s. f.-e). *Service Worker API*. Mozilla. Recuperado el 27 de octubre de 2026, de
https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API

OpenAPI Initiative. (2026). *OpenAPI Specification* (versión 3.2.1). https://spec.openapis.org/oas/latest.html

pgvector. (s. f.). *pgvector: Open-source vector similarity search for Postgres* [Repositorio de GitHub].
Recuperado el 27 de octubre de 2026, de https://github.com/pgvector/pgvector

PostgreSQL Global Development Group. (s. f.). *Versioning policy*. Recuperado el 27 de octubre de 2026, de
https://www.postgresql.org/support/versioning/
