# Proto-personas

Las "entrevistas sintéticas" acordadas con el tutor (pendientes-tutor, tema 19) se hacen con **proto-personas**:
perfiles de usuario **ficticios y declarados como tales**, que responden a las preguntas de `preguntas.md` para
hacer explícitas las suposiciones de diseño de la funcionalidad 001 y poder discutirlas. Decisión del alumno del
2026-11-09.

> **Qué son y qué no son.** Las respuestas son **hipótesis del equipo**, no datos. No se citan como testimonios ni
> se usan para cuantificar nada. La columna "Base" de cada respuesta indica la fuente en que se apoya, entre
> corchetes, o "suposición" si no hay ninguna. En la memoria se presentan como "perfiles de usuario supuestos" con
> esta limitación, y la fricción del apartado 1.1 se cuantifica solo con fuentes oficiales.

**Versiones:** primera versión el 2026-11-09, con respuestas agrupadas. El 2026-11-23 se responden las 23 preguntas
una a una, con la base de cada respuesta, y se actualiza la síntesis con REQ-23 (dosis por hectárea). Las respuestas
nuevas desarrollan las de la primera versión sin contradecirlas.

## Datos de contexto con fuente

| Dato | Valor | Fuente |
| --- | --- | --- |
| Superficie agrícola utilizada media por explotación en Castilla-La Mancha (2020) | 37,83 ha (nacional: 26,37 ha) | [INE-CA] |
| Explotaciones cuya orientación principal son los cultivos leñosos (España, 2020) | 55,9 % | [INE-CA] |
| Mujeres jefas de explotación (España, 2020) | 28,6 % | [INE-CA] |
| Mano de obra contratada en las explotaciones (2020 frente a 2009) | +16,3 % | [INE-CA] |
| Edad media de los jefes de explotación en Castilla-La Mancha | 62,65 años; 44,4 % con más de 65 | Análisis de AVA-ASAJA sobre el Censo Agrario 2020 recogido por la prensa: **fuente secundaria, pendiente de contrastar en INEbase** |
| Cuota de Android entre los sistemas operativos móviles en España | entre el 67 % y el 73 % en los meses de 2026 consultados | [STATCOUNTER]: mide tráfico web, no usuarios del campo |
| Cobertura 5G en zonas rurales (España, junio de 2024) | 80 % de la población rural | [MONCLOA]: medida **sobre población**, no sobre superficie; no dice nada de la cobertura en las parcelas |
| Registro de tratamientos electrónico obligatorio | desde el 1 de enero de 2027 | RD 1311/2012, art. 16 (módulo 04) |
| Contenido mínimo del registro según la UE | dosis por hectárea, hora de inicio cuando proceda, códigos OEPP y etapa BBCH | [UE-2023/564], anexo |

## P1 — Antonio, viticultor de secano

*Perfil supuesto.* 61 años, titular. 42 ha de viñedo (Airén y Tempranillo) y olivar en secano, en unas 15 parcelas,
cerca del tamaño medio regional [INE-CA]. Trata él mismo con su tractor. Lleva el cuaderno en papel y lo pasa a
limpio cuando se acerca un control. Socio de una cooperativa.

| # | Pregunta (resumida) | Respuesta supuesta | Base |
| --- | --- | --- | --- |
| 1 | Cultivos y hectáreas | Unas 42 ha: viñedo de Airén y Tempranillo y algo de olivar, todo en secano. | Superficie cercana a la media regional [INE-CA]; leñosos como orientación más frecuente [INE-CA] |
| 2 | Número de parcelas | Unas 15, algunas pequeñas y repartidas por el término. | Suposición |
| 3 | Quién trata | Él mismo, con su tractor y su atomizador. | Suposición |
| 4 | Quién rellena el cuaderno | Él. | Suposición |
| 5 | Cómo lo lleva | En papel, en una libreta que pasa a limpio cuando se acerca un control. | Suposición |
| 6 | Cuándo lo apunta | Al final de la semana o cuando se acuerda; en campaña se le acumulan los tratamientos. | Suposición |
| 7 | Qué datos apunta | Fecha, producto, cantidad y parcela. El equipo es siempre el mismo y no lo anota; la eficacia casi nunca. | Suposición; los campos que omite están en el anexo III, sección B (RD 1311/2012) |
| 8 | Dosis por hectárea, hora, estado del cultivo | No apunta la dosis por hectárea ni la hora: sabe "cuántos litros echó en la cuba". No conoce las etapas BBCH por ese nombre, aunque sabe si la viña está brotando o en flor. | Suposición; datos del anexo de [UE-2023/564] |
| 9 | Registro electrónico en 2027 | Ha oído que será obligatorio; piensa pedir ayuda a la cooperativa. | Obligación: RD 1311/2012, art. 16; el resto, suposición |
| 10 | Tiempo al mes | Poco fuera de campaña; en campaña de tratamientos, varias horas al mes entre apuntar y pasar a limpio. | Suposición (no se cuantifica en la memoria) |
| 11 | Lo que más le cuesta | Acordarse de todo lo que hizo y leer la letra pequeña de las etiquetas. | Suposición |
| 12 | Plazo de un mes o reconstruir de memoria | Sí, alguna vez ha tenido que reconstruir tratamientos de memoria antes de un control. | Suposición; plazo de un mes: RD 1311/2012, art. 16 |
| 13 | Inspecciones o controles | Le preocupan más por miedo a perder ayudas que por el cuaderno en sí. | Suposición; la reducción de ayudas por incumplir los requisitos de fitosanitarios está en el RD 1049/2022 (módulo 04) |
| 14 | A quién consulta las dudas | Al técnico de la cooperativa o al de la tienda de fitosanitarios; a veces tarda días en tener la respuesta. | Suposición |
| 15 | Móvil | Android de gama media; lo lleva siempre en el bolsillo. | Android mayoritario en España [STATCOUNTER], solo como contexto |
| 16 | Cobertura en las parcelas | En algunas parcelas no tiene datos; están lejos del pueblo. | La cobertura oficial se mide sobre población, no en las parcelas [MONCLOA]; el resto, suposición |
| 17 | Dónde apuntaría | Al terminar, sentado en el tractor, antes de volver. | Suposición |
| 18 | Correo y canal de avisos | Usa poco el correo; prefiere un aviso en el móvil. | Suposición |
| 19 | Contraseña larga | Le cuesta; la dejaría guardada en el móvil para no tener que escribirla. | Suposición |
| 20 | Registro por voz | Hablarle al móvil le parece lo más cómodo, sobre todo con las manos sucias. | Suposición |
| 21 | Asesor o cooperativa | Hoy lo lleva él. Si en 2027 se lo llevara la cooperativa, querría poder verlo en el móvil, pero no tener que apuntar más. | Suposición |
| 22 | Qué más le solucionaría una aplicación | Que le diga si ya puede vendimiar después del último tratamiento. | Suposición; plazo de seguridad en la etiqueta y en el Registro de Productos Fitosanitarios (módulo 04) |
| 23 | Probar la aplicación | Sí, si es un rato corto. | Suposición |

## P2 — Lucía, agricultora joven de cereal y almendro

*Perfil supuesto.* 34 años, titular desde hace pocos años (incorporación de jóvenes). 120 ha de cereal en secano y
25 ha de almendro en regadío. Contrata un servicio para algunos tratamientos [INE-CA, aumento de la mano de obra
contratada y subcontratada, como contexto]. Usa la aplicación de la Junta para trámites y una hoja de cálculo para
el cuaderno.

| # | Pregunta (resumida) | Respuesta supuesta | Base |
| --- | --- | --- | --- |
| 1 | Cultivos y hectáreas | 145 ha: 120 de cereal en secano y 25 de almendro en regadío. | Suposición |
| 2 | Número de parcelas | Unas 30. | Suposición |
| 3 | Quién trata | Ella el almendro; para algunos tratamientos del cereal contrata una empresa de servicios. | Aumento de la mano de obra contratada [INE-CA], como contexto |
| 4 | Quién rellena el cuaderno | Ella. | Suposición |
| 5 | Cómo lo lleva | En una hoja de cálculo; la aplicación de la Junta la usa para otros trámites. | Suposición |
| 6 | Cuándo lo apunta | El mismo día o al siguiente; los tratamientos de la empresa, cuando le pasan los datos. | Suposición |
| 7 | Qué datos apunta | Todos los del anexo III, porque se los pidió su asesor. | Campos del anexo III, sección B (RD 1311/2012); el resto, suposición |
| 8 | Dosis por hectárea, hora, estado del cultivo | Apunta la dosis por hectárea porque la usa para calcular la cuba; la hora no; el estado del cultivo a veces, con sus palabras y sin códigos. | Suposición; datos del anexo de [UE-2023/564] |
| 9 | Registro electrónico en 2027 | Lo sabe; quiere una aplicación que le evite copiar los datos dos veces. | Obligación: RD 1311/2012, art. 16; el resto, suposición |
| 10 | Tiempo al mes | Una o dos horas al mes. | Suposición (no se cuantifica en la memoria) |
| 11 | Lo que más le cuesta | Que la empresa de servicios le pase los datos a tiempo. | Suposición |
| 12 | Plazo de un mes o reconstruir de memoria | No se le ha pasado nunca, pero ha ido justa con los tratamientos de la empresa. | Suposición |
| 13 | Inspecciones o controles | Tuvo un control de ayudas, sin problemas. | Suposición |
| 14 | A quién consulta las dudas | Busca en internet y en la etiqueta; le cuesta saber qué fuente es la oficial. | Suposición |
| 15 | Móvil | iPhone; lo lleva encima en el campo. | Suposición; Android es mayoritario, pero no exclusivo [STATCOUNTER] |
| 16 | Cobertura en las parcelas | Irregular en las parcelas de secano; buena en el almendro, cerca de la casa. | [MONCLOA], como contexto; el resto, suposición |
| 17 | Dónde apuntaría | En el campo, en el momento. | Suposición |
| 18 | Correo y canal de avisos | Usa el correo a diario; le valen los avisos por correo y en la aplicación. | Suposición |
| 19 | Contraseña larga | No le importa; usa un gestor de contraseñas. | Suposición |
| 20 | Registro por voz | Útil, pero quiere poder revisar y corregir lo dictado antes de guardarlo. | Suposición |
| 21 | Asesor o cooperativa | Quiere seguir apuntándolo ella, y que su asesor pueda consultarlo sin pedírselo. | Suposición |
| 22 | Qué más le solucionaría una aplicación | Que los tratamientos de la empresa de servicios entren sin tener que copiarlos. | Suposición |
| 23 | Probar la aplicación | Sí. | Suposición |

## P3 — Marta, técnica de una cooperativa

*Perfil supuesto.* 40 años, ingeniera agrónoma y asesora en gestión integrada de plagas. Lleva o revisa el
cuaderno de unos 60 socios de la cooperativa, muchos con el perfil de P1.

| # | Pregunta (resumida) | Respuesta supuesta | Base |
| --- | --- | --- | --- |
| 1 | Cultivos y hectáreas | No es titular; los socios que asesora tienen sobre todo viñedo y olivar. | Suposición |
| 2 | Número de parcelas | Muchas: unos 60 socios con varias parcelas cada uno. | Suposición |
| 3 | Quién trata | Los socios, cada uno con su equipo. | Suposición |
| 4 | Quién rellena el cuaderno | Ella, el de muchos socios. | Suposición |
| 5 | Cómo lo lleva | En un programa de la cooperativa, a partir de lo que le cuentan los socios o de papeles sueltos. | Suposición |
| 6 | Cuándo lo apunta | Por las tardes, en la oficina, cuando le llegan los datos. | Suposición |
| 7 | Qué datos apunta | Todos los del anexo III; los socios casi nunca le dan la eficacia. | Campos del anexo III, sección B (RD 1311/2012); el resto, suposición |
| 8 | Dosis por hectárea, hora, estado del cultivo | Conoce la dosis por hectárea y las etapas BBCH, y le preocupa cómo se exigirán con el reglamento europeo. | Datos del anexo de [UE-2023/564]; el resto, suposición |
| 9 | Registro electrónico en 2027 | Lo sabe y teme el volumen de trabajo que le va a llegar. | Obligación: RD 1311/2012, art. 16; el resto, suposición |
| 10 | Tiempo al mes | Gran parte de su tiempo en campaña. | Suposición (no se cuantifica en la memoria) |
| 11 | Lo que más le cuesta | Perseguir a los socios para que le den los datos. | Suposición |
| 12 | Plazo de un mes o reconstruir de memoria | A menudo recibe los datos fuera del plazo de un mes. | Suposición; plazo de un mes: RD 1311/2012, art. 16 |
| 13 | Inspecciones o controles | Acompaña a los socios en los controles. | Suposición |
| 14 | A quién consulta las dudas | El Registro de Productos Fitosanitarios del MAPA y las etiquetas; es ella quien resuelve las dudas de los socios. | Registro de Productos Fitosanitarios (módulo 04); el resto, suposición |
| 15 | Móvil | Android del trabajo. | Suposición |
| 16 | Cobertura en las parcelas | Trabaja sobre todo en la oficina, con conexión. | Suposición |
| 17 | Dónde apuntaría | En la oficina. | Suposición |
| 18 | Correo y canal de avisos | Usa el correo a diario. | Suposición |
| 19 | Contraseña larga | Sin problema. | Suposición |
| 20 | Registro por voz | Para los socios sí; ella prefiere el formulario. | Suposición |
| 21 | Asesor o cooperativa | Le gustaría que los socios apuntaran sus tratamientos y ella revisarlos; hoy lo hace todo ella. | Suposición |
| 22 | Qué más le solucionaría una aplicación | Ver en un solo sitio los cuadernos de todos sus socios y sus plazos. | Suposición |
| 23 | Probar la aplicación | Sí, y podría proponer socios para la prueba. | Suposición |

## Síntesis y efecto en la funcionalidad 001

| Decisión de la 001 | Qué sugieren las proto-personas | ¿Se mantiene? | Cambio o nota |
| --- | --- | --- | --- |
| Android como plataforma de referencia | P1 y P3 con Android, P2 con iPhone; Android es mayoritario en España [STATCOUNTER] | Sí | iOS sigue como "compatible por diseño, no verificado"; P2 recuerda que es una limitación real |
| Modo sin conexión como prioridad (REQ-06) | P1 y P2 registrarían en parcelas sin cobertura; la cobertura oficial se mide por población, no en el campo [MONCLOA] | Sí | Refuerza REQ-06 |
| El agricultor rellena su cuaderno (una explotación por cuenta) | P3 rellena el de muchos socios; P2 quiere que su asesor pueda consultarlo; P1 quiere verlo si se lo lleva la cooperativa | Sí, para la 001 | **Nota para "Próximos pasos":** cuenta de asesor con varias explotaciones y acceso de consulta. No cambia la spec |
| Tratamientos de terceros (aplicadores y empresas de servicios) | P2 contrata algunos tratamientos y quiere que entren sin copiarlos | Sí | La 001 permite registrar al aplicador (REQ-15) y el titular anota el tratamiento. **Nota para "Próximos pasos":** importar los tratamientos que envía una empresa de servicios |
| Eficacia opcional al guardar y plazo de un mes (REQ-02, REQ-07, REQ-08) | P1 y los socios de P3 casi nunca anotan la eficacia; P1 y P3 anotan o reciben los datos tarde | Sí | Refuerza el estado "pendiente de completar" y los avisos antes de que venza el mes |
| Contraseña de 15 caracteres (REQ-20) | Incómoda para P1; sin problema para P2 y P3 | Sí | La interfaz debe sugerir una frase y permitir que el navegador la guarde (ya previsto en R9) |
| Avisos en la app y por correo (REQ-08) | P1 usa poco el correo; P2 y P3 lo usan a diario | Sí | El aviso en la app es el principal y el correo, un complemento: ya es así en la spec |
| Formulario en la 001 y voz en la 006 | P1 prefiere hablar; P2 quiere revisar lo dictado; P3 prefiere el formulario para ella | Sí | Refuerza la 006 y la confirmación antes de guardar (principio V) |
| Datos del Reglamento (UE) 2023/564 | P1 no sabe la dosis por hectárea, pero sí la cantidad total; P2 la conoce; P3 conoce las etapas BBCH, P1 no | Sí (resuelto el 2026-11-14) | REQ-23 **calcula** la dosis por hectárea con la cantidad y la superficie, sin pedirla; hora de inicio, OEPP y BBCH quedan en "Próximos pasos" (pendientes-tutor #21) |
| Registro rápido en el campo (SC-001: menos de 2 minutos) | P1 y P2 apuntarían en el campo o en el tractor | Sí | Refuerza los datos de la explotación dados de alta una vez (historia 4) y el cultivo propuesto (REQ-05) |
| Consultas normativas (002) | Las tres resuelven dudas con fuentes lentas o poco fiables; P1 pregunta por el plazo de seguridad | — | Refuerza el RAG con citas a la fuente oficial; el plazo de seguridad antes de cosechar es la funcionalidad 003, en "Próximos pasos" |

**Conclusión:** las proto-personas no obligan a cambiar la spec de la 001. Dejan dos notas para "Próximos pasos":
la cuenta de asesor con acceso a varias explotaciones y la importación de tratamientos de empresas de servicios. El
cálculo de la dosis por hectárea, que la primera versión dejaba como nota, ya está en la spec (REQ-23).

## Fuentes

- [INE-CA] Instituto Nacional de Estadística. (2022, 4 de mayo). *Censo Agrario. Año 2020* [Nota de prensa].
  https://www.ine.es/prensa/cea_2020.pdf
- [STATCOUNTER] StatCounter. (s. f.). *Mobile operating system market share Spain*. Recuperado el 9 de noviembre de
  2026, de https://gs.statcounter.com/os-market-share/mobile/spain
- [MONCLOA] La Moncloa. (2025, 4 de junio). *La cobertura 5G móvil alcanza en España al 96 % de la población y se
  triplica en zonas rurales* [Nota de prensa].
  https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/transformacion-digital-y-funcion-publica/paginas/2025/040625-cobertura-5g.aspx
- [UE-2023/564] Reglamento de Ejecución (UE) 2023/564 de la Comisión, de 10 de marzo de 2023. *Diario Oficial de la
  Unión Europea*, L 74, 4–9. https://www.boe.es/doue/2023/074/L00004-00009.pdf
- Real Decreto 1311/2012, Real Decreto 1049/2022 y Registro de Productos Fitosanitarios del MAPA: referencias
  completas en `docs/conceptos/04-normativa-cuaderno-de-campo.md`.
