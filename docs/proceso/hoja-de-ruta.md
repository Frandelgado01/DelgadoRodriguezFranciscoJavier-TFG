# Hoja de ruta del desarrollo

Orden de las funcionalidades del Cuaderno de Campo, aceptado por el alumno el 2026-10-26 y **reducido en la tutoría
anotada el 2026-11-09**: se implementan solo la 001, la 002 y la 006, para centrar el TFG en el RAG; las demás se
describen en el apartado final "Próximos pasos" de la memoria. Cada funcionalidad implementada recorre las fases 2–7
del ciclo SDD en su propia rama corta (`NNN-nombre`) y se fusiona en `main` por PR cuando `/speckit-converge` da
"Converged" y el pipeline está en verde. Base para los apartados 3.6 (Planificación temporal) y 6 (Próximos pasos).

## Funcionalidades que se implementan

| # | Funcionalidad | Qué aporta | IA en el producto | Base normativa (módulo 04) | Requisitos previos |
| --- | --- | --- | --- | --- | --- |
| 001 | Registro de tratamientos fitosanitarios (formulario, sin conexión) | Esqueleto del proyecto (PWA, API, base de datos, Docker), primer pipeline de CI y hooks del bucle de implementación | No | RD 1311/2012, art. 16 y anexo III (A y B) | Módulo 05 (arquitectura) antes del plan |
| 002 | Consultas normativas (RAG) | Respuestas a dudas citando artículo o etiqueta; conjunto de preguntas de referencia y evaluación de fidelidad y relevancia | Sí: RAG | Corpus: RD 1311/2012, 1051/2022, 1054/2022, 1048/2022, 1049/2022, Decreto 80/2025 (CLM), etiquetas de productos | Módulo 06 (RAG); pendientes-tutor #14 (coste de la API); acceso a etiquetas (módulo 04, pendiente 6) |
| 006 | Registro en lenguaje natural (texto y voz) | "He tratado la parcela 4 con cobre" → registro, con confirmación del agricultor antes de guardar | Sí: LLM | Constitución, principio V | 001; pendientes-tutor #14 |

## Próximos pasos (no se implementan)

Se explican en el apartado final de la memoria, con su base normativa y el orden en que se abordarían.

| # | Funcionalidad | Qué aporta | IA en el producto | Base normativa (módulo 04) | Requisitos previos |
| --- | --- | --- | --- | --- | --- |
| 003 | Cosechas con comprobación del plazo de seguridad | "¿Puedo cosechar ya?" sobre los tratamientos reales de la parcela | Usa los datos de producto de la 002 | Etiqueta del producto (Registro de Productos Fitosanitarios del MAPA); registro voluntario de apoyo | 001 y 002 |
| 004 | Fertilización y plan de abonado (con el resto de la sección A) | Segunda obligación legal; datos del titular, asesoramiento, zonas y suelo | No | RD 1051/2022, art. 4; RD 1311/2012, anexo III (A y C); Decreto 80/2025 (zonas vulnerables) | Anexos del Decreto 80/2025 (módulo 04, pendiente 3) |
| 005 | Labores de ecorregímenes con avisos de plazo | Prácticas PAC anotadas en el plazo de un mes | No | RD 1048/2022, arts. 30–45 | 001 |
| 007 | Exportación compatible con el SIEX | Cuaderno exportable según el contenido del anexo II del RD 1054/2022 | No | RD 1054/2022, anexo II; FEGA, documentación técnica SIEX (anexos V y VII) | 001 a 005 |

Efectos de la reducción: la 003 dependía de la 002 para los plazos de seguridad; mientras tanto, la 002 puede
responder "¿puedo cosechar ya?" consultando la etiqueta, sin registro de cosechas. Sin la 007, la compatibilidad
con el SIEX se limita a los nombres de los datos alineados con su anexo V (data-model de la 001).

**Transversal:** las pruebas E2E (Playwright), las de rendimiento (k6) y el pipeline completo (análisis estático y
de dependencias, evaluaciones del RAG) crecen con cada funcionalidad. Los umbrales se fijan en el plan de la 001
y la 002 y se incorporan a la constitución por enmienda.

## Por qué este orden

- **001 primero:** es la obligación legal más exigente (electrónica desde el 01/01/2027) y no depende de la IA, de
  modo que el primer ciclo SDD es corto y deja montada la base del proyecto.
- **002 (RAG) en segundo lugar:** es el núcleo del TFG (objetivo 3) y la parte con más incertidumbre técnica; su
  evaluación requiere tiempo y alimenta directamente el apartado 4.4.
- **006 (lenguaje natural) al final:** reutiliza el registro de la 001 y la infraestructura de IA de la 002.
- **Próximos pasos, en este orden si se abordaran:** 003 (reutiliza los plazos de seguridad de la 002), 004 y 005
  (registros sin IA) y 007 (exporta lo que ya exista).

## Calendario

Pendiente: fecha prevista de entrega y de defensa. Con ella se reparten las funcionalidades en el calendario y se
dibuja el diagrama de Gantt del apartado 3.6.
