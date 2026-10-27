# Especificación de la funcionalidad: Registro de tratamientos fitosanitarios

**Rama**: `001-registro-tratamientos`

**Creada**: 2026-10-26

**Estado**: Borrador

**Entrada**: descripción del alumno: "Registro de tratamientos fitosanitarios según
docs/conceptos/04-normativa-cuaderno-de-campo.md"

**Base normativa**: Real Decreto 1311/2012, art. 16 y anexo III, parte I, secciones A y B (texto consolidado
de 20/11/2025); Real Decreto 1054/2022, art. 9 y anexo II; Código Civil, art. 5.1 (cómputo del plazo de un
mes). Resumen en `docs/conceptos/04-normativa-cuaderno-de-campo.md`, apartados 1 y 2.

## Contexto

Toda explotación agraria debe mantener actualizado un registro de los tratamientos fitosanitarios que realiza,
anotando cada uno en el plazo de un mes, y conservarlo al menos tres años (RD 1311/2012, art. 16). Desde el
1 de enero de 2027 ese registro debe llevarse en formato electrónico. Esta funcionalidad permite al agricultor
cumplir esa obligación desde el móvil, en el campo y aunque no tenga cobertura.

## Clarifications

### Session 2026-10-27

- Q: ¿Cómo accede el agricultor a su cuaderno: con una cuenta propia protegida por contraseña o sin
  identificarse? → A: Cuenta con correo y contraseña, con recuperación de contraseña por correo electrónico
  (REQ-20, REQ-21).
- Q: ¿Por qué medio avisa el sistema de que vence el plazo de un mes? → A: Dentro de la aplicación y, además,
  por correo electrónico al agricultor (REQ-08).
- Q: ¿Cómo anota el agricultor la valoración de la eficacia: escala cerrada o texto libre? → A: Escala cerrada
  (buena, regular, mala); los matices van en observaciones (REQ-01 j).
- Q: Si la eficacia se añade cuando ya ha vencido el plazo de un mes, ¿cómo queda el tratamiento? → A: Pasa a
  "completo" y queda marcado como "completado fuera de plazo", con la fecha en que se completó (REQ-07).
- Q: ¿Cómo se calcula la fecha en que vence "un mes" desde el tratamiento? → A: De fecha a fecha; si en el mes
  del vencimiento no hay día equivalente, el último día de ese mes (Código Civil, art. 5.1) (REQ-07, REQ-09).

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1 — Registrar un tratamiento (Prioridad: P1)

El agricultor acaba de tratar una o varias parcelas y quiere anotarlo en el cuaderno antes de que se le olvide.
Elige la fecha, las parcelas tratadas, el problema que quería controlar, quién aplicó el producto, el producto o
productos usados con su cantidad y el equipo de aplicación. El sistema le propone el cultivo de cada parcela y
le avisa si falta algún dato obligatorio. Al guardar, el tratamiento queda en el cuaderno.

**Por qué esta prioridad**: es la obligación legal que justifica el cuaderno (RD 1311/2012, art. 16). Sin ella
no hay producto mínimo viable.

**Prueba independiente**: con una explotación que ya tenga una parcela, un aplicador y un equipo dados de alta,
registrar un tratamiento y comprobar que aparece en el cuaderno con todos los campos de la sección B del
anexo III.

**Escenarios de aceptación**:

1. **Dado** una parcela de viñedo (especie *Vitis vinifera*, variedad Airén, 4,2 ha), un aplicador y un equipo
   dados de alta, **cuando** el agricultor registra un tratamiento con fecha de hoy contra mildiu en esa parcela,
   con 3,5 ha tratadas, 2 kg de un producto con su número de registro y el equipo indicado, **entonces** el
   tratamiento queda guardado y aparece en el cuaderno con todos los datos introducidos.
2. **Dado** el formulario de registro, **cuando** el agricultor intenta guardar sin indicar el producto o la
   cantidad, **entonces** el sistema no guarda y señala, en lenguaje llano, qué dato falta.
3. **Dado** una parcela con superficie de 4,2 ha, **cuando** el agricultor indica una superficie tratada de
   5 ha, **entonces** el sistema rechaza el dato y le indica la superficie máxima de la parcela.
4. **Dado** un tratamiento con dos productos en mezcla aplicados sobre dos parcelas, **cuando** se guarda,
   **entonces** el cuaderno muestra cada producto con su cantidad y cada parcela con su superficie tratada.
5. **Dado** que el agricultor no tiene conexión, **cuando** registra un tratamiento, **entonces** el registro
   se guarda en el dispositivo, se marca como pendiente de sincronizar y se sincroniza sin pérdida de datos al
   recuperar la conexión.

---

### Historia de usuario 2 — Completar la eficacia y respetar el plazo de un mes (Prioridad: P2)

La valoración de la eficacia del tratamiento solo se conoce días después de aplicarlo. El agricultor puede
guardar el tratamiento sin ella y completarla más tarde. Mientras tanto el tratamiento figura como "pendiente de
completar", y el sistema le avisa antes de que venza el mes que la norma da para anotarlo.

**Por qué esta prioridad**: el plazo de un mes es la obligación que más fácilmente se incumple, y el aviso es una
de las propuestas de valor del TFG frente al cuaderno en papel.

**Prueba independiente**: guardar un tratamiento sin eficacia y comprobar que aparece como pendiente, que genera
un aviso al acercarse el vencimiento y que deja de estar pendiente al completar la eficacia.

**Escenarios de aceptación**:

1. **Dado** un tratamiento guardado sin valoración de eficacia, **cuando** el agricultor consulta el cuaderno,
   **entonces** el tratamiento aparece como "pendiente de completar" con la fecha en que vence el plazo.
2. **Dado** un tratamiento pendiente cuya fecha de vencimiento está a 7 días o menos, **cuando** el agricultor
   abre la aplicación, **entonces** ve un aviso en lenguaje llano con el tratamiento, el dato que falta y los
   días que quedan.
3. **Dado** un tratamiento pendiente y sincronizado que entra en los 7 días previos al vencimiento, **cuando**
   pasa ese día, **entonces** el agricultor recibe un único correo con el mismo contenido que el aviso; y si el
   plazo vence sin completarlo, recibe un segundo y último correo.
4. **Dado** un tratamiento pendiente, **cuando** el agricultor añade la valoración de eficacia, **entonces** el
   tratamiento pasa a "completo" y el aviso desaparece; si el plazo ya había vencido, queda además marcado como
   "completado fuera de plazo", con la fecha en que se completó.
5. **Dado** un tratamiento con fecha de hace más de un mes, **cuando** el agricultor lo registra por primera vez,
   **entonces** el sistema lo guarda, le informa de que se ha anotado fuera del plazo de un mes y lo marca como
   "anotado fuera de plazo".

---

### Historia de usuario 3 — Consultar, corregir y conservar el registro (Prioridad: P2)

El agricultor consulta sus tratamientos por periodo, parcela o producto (por ejemplo, ante una inspección o
para preparar la solicitud de la PAC) y corrige los errores que detecte. Las correcciones no borran el dato
original: el registro conserva qué se cambió, cuándo y por qué durante al menos tres años.

**Por qué esta prioridad**: la norma obliga a conservar el registro tres años y a tenerlo disponible; un
registro que se puede alterar sin rastro no sirve como prueba ante una inspección.

**Prueba independiente**: registrar varios tratamientos, filtrarlos por parcela y periodo, corregir uno y
anular otro, y comprobar que ambos cambios quedan en el historial.

**Escenarios de aceptación**:

1. **Dado** tratamientos en varias parcelas y meses, **cuando** el agricultor filtra por una parcela y un
   periodo, **entonces** ve solo los tratamientos de esa parcela en ese periodo, ordenados por fecha.
2. **Dado** un tratamiento guardado, **cuando** el agricultor corrige la cantidad de producto, **entonces** el
   tratamiento muestra el valor nuevo y su historial conserva el valor anterior, la fecha del cambio y el motivo.
3. **Dado** un tratamiento registrado por error, **cuando** el agricultor lo anula indicando el motivo,
   **entonces** deja de aparecer en el cuaderno vigente pero sigue disponible, marcado como anulado, en el
   historial.
4. **Dado** un tratamiento con menos de tres años de antigüedad, **cuando** alguien intenta eliminarlo de forma
   definitiva, **entonces** el sistema no lo permite.

---

### Historia de usuario 4 — Mantener los datos de la explotación que usa el registro (Prioridad: P1)

Para no escribir los mismos datos en cada tratamiento, el agricultor da de alta una vez sus parcelas, las
personas que aplican o asesoran y sus equipos de aplicación, y luego los elige de una lista al registrar.
Esta historia cubre solo los datos que usa el tratamiento; el resto de la sección A se especificará con la
fertilización.

**Por qué esta prioridad**: sin parcelas, aplicadores y equipos no se puede registrar un tratamiento
(RD 1311/2012, anexo III, parte I, sección A).

**Prueba independiente**: dar de alta una parcela con su referencia SIGPAC, un aplicador y un equipo, y
comprobar que aparecen como opciones al registrar un tratamiento.

**Escenarios de aceptación**:

1. **Dado** una explotación sin parcelas, **cuando** el agricultor da de alta una parcela con su referencia
   SIGPAC, superficie, uso SIGPAC y uso del suelo, cultivo (especie y variedad), sistema de cultivo (secano, o
   regadío con su sistema de riego; aire libre, o protegido con su tipo de protección) y, en su caso, el sistema
   de certificación y el marco de control de plagas, **entonces** la parcela aparece en la lista de parcelas al
   registrar un tratamiento.
2. **Dado** un aplicador dado de alta con su nombre y su número de carné de usuario profesional, **cuando** el
   agricultor registra un tratamiento, **entonces** puede elegirlo como aplicador.
3. **Dado** un equipo de aplicación con número ROMA, **cuando** se elige en un tratamiento, **entonces** el
   número ROMA queda asociado al tratamiento.
4. **Dado** una parcela con tratamientos registrados, **cuando** el agricultor la da de baja, **entonces** deja
   de ofrecerse para tratamientos nuevos y los tratamientos anteriores la siguen mostrando.

---

### Casos límite

- **Tratamiento de varios días**: un tratamiento que se prolonga varios días se registra como un tratamiento por
  día, porque la fecha es un dato único del registro.
- **Fecha futura**: el sistema no admite fechas posteriores a hoy; los tratamientos planificados quedan fuera de
  alcance.
- **Producto no dado de alta**: el agricultor puede introducir un producto nuevo (nombre comercial y número de
  registro) desde el propio registro, sin salir de él.
- **Parcela con cultivo cambiado**: si el cultivo de la parcela cambia, los tratamientos anteriores conservan el
  cultivo que tenían cuando se registraron.
- **Semilla tratada**: en cultivos herbáceos sembrados con semilla tratada, el agricultor puede indicar el
  producto con que se trató la semilla.
- **Sincronización con conflicto**: si un tratamiento se modificó sin conexión en un dispositivo y también en
  otro, el sistema no pierde ninguna versión: conserva ambas en el historial y pide al agricultor que elija la
  vigente.
- **Plazo que acaba en un mes más corto**: un tratamiento del 31 de enero vence el 28 de febrero (29 en año
  bisiesto); uno del 30 de marzo vence el 30 de abril (REQ-07).
- **Aviso por correo de un tratamiento sin sincronizar**: el servidor solo conoce los tratamientos
  sincronizados; uno que siga solo en el dispositivo no genera correo, pero sí el aviso dentro de la aplicación.
  Si se sincroniza ya dentro de los 7 días o vencido, el correo correspondiente se envía tras la sincronización.
- **Equipo sin número ROMA**: se admite, porque el ROMA solo se exige "si procede" (anexo III, sección B, h).
- **Cantidad con unidad incoherente**: la cantidad se expresa en kg o en l; el sistema no admite otras unidades
  ni cantidades nulas o negativas.

## Requisitos *(obligatorio)*

Cada requisito cita la norma de la que deriva (principio IV de la constitución). Los requisitos marcados como
"apoyo" no derivan de una norma, sino de la constitución o de la usabilidad.

### Requisitos funcionales

**Registro del tratamiento** (historia 1)

- **REQ-01**: El sistema MUST permitir registrar un tratamiento fitosanitario con los datos de la sección B de
  la parte I del anexo III del RD 1311/2012: (a) fecha; (b) parcela o parcelas tratadas; (c) plaga o problema a
  controlar; (d) aplicador y, en su caso, asesor; (e) cultivo, con especie y variedad, y, en herbáceos con
  semilla tratada, el producto de tratamiento de la semilla; (f) superficie tratada en hectáreas; (g) producto
  fitosanitario, con nombre comercial y número de registro; (h) equipo de aplicación, con su número ROMA si
  procede; (i) cantidad de producto en kg o l; (j) valoración de la eficacia; (k) observaciones.
  La valoración de la eficacia se elige de una escala cerrada (buena, regular, mala); los matices se escriben en
  observaciones, que es texto libre. *Fuente: RD 1311/2012, art. 16 y anexo III, parte I, sección B; escala de
  la eficacia: apoyo, a contrastar en el plan con los catálogos del SIEX (anexo VII).*
- **REQ-02**: El sistema MUST exigir para guardar un tratamiento los datos a, b, c, d (aplicador), e (especie y
  variedad), f, g, h (equipo) e i. El asesor, el número ROMA, el producto de la semilla, la eficacia y las
  observaciones son opcionales al guardar. *Fuente: RD 1311/2012, anexo III, parte I, sección B ("en su caso",
  "si procede").*
- **REQ-03**: Un tratamiento MUST poder incluir varios productos en mezcla, cada uno con su cantidad, y varias
  parcelas, cada una con su superficie tratada. *Apoyo: práctica habitual del caldo de mezcla.*
- **REQ-04**: El sistema MUST rechazar una superficie tratada nula, negativa o mayor que la superficie de la
  parcela; una cantidad de producto nula o negativa; y una fecha posterior al día actual. Cada rechazo MUST
  explicar en lenguaje llano qué dato es incorrecto y por qué. *Apoyo: constitución, principio V.*
- **REQ-05**: Al elegir una parcela, el sistema MUST proponer su cultivo actual (especie y variedad), que el
  agricultor puede cambiar. El tratamiento MUST conservar el cultivo con que se registró aunque el de la parcela
  cambie después. *Fuente: RD 1311/2012, anexo III, parte I, secciones A y B (e).*
- **REQ-06**: El registro de tratamientos MUST funcionar sin conexión: los tratamientos registrados o
  modificados sin conexión se guardan en el dispositivo, se identifican como pendientes de sincronizar y se
  sincronizan sin pérdida al recuperar la conexión. *Apoyo: constitución, principio V.*

**Plazo de un mes y eficacia** (historia 2)

- **REQ-07**: Un tratamiento al que le falte la valoración de la eficacia MUST figurar como "pendiente de
  completar", con su fecha de vencimiento: un mes desde la fecha del tratamiento, contado de fecha a fecha
  (15 de marzo → 15 de abril); si en el mes del vencimiento no hay día equivalente, vence el último día de ese
  mes (31 de enero → 28 o 29 de febrero). El mismo cómputo se aplica a REQ-08 y REQ-09 (Código Civil, art. 5.1).
  Al completarla pasa a
  "completo"; si se completa después del vencimiento, queda además marcado como "completado fuera de plazo",
  con la fecha en que se completó. *Fuente: RD 1311/2012, art. 16 (plazo de un mes) y anexo III, sección B (j).*
  *Interpretación:* el art. 16 da un mes para volcar el registro completo. El campo j no lleva "en su caso" ni
  "si procede", así que es obligatorio; como la eficacia solo se conoce días después, se admite guardarlo sin él,
  pero el registro no está completo hasta que se añade, y debe completarse dentro del mes.
- **REQ-08**: El sistema MUST avisar al agricultor, en lenguaje llano, de cada tratamiento pendiente de completar
  cuyo vencimiento esté a 7 días o menos, indicando el tratamiento, el dato que falta y los días restantes; y de
  cada tratamiento vencido sin completar. El aviso MUST mostrarse dentro de la aplicación y, además, enviarse por
  correo electrónico a la dirección de la cuenta: un correo cuando el tratamiento entra en los 7 días previos al
  vencimiento y otro cuando vence sin completar, sin repetirlos. *Fuente: RD 1311/2012, art. 16; antelación de
  7 días y canal de correo: apoyo.*
- **REQ-09**: Si la fecha de un tratamiento es anterior en más de un mes al día en que se registra, el sistema
  MUST guardarlo, informar al agricultor de que se anota fuera del plazo de un mes y marcarlo como "anotado
  fuera de plazo". *Fuente: RD 1311/2012, art. 16.*

**Consulta, corrección y conservación** (historia 3)

- **REQ-10**: El agricultor MUST poder consultar sus tratamientos ordenados por fecha y filtrarlos por periodo,
  parcela, producto y estado (completo, pendiente de completar, anotado fuera de plazo, completado fuera de
  plazo, anulado). *Fuente:
  RD 1311/2012, art. 16 (registro actualizado y disponible).*
- **REQ-11**: El agricultor MUST poder corregir cualquier dato de un tratamiento indicando el motivo. El sistema
  MUST conservar en un historial el valor anterior, el nuevo, la fecha del cambio y el motivo. *Apoyo:
  trazabilidad del registro ante una inspección.*
- **REQ-12**: El agricultor MUST poder anular un tratamiento registrado por error indicando el motivo. Un
  tratamiento anulado deja de contar en el cuaderno vigente, pero se conserva y se puede consultar. *Apoyo:
  trazabilidad del registro.*
- **REQ-13**: El sistema MUST conservar cada tratamiento, con su historial, al menos 3 años desde su fecha, y
  MUST impedir su eliminación definitiva antes de ese plazo. *Fuente: RD 1311/2012, art. 16.*

**Datos de la explotación** (historia 4)

- **REQ-14**: El agricultor MUST poder dar de alta, modificar y dar de baja las parcelas de su explotación con:
  (a) número o nombre; (b) referencia SIGPAC; (c) superficie (ha); (d) uso SIGPAC y uso del suelo (forestal,
  pasto o cultivo), con especie y variedad en cultivos leñosos y cultivo actual en los demás; (e) sistema de
  cultivo: secano, o regadío con su sistema de riego; y aire libre, o protegido con su tipo de protección; (f) si
  la producción está acogida a un sistema de certificación, cuál, y el marco de control de plagas que aplica
  (art. 10). *Fuente: RD 1311/2012, anexo III, parte I, sección A.2, apartados a–f.*
- **REQ-15**: El agricultor MUST poder dar de alta, modificar y dar de baja a las personas que aplican o asesoran
  (nombre y número de carné de usuario profesional o de asesor) y los equipos de aplicación (descripción, fecha
  de adquisición o de la última inspección, y número ROMA o referencia censal si procede). No se piden el NIF ni
  otros datos personales de aplicadores y asesores, porque la norma solo exige el NIF del titular. *Fuente:
  RD 1311/2012, anexo III, parte I, secciones A.1 (c, h) y B (d); minimización de datos: constitución,
  principio VI.*
- **REQ-16**: El agricultor MUST poder dar de alta un producto fitosanitario (nombre comercial y número de
  registro) desde el propio registro del tratamiento, y reutilizarlo después. *Fuente: RD 1311/2012, anexo III,
  sección B (g).*
- **REQ-17**: Dar de baja una parcela, persona, equipo o producto MUST impedir su uso en tratamientos nuevos sin
  alterar los tratamientos ya registrados. *Apoyo: trazabilidad del registro.*

**Acceso al cuaderno** (transversal)

- **REQ-20**: El agricultor MUST crear una cuenta con su correo electrónico y una contraseña, e identificarse
  con ellos para acceder a su cuaderno. Solo el titular de la cuenta MUST poder ver o modificar los datos de su
  explotación. La sesión MUST conservarse en el dispositivo para poder registrar sin conexión (REQ-06) hasta que
  el agricultor la cierre. *Apoyo: constitución, principios V y VI (RGPD).*
- **REQ-21**: El agricultor que olvide su contraseña MUST poder restablecerla mediante un enlace enviado a su
  correo electrónico. El correo es el único dato personal que se pide para la cuenta. *Apoyo: constitución,
  principio VI (minimización de datos).*

(REQ-18 y REQ-19 se reservaron para el registro en lenguaje natural, que pasó a la funcionalidad 006.)

### Entidades clave

- **Cuenta**: correo electrónico y contraseña del agricultor titular; da acceso a una única explotación.
- **Explotación**: la del agricultor titular. Agrupa todos los datos de esta funcionalidad.
- **Parcela**: unidad de terreno de la explotación. Número o nombre, referencia SIGPAC, superficie, uso SIGPAC y
  uso del suelo, cultivo actual (especie y variedad), secano o regadío (con sistema de riego), aire libre o
  protegido (con tipo de protección), sistema de certificación y marco de control de plagas, y estado (activa o
  de baja).
- **Persona**: aplicador o asesor. Nombre, tipo y número de carné, estado.
- **Equipo de aplicación**: descripción, fecha de adquisición o de la última inspección, número ROMA o
  referencia censal (si procede), estado.
- **Producto fitosanitario**: nombre comercial y número de registro.
- **Tratamiento**: fecha, plaga o problema, aplicador, asesor (opcional), equipo, valoración de la eficacia
  (buena, regular o mala), observaciones (texto libre), estado (completo, pendiente de completar, anulado),
  marcas de "anotado fuera de plazo" y "completado fuera de plazo", fecha en que se completó, fecha de
  vencimiento del plazo y estado de sincronización.
- **Parcela tratada**: une un tratamiento con una parcela; superficie tratada y cultivo (especie, variedad y
  producto de la semilla, si procede) en el momento del tratamiento.
- **Producto aplicado**: une un tratamiento con un producto; cantidad y unidad (kg o l).
- **Cambio en el historial**: tratamiento afectado, dato cambiado, valor anterior y nuevo, fecha y motivo; o
  anulación con su motivo.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: Con los datos de la explotación ya dados de alta, un agricultor registra un tratamiento completo de
  una parcela y un producto desde el móvil en menos de 2 minutos.
- **SC-002**: El 100 % de los tratamientos guardados contiene los datos obligatorios de REQ-02; ningún
  tratamiento incompleto en esos datos llega a guardarse.
- **SC-003**: En una prueba de 20 tratamientos registrados sin conexión, el 100 % se sincroniza sin pérdida ni
  duplicados al recuperarla.
- **SC-004**: El 100 % de los tratamientos pendientes de completar genera un aviso en la aplicación al menos
  7 días antes del vencimiento del plazo de un mes, y el 100 % de los sincronizados genera además un único correo
  en ese momento.
- **SC-005**: Ante una petición de inspección, el agricultor obtiene el listado de tratamientos de una parcela en
  un periodo dado en menos de 1 minuto.
- **SC-006**: El 100 % de las correcciones y anulaciones queda en el historial con valor anterior, fecha y
  motivo, y ningún tratamiento de menos de 3 años puede eliminarse de forma definitiva.
- **SC-007**: Al menos 4 de cada 5 agricultores de la prueba con usuarios registran su primer tratamiento sin
  ayuda.

## Supuestos

- **Usuario**: el titular de la explotación es el único usuario y registra también los tratamientos que hacen
  otras personas (aplicadores). Accede con su cuenta (REQ-20). El acceso con varios usuarios o roles (asesor,
  aplicador con cuenta propia) queda fuera de alcance.
- **Una explotación por usuario** en esta versión.
- **Lenguaje natural**: el registro por texto o voz que pide el principio V de la constitución se especificará
  como una funcionalidad posterior que reutilice este registro; aquí el registro se hace con un formulario
  pensado para el móvil. Es un **incumplimiento temporal y justificado del principio V** (decisión del alumno del
  2026-10-26: primera iteración SDD más corta y sin depender del presupuesto de la API), que se resuelve con esa
  funcionalidad. Por la misma razón, la confirmación del agricultor antes de guardar un registro generado por la
  IA (principio V) no aplica aquí: todos los datos los introduce el agricultor; se exigirá en la funcionalidad de
  lenguaje natural.
- **Ámbito agrario al aire libre o en invernadero**: los tratamientos de locales y medios de transporte
  (volumen en m³, anexo III, sección B, b y f) quedan fuera de alcance.
- **Productos**: no se comprueba el producto contra el Registro de Productos Fitosanitarios del MAPA (ni su
  autorización para el cultivo, ni la dosis), porque está pendiente de verificar qué datos ofrece y si son
  descargables (módulo 04, pendiente 6). El agricultor introduce el nombre comercial y el número de registro.
- **Plazo de seguridad**: no se registra ni se comprueba en esta funcionalidad; corresponde a la funcionalidad
  de cosechas.
- **Exportación**: la exportación del cuaderno en formato compatible con el SIEX (RD 1054/2022, anexo II) es una
  funcionalidad aparte. La referencia es la documentación técnica agrícola del SIEX del FEGA (v3.11): anexo V
  (definición de variables del REA y del CUE) y anexo VII (catálogos de códigos). Esta funcionalidad guarda los
  datos de forma que puedan exportarse después; el plan revisará el anexo V para que los nombres y valores de
  los datos sean compatibles.
- **Justificantes**: adjuntar la documentación justificativa (facturas, recomendaciones del asesor, inspección de
  equipos) queda fuera de alcance; se conserva solo el registro.
- **Resto de la sección A**: se especificarán con la fertilización: los datos generales de la explotación y del
  titular (A.1, a y b), la entidad o agrupación de asesoramiento (A.1.d), la ubicación en zonas del art. 35 y las
  masas de agua y puntos de captación de agua potable de los arts. 33.a y 33.b (A.1, e–g), y las características
  del suelo (A.3). Quedan **fuera del alcance de esta funcionalidad**.
- **Inspección de equipos**: se guarda la fecha de adquisición o de la última inspección, pero no se avisa de su
  caducidad, porque la periodicidad no está en las fuentes consultadas.
- **Antelación del aviso**: los 7 días de REQ-08 son una propuesta del agente, no una cifra normativa.
- **Fuente normativa**: se usan los textos consolidados del BOE, que son informativos; se contrastarán con la
  publicación oficial antes de cerrar la especificación.
