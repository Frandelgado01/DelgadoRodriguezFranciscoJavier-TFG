# Módulo 04 — Normativa del cuaderno de campo

Guía de conceptos del TFG. Base para la especificación de las funcionalidades (fase 2), el principio IV de la
constitución y los apartados 1.1 (Motivación) y 2.1 (Soluciones de cuaderno de campo). Fuentes oficiales
consultadas el 2026-10-26; referencias en APA al final.

> Los textos consolidados del BOE son informativos y no tienen valor jurídico; para la especificación final
> conviene contrastar cada artículo citado con la publicación oficial.

## En una frase

El cuaderno de explotación es obligatorio sobre todo por dos normas sectoriales: los **tratamientos
fitosanitarios** (RD 1311/2012), que deben registrarse **en formato electrónico desde el 1 de enero de 2027**,
y la **fertilización** (RD 1051/2022). El RD 1054/2022 los integra en el **Cuaderno digital de explotación
agrícola (CUE)**, conectado con el **SIEX**. Las **labores** solo son obligatorias para quien se acoge a
ecorregímenes de la PAC, y las **cosechas** no tienen una obligación de registro específica en estas normas.

## Mapa normativo

| Norma | Qué regula | Obligación para el agricultor | Plazo de anotación |
| --- | --- | --- | --- |
| RD 1054/2022 (SIEX y CUE) | Marco del cuaderno digital y su conexión con la Administración | Llevar el cuaderno cuando lo exija una norma sectorial; CUE obligatorio en el próximo periodo de la PAC según tamaño | El de cada norma sectorial |
| RD 1311/2012 (fitosanitarios) | Uso sostenible de productos fitosanitarios | Registrar cada tratamiento con los datos del anexo III, parte I | 1 mes; en electrónico desde 01/01/2027 |
| RD 1051/2022 (nutrición de suelos) | Fertilización sostenible | Anotar cada aporte de nutrientes, materia orgánica y riego; plan de abonado | 1 mes |
| RD 1048/2022 (pagos directos PAC) | Ecorregímenes | Anotar las prácticas acogidas (siega, pastoreo, cubiertas, láminas de agua…) | 1 mes en la mayoría |
| RD 1049/2022 (condicionalidad) | Requisitos para cobrar las ayudas PAC | Cumplir RLG 7 y RLG 8 (fitosanitarios); el incumplimiento reduce las ayudas | — |
| Decreto 80/2025 de Castilla-La Mancha | Zonas vulnerables a nitratos | Programa de actuación en zonas vulnerables | Pendiente de verificar (anexos) |

## 1. RD 1054/2022: SIEX y Cuaderno digital de explotación agrícola

El Real Decreto 1054/2022 establece el **Sistema de información de explotaciones agrícolas y ganaderas y de la
producción agraria (SIEX)**, el Registro autonómico de explotaciones agrícolas (REA) y el **Cuaderno digital de
explotación agrícola (CUE)** (Real Decreto 1054/2022, 2022). El texto consolidado se actualizó por última vez el
22 de enero de 2025.

- **Quién debe llevarlo (art. 9.1):** los titulares de explotaciones, cuando una norma sectorial lo exija, en
  particular las de nutrición de suelos, productos fitosanitarios e intervenciones de la PAC. Se puede llevar en
  papel salvo que la norma sectorial exija el formato electrónico, como hace el RD 1311/2012.
- **Contenido (anexo II):** datos generales de cultivo por parcela (agrupables en *unidades homogéneas de
  cultivo*, UHC), tratamientos fitosanitarios por UHC según el anexo III del RD 1311/2012, fertilización por UHC
  según la normativa de nutrición, y lo que exijan otras normas sectoriales.
- **Obligatoriedad del CUE (disposición final octava, apartado 2):** será obligatorio en el **próximo periodo de
  programación de la PAC** para las explotaciones que superen alguno de estos umbrales: más de 30 ha de cultivos
  permanentes y tierras de cultivo; más de 5 ha de regadío; o invernaderos de más de 0,1 ha. El resto puede usarlo
  de forma voluntaria.
- **Conexión con el SIEX (arts. 9.2 y 10):** los datos se actualizan en el sistema central al menos dos veces al
  año. Las administraciones ofrecen aplicaciones gratuitas, pero el titular puede usar **cualquier otro sistema
  que cumpla los requisitos técnicos y el contenido del anexo II**. La interoperabilidad se coordina mediante
  circulares con protocolos de comunicación normalizados y un catálogo de conceptos estandarizado (art. 2.1.j).
  **El real decreto no fija un formato de fichero.**

**Implicación para el TFG:** el acuerdo de "formato compatible con el SIEX" significa ajustarse al contenido del
anexo II y al catálogo de conceptos del SIEX. Hay que localizar las circulares de coordinación y las
especificaciones técnicas (pendiente).

## 2. RD 1311/2012: registro de tratamientos fitosanitarios

El artículo 16 obliga a las explotaciones agrarias a mantener actualizado un registro de tratamientos con la
información de la **parte I del anexo III**, que el propio texto denomina Cuaderno Digital de Explotación
Agrícola (Real Decreto 1311/2012, 2012; texto consolidado actualizado el 20 de noviembre de 2025):

- **Formato y plazo:** registro electrónico en la aplicación habilitada por la autoridad competente, con un
  **plazo de un mes** desde el tratamiento; en el ámbito agrario, los datos se proporcionan al menos mensualmente.
- **Papel hasta el 31 de diciembre de 2026:** los operadores agrarios pueden mantener el registro en papel hasta
  esa fecha, al amparo del Reglamento de Ejecución (UE) 2023/564. **Desde el 1 de enero de 2027 el registro de
  tratamientos debe ser electrónico.**
- **Conservación:** el registro y la documentación justificativa (asesoramiento, inspección de equipos,
  contratos, facturas y, en su caso, análisis de residuos) se conservan **al menos 3 años**.
- **Cuadernos equivalentes:** los de producción ecológica, integrada o certificada son válidos si contienen como
  mínimo los datos de la parte I del anexo III.

**Datos de cada tratamiento (anexo III, parte I, sección B)** — es, en la práctica, el modelo de datos de la
primera funcionalidad:

| Campo | Contenido |
| --- | --- |
| a | Fecha |
| b | Identificación de la parcela (o local o medio de transporte tratado) |
| c | Plaga o problema que se quiere controlar |
| d | Identidad del aplicador y, en su caso, del asesor |
| e | Cultivo, con especie y variedad; en herbáceos con semilla tratada, el producto de tratamiento de la semilla |
| f | Superficie tratada (ha) o volumen (m³) en locales |
| g | Producto fitosanitario: nombre comercial y número de registro |
| h | Equipo de aplicación, con su número de registro (ROMA) si procede |
| i | Cantidad de producto utilizada (kg o l) |
| j | Valoración de la eficacia del tratamiento |
| k | Otras observaciones |

**Información general de la explotación (sección A):** datos del titular y de la explotación, personal con carné
de usuario profesional o asesor, equipos de aplicación propios con fecha de inspección; por parcela, número,
referencia SIGPAC, superficie, uso, especie y variedad en leñosos, secano o regadío, aire libre o protegido; y
características del suelo (pH, fósforo, potasio y materia orgánica).

**Plazo de seguridad:** la expresión no aparece en el texto consolidado consultado. El plazo de seguridad (días
entre el último tratamiento y la cosecha) figura en la **etiqueta autorizada** de cada producto. El MAPA mantiene
la base de datos oficial del **Registro de Productos Fitosanitarios**, actualizada semanalmente, y remite a la
etiqueta para el detalle de los usos (Ministerio de Agricultura, Pesca y Alimentación [MAPA], s. f.). Es la
fuente que debe alimentar el RAG para preguntas como "¿puedo cosechar ya?".

## 3. RD 1051/2022: nutrición sostenible de los suelos

Texto consolidado actualizado el 3 de noviembre de 2025 (Real Decreto 1051/2022, 2022):

- **Registro (art. 4.1):** cada aporte de nutrientes o materia orgánica se anota en la sección de
  **Fertilización** del cuaderno en un plazo **no superior a un mes**; los riegos, también en un mes.
- **Datos de cada operación (anexo III, parte I, sección C del RD 1311/2012, introducida por esta norma):** fecha,
  superficie, tipo de operación (enmienda, abonado de fondo o de cobertera), tipo de material, procedencia (REGA,
  NIF o NIMA), método de aplicación, valor agronómico (N, P₂O₅, K₂O), dosis por hectárea, empresa de servicio
  (REGFER) y, en riego, contenido de nitrógeno del agua y volumen por riego.
- **Plan de abonado (arts. 4.2 y 6):** obligatorio desde el **1 de septiembre de 2026** (desde el 1 de enero de
  2026 en ciertos regadíos). Exentas las unidades de hasta 10 ha de secano o solo de pastos o forrajes para
  autoconsumo.
- **Exención del cuaderno (art. 4.1):** explotaciones con 5 ha o menos de cultivos y no más de 1 ha de regadío.

## 4. RD 1048/2022: ecorregímenes de la PAC (labores)

Quien se acoge a un ecorrégimen debe anotar en el cuaderno las prácticas comprometidas, en general **en el plazo
de un mes** desde su realización (Real Decreto 1048/2022, 2022; texto consolidado actualizado el 8 de julio de
2026):

| Artículo | Práctica | Qué se anota |
| --- | --- | --- |
| 30 | Pastoreo extensivo | Cambios en las fechas de inicio o fin de pastoreo |
| 31 | Siega sostenible / islas de biodiversidad | Actividades en la zona sin segar; operaciones de siega |
| 35 | Rotación y siembra directa en regadío | Aportes de nutrientes y agua de riego |
| 42 | Cubiertas vegetales en leñosos | Fecha de establecimiento, tipo de mantenimiento, anchuras |
| 43 | Cubiertas inertes de restos de poda | Fecha de establecimiento (no posterior al 15 de abril), anchuras |
| 45 | Cultivos bajo agua | Fechas de nivelación, siembra, inundación y secado |

**Implicación para el TFG:** las **labores** no son un registro obligatorio general; lo son para los
beneficiarios de ecorregímenes, con plazos de un mes. Es un buen caso para los avisos de plazos.

## 5. RD 1049/2022: condicionalidad reforzada

Establece los requisitos cuyo incumplimiento reduce las ayudas de la PAC (Real Decreto 1049/2022, 2022). Su
anexo I incluye el **RLG 7** (Reglamento (CE) 1107/2009, comercialización y uso de fitosanitarios) y el **RLG 8**
(Directiva 2009/128/CE, uso sostenible de plaguicidas). Los controles se dirigen a beneficiarios con más de 10 ha
declaradas. La reducción general es del **3 %** de los pagos; del 1 % si el incumplimiento es leve y no
intencionado, hasta el 10 % si es grave o reiterado, y al menos del **15 %** (hasta el 100 %) si es intencionado
(art. 15).

**Implicación para el TFG:** cuantifica el riesgo del agricultor en el apartado 1.1 (Motivación): un registro mal
llevado puede costarle parte de las ayudas.

## 6. Castilla-La Mancha

- **Zonas vulnerables a nitratos:** el **Decreto 80/2025, de 14 de octubre**, aprueba el programa de actuación y
  deroga la Orden de 4 de febrero de 2010 (Decreto 80/2025, 2025). Las obligaciones concretas (periodos de
  prohibición, dosis máximas de nitrógeno, registros) están en sus anexos I y II, que en la versión web del DOCM
  son imágenes: **pendiente de verificar en el PDF oficial**. La disposición final primera prevé un Código de
  Buenas Prácticas Agrarias de aplicación obligatoria en zonas vulnerables.
- **Ecorregímenes:** la Junta concreta fechas de establecimiento de cubiertas y plazos de anotación de un mes.
- **Pendiente:** si la Junta ofrece una aplicación propia de cuaderno digital y qué protocolo usa para enviar los
  datos al SIEX.

## 7. Cosechas

Ninguna de las normas consultadas impone un registro de cosechas en el cuaderno: el anexo III del RD 1311/2012 no
tiene campos de cosecha, y el RD 9/2015 de higiene en la producción primaria solo exige notificar anualmente al
REGEPA datos de titular, parcelas, cultivos y venta directa (Real Decreto 9/2015, 2015).

**Por qué se mantiene en el alcance:** registrar la cosecha permite **comprobar el plazo de seguridad** del último
tratamiento de la parcela antes de cosechar, que es el núcleo de la propuesta de valor ("¿puedo cosechar ya?").
Conviene presentarlo en la especificación como registro **voluntario de apoyo al cumplimiento**, no como
obligación legal. Pendiente: verificar las obligaciones de trazabilidad del Reglamento (CE) 178/2002 (art. 18).

## 8. Implicaciones para la especificación (candidatos a requisitos)

| Candidato | Fuente |
| --- | --- |
| Registrar un tratamiento con los campos a–k del anexo III, parte I, sección B | RD 1311/2012, art. 16 y anexo III |
| Avisar si un tratamiento no se ha completado dentro del mes siguiente | RD 1311/2012, art. 16 |
| Guardar los registros y justificantes al menos 3 años | RD 1311/2012, art. 16 |
| Mantener datos de explotación, parcelas (SIGPAC), equipos y aplicadores | RD 1311/2012, anexo III, sección A |
| Registrar fertilizaciones y riegos con los campos de la sección C, en el plazo de un mes | RD 1051/2022, art. 4.1 |
| Registrar labores de ecorregímenes con su plazo | RD 1048/2022, arts. 30–45 |
| Antes de registrar una cosecha, comprobar el plazo de seguridad del último tratamiento | Etiqueta del producto (Registro de Productos Fitosanitarios del MAPA) |
| Exportar el cuaderno con el contenido del anexo II y el catálogo de conceptos del SIEX | RD 1054/2022, arts. 2.1.j, 10 y anexo II |
| Responder dudas normativas citando artículo o etiqueta | Principio IV de la constitución |

## 9. Pendientes de verificar

1. Fecha exacta del "próximo periodo de programación de la PAC" a efectos del CUE obligatorio (RD 1054/2022, DF
   octava) y norma que lo modificó en enero de 2025.
2. Circulares de coordinación y especificaciones técnicas del SIEX (catálogo de conceptos, protocolos).
3. Anexos I y II del Decreto 80/2025 de Castilla-La Mancha.
4. Aplicación de cuaderno digital de la Junta de Castilla-La Mancha.
5. Texto del Reglamento de Ejecución (UE) 2023/564 (contenido y formato del registro electrónico).
6. Qué campos ofrece la base de datos del Registro de Productos Fitosanitarios (usos, dosis, plazo de seguridad) y
   si hay datos descargables.
7. Trazabilidad: Reglamento (CE) 178/2002, art. 18.

## Preguntas de autocomprobación

1. ¿Qué norma obliga a registrar los tratamientos fitosanitarios y desde cuándo debe hacerse en electrónico?
2. ¿Qué diferencia hay entre el cuaderno de explotación del RD 1311/2012 y el CUE del RD 1054/2022?
3. ¿Por qué las labores y las cosechas no tienen el mismo respaldo legal que los tratamientos?
4. ¿Qué arriesga un agricultor que incumple la condicionalidad en materia de fitosanitarios?
5. ¿De dónde se obtiene el plazo de seguridad de un producto y por qué es clave para el RAG?

## Referencias

Decreto 80/2025, de 14 de octubre, por el que se aprueba el programa de actuación aplicable en las zonas
vulnerables a la contaminación de las aguas por nitratos de origen agrario en Castilla-La Mancha. *Diario Oficial
de Castilla-La Mancha*, 201, 17 de octubre de 2025.
https://docm.jccm.es/docm/verArchivoHtml.do?ruta=2025/10/17/html/2025_7742.html&tipo=rutaDocm

Ministerio de Agricultura, Pesca y Alimentación. (s. f.). *Registro de Productos Fitosanitarios*. Recuperado el 26
de octubre de 2026, de https://www.mapa.gob.es/es/agricultura/temas/sanidad-vegetal/productos-fitosanitarios/registro-productos

Real Decreto 1311/2012, de 14 de septiembre, por el que se establece el marco de actuación para conseguir un uso
sostenible de los productos fitosanitarios. *Boletín Oficial del Estado*, 223, de 15 de septiembre de 2012.
https://www.boe.es/eli/es/rd/2012/09/14/1311/con

Real Decreto 9/2015, de 16 de enero, sobre las condiciones de aplicación de la normativa comunitaria en materia de
higiene en la producción primaria agrícola. *Boletín Oficial del Estado*. https://www.boe.es/eli/es/rd/2015/01/16/9/con

Real Decreto 1048/2022, de 27 de diciembre, sobre la aplicación, a partir de 2023, de las intervenciones en forma
de pagos directos y el establecimiento de requisitos comunes en el marco del Plan Estratégico de la Política
Agrícola Común, y la regulación de la solicitud única del sistema integrado de gestión y control. *Boletín Oficial
del Estado*, 312, de 29 de diciembre de 2022. https://www.boe.es/buscar/act.php?id=BOE-A-2022-23048

Real Decreto 1049/2022, de 27 de diciembre, por el que se establecen las normas para la aplicación de la
condicionalidad reforzada y de la condicionalidad social que deben cumplir las personas beneficiarias de las
ayudas en el marco de la Política Agrícola Común (título abreviado; BOE-A-2022-23049). *Boletín Oficial del Estado*, 312, de 29 de diciembre de 2022.
https://www.boe.es/eli/es/rd/2022/12/27/1049/con

Real Decreto 1051/2022, de 27 de diciembre, por el que se establecen normas para la nutrición sostenible en los
suelos agrarios. *Boletín Oficial del Estado*, 312, de 29 de diciembre de 2022.
https://www.boe.es/eli/es/rd/2022/12/27/1051/con

Real Decreto 1054/2022, de 27 de diciembre, por el que se establece y regula el Sistema de información de
explotaciones agrícolas y ganaderas y de la producción agraria, así como el Registro autonómico de explotaciones
agrícolas y el Cuaderno digital de explotación agrícola. *Boletín Oficial del Estado*, 312, de 29 de diciembre de
2022. https://www.boe.es/eli/es/rd/2022/12/27/1054/con
