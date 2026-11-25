# Especificación de la funcionalidad: Consultas normativas con citas

**Rama**: `002-consultas-normativas`

**Creada**: 2026-11-25

**Estado**: Borrador, pendiente de clarificar (fase 3) y de la aprobación del alumno y del visto bueno del tutor

**Entrada**: descripción del alumno: "comienza […] spec 002", con la hoja de ruta (consultas normativas con RAG), el
módulo 06 (`docs/conceptos/06-rag.md`) y sus decisiones del 2026-11-25: el Reglamento (UE) 2023/564 entra en el corpus;
los datos de productos salen del listado oficial del MAPA y no de las etiquetas.

**Numeración**: los requisitos de la 002 van de REQ-30 a REQ-43, para que cada `REQ-xx` sea único en el proyecto y las
pruebas no se confundan con las de la 001.

**Fuentes contrastadas el 2026-11-24 y el 2026-11-25**:

- Condiciones de reutilización del BOE (aviso legal): citar a la Agencia, indicar la fecha de la última actualización, no
  desnaturalizar el contenido y advertir del carácter informativo del texto consolidado.
- API abierta del BOE: las cinco normas estatales del corpus, por artículos y con fechas de vigencia (módulo 06, § 2).
- Listado del MAPA «Productos Autorizados para el Cuaderno de Explotaciones Agrarias», del 23/11/2026: 2 099 productos
  (2 000 vigentes y 99 cancelados) y 64 065 usos, cada uno con cultivo, plaga y **plazo de seguridad**. El plazo es un
  número solo en 32 350 usos (50 %); en 27 450 (43 %) es una variante de «no procede» («NO PROCEDE», «NP», «N.P.»); en
  4 159 (6 %) lleva condiciones («10 (AIRE LIBRE) 3 (INVERNADERO)») u otros valores («NA», «-»), y en 106 está vacío. De
  22 328 pares de producto y cultivo, 173 tienen más de un plazo. **Pendiente**: el documento del MAPA que describe el
  listado (su descarga da un error del servidor) y sus condiciones de reutilización.

## Contexto

El agricultor tiene dudas sobre sus obligaciones («¿cuánto tiempo tengo que guardar los registros?») y la respuesta está
repartida entre varias normas escritas en lenguaje jurídico. Un error puede costar una sanción o una ayuda, así que una
respuesta sin fuente no le sirve. Esta funcionalidad responde en lenguaje llano **citando el artículo**, permite
comprobarlo y reconoce que no sabe cuando la normativa incluida no lo dice. Para el plazo de seguridad de un producto no
redacta nada: muestra el dato oficial.

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1 — Preguntar una duda normativa (Prioridad: P1)

El agricultor escribe su duda con sus palabras y recibe una respuesta breve y llana, con la norma y el artículo en que se
apoya cada afirmación.

**Por qué esta prioridad**: es el núcleo del TFG (objetivo 3) y la propuesta de valor frente a buscar en el BOE.

**Prueba independiente**: con el corpus cargado y la sesión iniciada, hacer las preguntas de referencia y comprobar la
respuesta, sus citas y las abstenciones.

**Escenarios de aceptación**:

1. **Dado** el corpus con el RD 1311/2012, **cuando** el agricultor pregunta «¿cuánto tiempo tengo que guardar los
   registros de los tratamientos?», **entonces** la respuesta dice que al menos los tres años siguientes a su fecha de
   emisión y cita el artículo 16.3, aunque la norma diga «conservar» y no «guardar».
2. **Dado** el mismo corpus, **cuando** pregunta «¿en qué plazo tengo que apuntar un tratamiento?», **entonces** la
   respuesta da el plazo de un mes y cita el artículo 16.
3. **Dado** el corpus con el Reglamento de Ejecución (UE) 2023/564, **cuando** pregunta si tiene que anotar la dosis por
   hectárea, **entonces** la respuesta lo cita.
4. **Dado** que ninguna norma del corpus lo regula, **cuando** pregunta «¿cuánto cuesta inscribir un tractor?»,
   **entonces** el sistema dice que no lo ha encontrado en la normativa incluida, no da ninguna cifra y no cita nada.
5. **Dado** una pregunta que pide recomendar un producto o diagnosticar una plaga, **cuando** la envía, **entonces** el
   sistema explica que no da ese consejo y remite al asesor.
6. **Dado** que el agricultor no tiene conexión, **cuando** abre las consultas, **entonces** se le explica que necesitan
   conexión y no se pierde lo que haya escrito.
7. **Dado** un fallo del servicio que redacta la respuesta, **cuando** pregunta, **entonces** recibe un mensaje llano que
   le propone reintentarlo y ninguna respuesta.
8. **Dado** una pregunta que ordena al sistema ignorar sus reglas o responder sin fuentes, **cuando** la envía,
   **entonces** el sistema sigue respondiendo solo con el corpus o dice que no lo sabe.
9. **Dado** un agricultor que ha llegado al límite diario de consultas, **cuando** envía otra, **entonces** el sistema no
   la responde y le dice cuándo podrá volver a preguntar.
10. **Dado** un agricultor con parcelas y tratamientos, **cuando** pregunta, **entonces** no sale del servidor ningún
    dato de su cuenta ni de su explotación, y la pregunta no queda guardada; solo se registra su consumo.
11. **Dado** una pregunta sobre la normativa de otra comunidad autónoma, **cuando** la envía, **entonces** el sistema explica que solo
    trata la europea aplicable, la estatal y la de Castilla-La Mancha.
12. **Dado** una pregunta vacía o de más de 500 caracteres, **cuando** la envía, **entonces** el sistema la rechaza explicando por qué.

---

### Historia de usuario 2 — Comprobar la fuente (Prioridad: P1)

El agricultor quiere ver el texto oficial en que se apoya la respuesta antes de fiarse de ella.

**Por qué esta prioridad**: ninguna técnica evita por completo las respuestas erróneas (módulo 06); poder comprobarlas es
la defensa principal.

**Prueba independiente**: abrir una cita y comparar el fragmento mostrado con el texto oficial.

**Escenarios de aceptación**:

1. **Dado** una respuesta con una cita, **cuando** el agricultor la abre, **entonces** ve la norma, el artículo o anexo, el
   fragmento literal, la fecha de la última actualización y un enlace al texto oficial.
2. **Dado** un fragmento citado, **cuando** se compara con el texto oficial vigente del corpus, **entonces** coincide
   palabra por palabra.
3. **Dado** cualquier respuesta, **cuando** se muestra, **entonces** incluye que es informativa, que los textos consolidados
   no tienen valor jurídico y que no sustituye a un asesor.
4. **Dado** un artículo modificado, **cuando** se pregunta por él, **entonces** se cita la redacción vigente y no la anterior.

---

### Historia de usuario 3 — Ver el plazo de seguridad de un producto (Prioridad: P2)

El agricultor quiere saber cuántos días tienen que pasar entre el último tratamiento y la cosecha.

**Por qué esta prioridad**: es una pregunta frecuente en el campo y su respuesta es un dato oficial, no un texto que
interpretar. Va después de las historias 1 y 2 porque no es el núcleo del TFG.

**Prueba independiente**: buscar un producto del listado por su número de registro y comparar lo mostrado con el listado.

**Escenarios de aceptación**:

1. **Dado** un producto del listado, **cuando** el agricultor lo busca por su número de registro o por su nombre y elige el
   cultivo, **entonces** ve el plazo de seguridad de cada uso **tal como figura en el listado**, con la plaga, las
   condiciones del uso y la fecha del listado.
2. **Dado** un uso cuyo plazo es «10 (AIRE LIBRE) 3 (INVERNADERO)», **cuando** se muestra, **entonces** aparece completo, sin
   elegir uno de los dos.
3. **Dado** un uso con el plazo vacío, «NA», «-» o «NP», **cuando** se muestra, **entonces** aparece el valor literal y la
   indicación de consultar la etiqueta, sin decir que no hay plazo.
4. **Dado** un producto y un cultivo con varios plazos según la plaga, **cuando** se consultan, **entonces** se muestran todos.
5. **Dado** un producto cancelado o caducado, **cuando** se consulta, **entonces** se avisa antes de sus plazos.
6. **Dado** un producto o un cultivo que no está en el listado, **cuando** se busca, **entonces** el sistema dice que no figura
   y no propone otro en su lugar.

---

### Historia de usuario 4 — Mantener el corpus al día y evaluar las respuestas (Prioridad: P2)

Quien mantiene la aplicación (el alumno) carga las normas y el listado de productos y los actualiza cuando cambian, y comprueba
con preguntas de referencia que las respuestas siguen siendo correctas.

**Por qué esta prioridad**: 131 de los 447 bloques de las cinco normas estatales han tenido más de una versión (módulo 06); un
corpus viejo da respuestas falsas.

**Prueba independiente**: cargar dos versiones sucesivas de una norma de prueba y preguntar por el artículo que cambia.

**Escenarios de aceptación**:

1. **Dado** un corpus cargado, **cuando** se repite la carga sin cambios en las fuentes, **entonces** el corpus queda igual y no
   hay fragmentos duplicados.
2. **Dado** un artículo que ha cambiado, **cuando** se actualiza, **entonces** solo queda consultable su redacción vigente, con su
   fecha.
3. **Dado** que una fuente falla a mitad de la carga, **cuando** termina, **entonces** sigue consultable la versión anterior
   completa y se informa del fallo.
4. **Dado** el conjunto de preguntas de referencia, **cuando** se ejecuta la evaluación, **entonces** se obtiene un informe con los
   valores de SC-101 a SC-104 y, de cada fallo, la pregunta, lo esperado y lo obtenido; y ninguna pregunta del conjunto final está
   en el de ajuste.

---

### Casos límite

- **Pregunta vacía, demasiado larga o en otro idioma**: se rechaza con un mensaje llano la vacía y la que supera el máximo
  (REQ-30). En otro idioma, se responde en español.
- **Pregunta ambigua** («¿cuánto plazo tengo?»): la respuesta dice a qué supuesto se refiere cada cita; no elige uno sin decirlo.
- **Pregunta respondida solo en parte**: se responde lo que tiene respaldo y se dice qué parte no se ha encontrado.
- **Normas que se contradicen o se remiten unas a otras**: se citan las dos.
- **Normativa de otra comunidad autónoma o de otro país**: se responde que queda fuera del ámbito (REQ-34).
- **Pregunta sobre una redacción derogada** («¿qué decía antes?»): se responde con la vigente y se dice que solo se consulta esa.
- **Anexos y tablas**: se citan por su anexo y apartado. Si un anexo no tiene texto (imágenes del Decreto 80/2025), no se
  consulta, y la respuesta lo dice cuando la pregunta depende de él.
- **Respuesta sin ninguna cita**: no se muestra; se sustituye por la de REQ-32.
- **Datos personales en la pregunta**: no se puede impedir que el agricultor los escriba; se le pide que no lo haga (REQ-35).

## Requisitos *(obligatorio)*

Cada requisito cita la norma o la condición de la que deriva (principio IV de la constitución). Los marcados como "apoyo" derivan
de la constitución o de la usabilidad. Las cifras marcadas como *propuesta* son del agente y están por confirmar.

### Requisitos funcionales

**Pregunta y respuesta** (historia 1)

- **REQ-30**: El agricultor con la sesión iniciada MUST poder enviar una pregunta en texto libre, de 1 a 500 caracteres
  (*propuesta*), y ver la respuesta en español y en lenguaje llano. Las consultas necesitan conexión: sin ella, el sistema MUST
  explicarlo y conservar lo escrito. *Apoyo: constitución, principio V.*
- **REQ-31**: El sistema MUST responder solo con el contenido del corpus y acompañar cada afirmación normativa de al menos una cita
  que identifique la norma y su artículo, disposición o anexo. *Apoyo: constitución, principio IV (citar la fuente de cada respuesta).*
- **REQ-32**: Si el corpus no respalda una respuesta, el sistema MUST decir que no lo ha encontrado, sin dar datos, plazos ni cifras. Una
  respuesta sin citas nunca se muestra. *Apoyo: constitución, principio IV.*
- **REQ-33**: Toda respuesta MUST indicar que es informativa, que los textos consolidados son meramente informativos y que no sustituye al
  asesoramiento, y MUST citar a la Agencia Estatal Boletín Oficial del Estado como fuente de sus textos, con la fecha de la última
  actualización. *Fuente: condiciones de reutilización del BOE (aviso legal).*
- **REQ-34**: El sistema MUST limitarse a la normativa europea directamente aplicable, estatal y de Castilla-La Mancha incluida en el
  corpus, y MUST rechazar, explicándolo, las peticiones de recomendar productos o dosis, diagnosticar plagas o tratar de otras
  comunidades autónomas. *Apoyo: constitución, principio IV (ámbito); indicación del alumno del 2026-10-26.*
- **REQ-35**: Para responder, el sistema MUST enviar fuera del servidor solo la pregunta y los fragmentos del corpus; nunca datos de la
  cuenta ni de la explotación. Las preguntas y respuestas MUST NOT guardarse. La pantalla MUST pedir que no se escriban datos personales e
  informar de que la pregunta la procesa un servicio externo. *Apoyo: constitución, principio VI (RGPD, datos mínimos).*
- **REQ-36**: El sistema MUST limitar las consultas a 20 por cuenta y día natural, en hora peninsular (*propuesta*), y explicar al llegar al
  límite cuándo se puede volver a preguntar. MUST registrar el consumo de cada consulta sin guardar su texto. *Apoyo: constitución
  (gasto de unos 10 €); objetivo 6.*
- **REQ-37**: Si falla la búsqueda o la redacción, el sistema MUST informarlo en lenguaje llano y ofrecer reintentar, sin mostrar una
  respuesta parcial. *Apoyo: constitución, principio V.*
- **REQ-38**: Ninguna instrucción contenida en la pregunta o en el corpus MUST cambiar las reglas REQ-31 a REQ-35, y las consultas MUST NOT
  poder crear, cambiar ni borrar datos del cuaderno. *Apoyo: constitución, principio VI.*

**Fuente** (historia 2)

- **REQ-39**: El agricultor MUST poder abrir cada cita y ver la norma, el artículo, disposición o anexo, el fragmento literal, la fecha de
  la última actualización y un enlace al texto oficial. El fragmento MUST coincidir con el texto del corpus. *Fuente: condiciones de
  reutilización del BOE (no desnaturalizar el contenido); constitución, principio IV.*

**Productos** (historia 3)

- **REQ-40**: El agricultor MUST poder buscar un producto por número de registro o nombre, elegir un cultivo y ver todos sus usos con la
  plaga, el plazo de seguridad **literal** y las condiciones, con la fecha del listado. El sistema MUST NOT calcular, resumir ni elegir
  entre plazos, y ante un valor no numérico MUST remitir a la etiqueta. *Fuente: listado de productos autorizados del MAPA; constitución,
  principio IV (no inventar plazos).*
- **REQ-41**: El sistema MUST avisar si el producto está cancelado o caducado, y decir que no figura si no está en el listado, sin proponer
  otro. *Fuente: listado del MAPA (estado y fecha de caducidad).*

**Corpus** (historia 4)

- **REQ-42**: El corpus MUST incluir los RD 1311/2012, 1048/2022, 1049/2022, 1051/2022 y 1054/2022, el Reglamento de Ejecución (UE) 2023/564
  con su modificación, el Decreto 80/2025 de Castilla-La Mancha en la parte que tenga texto, y el listado de productos del MAPA. Cada carga
  MUST dejar consultable solo la redacción vigente, con sus fechas; repetirla sin cambios no altera nada, y si falla se conserva la versión
  anterior. *Fuente: normas citadas (módulo 04); constitución, principio IV.*

**Evaluación** (transversal)

- **REQ-43**: MUST existir un conjunto de preguntas de referencia versionado, con el artículo esperado o la indicación de que no hay
  respuesta, escrito a partir de la norma y **revisado por el alumno**, y un procedimiento repetible que mida con él los criterios SC-101 a
  SC-104 e informe de los fallos. Las preguntas usadas para ajustar el sistema MUST ser distintas de las que dan el resultado final.
  *Apoyo: constitución, principio III; objetivo 3.*

### Correspondencia entre requisitos y escenarios

| Requisito | Escenarios |
| --- | --- |
| REQ-30 | H1: 6, 12 |
| REQ-31 | H1: 1, 2, 3 |
| REQ-32 | H1: 4 |
| REQ-33 | H2: 1, 3 |
| REQ-34 | H1: 5, 11 |
| REQ-35 | H1: 10 |
| REQ-36 | H1: 9, 10 |
| REQ-37 | H1: 7 |
| REQ-38 | H1: 8 |
| REQ-39 | H2: 1, 2 |
| REQ-40 | H3: 1 a 4 |
| REQ-41 | H3: 5, 6 |
| REQ-42 | H2: 4; H4: 1 a 3 |
| REQ-43 | H4: 4 |

### Entidades clave

- **Norma**: título, identificador oficial, ámbito (europeo, estatal, autonómico), enlace, fechas de última actualización y de carga.
- **Fragmento**: parte citable de una norma (artículo, apartado, disposición o anexo), con su texto literal y su vigencia.
- **Respuesta** (no se guarda): texto, citas y, si la hay, la parte sin respaldo.
- **Cita**: fragmento y extracto literal en que se apoya una afirmación.
- **Producto autorizado** y **uso autorizado**: número de registro, nombre, estado y fecha de caducidad; cultivo, plaga, plazo de seguridad
  literal y condiciones; fecha del listado.
- **Consumo**: cuenta, día, número de consultas y consumo, sin texto.
- **Pregunta de referencia**: texto, artículos esperados o «sin respuesta», y conjunto (ajuste o final).

## Criterios de éxito *(obligatorio)*

Umbrales iniciales **propuestos** por el agente, sin fuente normativa. Se miden con las preguntas del conjunto final (REQ-43): al menos 40, de
ellas 10 sin respuesta en el corpus. Con ese tamaño, cada pregunta con respuesta pesa más de 3 puntos, así que son orientativos.

- **SC-101** (recuperación): en al menos el 90 % de las preguntas con respuesta, el artículo esperado está entre los fragmentos usados.
- **SC-102** (fidelidad): al menos el 90 % de las afirmaciones normativas están respaldadas por los fragmentos citados.
- **SC-103** (cita correcta): en al menos el 85 % de las preguntas con respuesta, la respuesta cita el artículo esperado.
- **SC-104** (abstención): el sistema dice que no lo sabe en al menos 9 de las 10 preguntas sin respuesta, y en no más del 10 % de las que sí
  la tienen.
- **SC-105**: el 100 % de las respuestas mostradas tiene al menos una cita, y el 100 % de los fragmentos citados coincide con el corpus.
- **SC-106**: el 95 % de las respuestas llega en menos de 15 segundos con conexión.
- **SC-107**: en el 100 % de los usos de una muestra de 50, que incluya los valores no numéricos, el plazo mostrado es idéntico al del listado.
- **SC-108**: la evaluación y la demo caben en el límite de gasto de la constitución.

## Supuestos

- **Usuario**: el titular de la cuenta de la 001, con la misma sesión. No hay consultas sin identificarse.
- **Sin conversación**: cada pregunta es independiente; no hay memoria de las anteriores.
- **Sin datos del cuaderno**: no responde sobre los tratamientos propios («¿puedo cosechar ya la parcela 4?»). Muestra el plazo del producto y
  el agricultor cuenta los días. Unir ambas cosas es la 003 (próximos pasos).
- **Sin historial de consultas** (REQ-35): se prefiere no guardar lo que no hace falta.
- **Etiquetas**: no se incluyen sus textos. El listado del MAPA no sustituye a la etiqueta, y la pantalla lo dice.
- **Relación con la 001**: no cambia sus requisitos. Que el listado sea descargable permitiría comprobar el producto al registrar (REQ-16);
  queda para próximos pasos.
- **Decreto 80/2025**: si no se encuentra una fuente con texto reutilizable antes de planificar, sale del corpus y se declara como limitación.
- **Recorte del 2026-11-25**: si falta tiempo, lo primero que se aplaza es la historia 3 y después el Decreto 80/2025. Las historias 1 y 2 y la
  evaluación no se recortan.

## Por confirmar en la fase 3 (clarificar)

1. Límite de 20 consultas por cuenta y día y pregunta de hasta 500 caracteres (REQ-30, REQ-36).
2. No guardar ninguna consulta (REQ-35). La alternativa es un historial visible solo para el titular.
3. Umbrales de SC-101 a SC-104 y tamaño del conjunto de preguntas.
4. No calcular la fecha de cosecha en la historia 3 (REQ-40).
5. Preguntas de referencia: quién las redacta y cómo las revisa el alumno.
