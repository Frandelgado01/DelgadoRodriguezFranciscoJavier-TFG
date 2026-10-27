# Guía de validación: Registro de tratamientos fitosanitarios

**Funcionalidad**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Contrato**:
[contracts/openapi.yaml](contracts/openapi.yaml) · **Datos**: [data-model.md](data-model.md)

Cómo levantar la funcionalidad en local y comprobar, de principio a fin, que cumple la especificación. Los
comandos exactos se fijan en las tareas de implementación; aquí se describen los pasos y los resultados
esperados.

## Requisitos previos

- Docker con Docker Compose.
- Node.js 24 y `uv` (Python 3.14) solo para ejecutar las pruebas fuera de los contenedores.
- Copiar `.env.example` a `.env` (credenciales de la base de datos, URL pública de la app, SMTP apuntando a
  Mailpit). `.env` no se versiona.

## Levantar el entorno

```text
docker compose up --build
```

| Servicio | Qué es | Dónde |
| --- | --- | --- |
| `web` | Caddy: PWA y proxy de `/api` con HTTPS local | https://localhost |
| `api` | FastAPI | (solo a través de `web`); documentación en https://localhost/api/docs |
| `worker` | Revisión de plazos cada hora | sin puerto |
| `db` | PostgreSQL 18 + pgvector | volumen persistente |
| `mailpit` | Servidor de correo de pruebas | http://localhost:8025 |

La primera vez, el navegador del portátil tiene que confiar en la autoridad local de Caddy (research R11).

## Pruebas automáticas

| Qué | Dónde | Verifica |
| --- | --- | --- |
| Unitarias e integración de la API | `backend/tests` (pytest, PostgreSQL real) | Reglas, idempotencia, conflictos, historial, borrado bloqueado, avisos por correo |
| Contrato | `backend/tests/contract` | Que la API implementa todas las rutas y códigos de [openapi.yaml](contracts/openapi.yaml) |
| Unitarias de la PWA | `frontend/tests` (Vitest) | Reglas, cola sin conexión y cálculo de avisos |
| Casos compartidos | `compartido/casos-validacion.json` | Las mismas reglas dan el mismo resultado en Python y en TypeScript (research R8) |
| E2E | `e2e/` (Playwright, contra Compose) | Escenarios de las historias 1–4, también sin red |
| Rendimiento | `rendimiento/` (k6, contra Compose) | Umbrales de research R12 |

Todas las pruebas indican en su nombre o docstring el `REQ-xx` que verifican.

## Escenarios de validación manual (demo)

Cada escenario corresponde a uno de aceptación de la spec. Datos de ejemplo: parcela "Viña Grande", *Vitis
vinifera*, Airén, 4,2 ha.

1. **Cuenta (REQ-20 a REQ-22)**: crear una cuenta con correo y una frase de 15 caracteres o más → se entra en la
   app. Cerrar sesión, pedir "He olvidado mi contraseña" → en Mailpit aparece un correo con el enlace; usarlo →
   la contraseña cambia, el enlace ya no vale una segunda vez y hay que iniciar sesión de nuevo.
   **Límite de intentos (REQ-22)**: fallar la contraseña 5 veces seguidas → el sexto intento, aunque sea con la
   contraseña correcta, muestra "Has fallado la contraseña 5 veces. Espera 15 minutos o recupera tu contraseña."
   La recuperación por correo sigue funcionando y, tras restablecer, se entra enseguida. Repetir con un correo
   sin cuenta → el mensaje es el mismo.
2. **Datos de la explotación (historia 4)**: dar de alta la parcela (aprovechamiento cultivo, leñoso, con especie
   y variedad) con su referencia SIGPAC, un aplicador con número de carné y un equipo con número ROMA → la parcela
   recibe el número de orden 1 y todo aparece en las listas del formulario de tratamiento. Dar de alta otra
   parcela, darla de baja y dar de alta una tercera → recibe el 3 (los números no se reutilizan).
3. **Registrar (historia 1, escenarios 1–4)**: registrar con fecha de hoy contra mildiu, 3,5 ha y 2 kg de un
   producto nuevo dado de alta desde el propio formulario → aparece en el cuaderno con todos los datos. Probar
   5 ha (se rechaza indicando el máximo de 4,2 ha) y guardar sin producto (indica qué falta). Registrar una
   mezcla de dos productos en dos parcelas.
4. **Sin conexión (historia 1, escenario 5; SC-003)**: en las herramientas del navegador, poner la red sin
   conexión, registrar 3 tratamientos → se ven como "pendiente de sincronizar" y el contador de pendientes
   marca 3. Recuperar la red → se sincronizan y el contador vuelve a 0. Comprobar en la API que no hay
   duplicados.
5. **Plazo (historia 2)**: registrar un tratamiento sin eficacia con fecha de hace 25 días → "pendiente de
   completar", vence dentro de los 7 días del aviso y aparece el aviso en la app con los días que quedan. Ejecutar la revisión de plazos → Mailpit recibe un
   correo; ejecutarla otra vez → no llega un segundo. Añadir la eficacia "buena" → pasa a "completo" y el aviso
   desaparece. Registrar otro con fecha de hace 40 días → "anotado fuera de plazo".
6. **Consulta y corrección (historia 3)**: filtrar por parcela y periodo → solo esos tratamientos, ordenados por
   fecha. Corregir la cantidad indicando un motivo → el historial muestra el valor anterior, el nuevo, la fecha
   y el motivo. Anular otro → desaparece del cuaderno vigente y aparece con el filtro "anulado".
7. **Conflicto (caso límite)**: con dos navegadores con la misma cuenta y sin red, corregir el mismo tratamiento
   en ambos y recuperar la red → el segundo en llegar queda "en conflicto" y la app muestra las dos versiones.
   Al elegir una, el historial conserva las dos.
8. **Conservación (REQ-13)**: intentar borrar un tratamiento directamente en la base de datos
   (`DELETE FROM tratamiento ...`) → PostgreSQL lo rechaza.

## Resultado esperado para cerrar la fase 7

- Todas las pruebas en verde en el pipeline, incluidos los umbrales de k6.
- Cada `REQ-01` a `REQ-17` y `REQ-20` a `REQ-22` con al menos una prueba que lo cita y pasa.
- `/speckit-converge` sin tareas pendientes.
