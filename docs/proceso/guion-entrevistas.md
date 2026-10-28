# Guion de entrevistas a agricultores

Entrevistas cualitativas, breves y semiestructuradas, a dos o tres agricultores de Castilla-La Mancha. Tienen dos
fines:

1. **Motivación (apartado 1.1 de la memoria):** describir con datos de primera mano la fricción que supone llevar
   el cuaderno de explotación. El índice lo pide "si es posible, con dos o tres entrevistas a agricultores".
2. **Validar las decisiones de uso de la funcionalidad 001 antes de construir las pantallas (hitos H3 y H4).** La
   base normativa de la spec no depende de las entrevistas, pero sí estas decisiones, tomadas por suposición:
   plataforma Android, prioridad del modo sin conexión, el agricultor como usuario que rellena el cuaderno, la
   contraseña de 15 caracteres y los avisos por correo.

Decisión del alumno del 2026-10-28. Las entrevistas se hacen antes de aprobar el hito H2. Si algún resultado
contradice la spec, se cambia primero la spec (principio I), antes de H3.

> **Límite de lo que se puede concluir.** Con dos o tres entrevistas no se obtienen cifras representativas. En la
> memoria se presentan como testimonios cualitativos ("dos de los tres entrevistados…"), nunca como porcentajes
> generalizables. Las cifras de contexto (número de explotaciones, sanciones…) se toman de fuentes oficiales.

## Preparación

- **Perfil:** si es posible, variedad. Al menos un cultivo leñoso (viñedo, olivar o almendro) y uno herbáceo
  (cereal); tamaños distintos; que hagan tratamientos fitosanitarios. Si el cuaderno se lo lleva un asesor o una
  cooperativa, conviene entrevistar también a esa persona.
- **Duración:** 20 a 30 minutos, presencial o por teléfono.
- **Material:** este guion impreso, la hoja de notas del final y, si se graba, un móvil.
- **Consultar con el tutor** si la UCLM exige algún trámite para entrevistas en un TFG (por ejemplo, un modelo de
  consentimiento propio o el visto bueno de un comité de ética). Anotarlo en `pendientes-tutor.md`.

## Consentimiento informado (leer al empezar)

> Estoy haciendo mi Trabajo Fin de Grado en la Universidad de Castilla-La Mancha sobre una aplicación para llevar
> el cuaderno de campo. Me gustaría hacerte unas preguntas sobre cómo lo llevas ahora; son unos 20 minutos. No hay
> respuestas buenas ni malas. Lo que me digas se usará solo para el trabajo, sin tu nombre ni datos que te
> identifiquen, y puedes no contestar a cualquier pregunta o parar cuando quieras. ¿Te parece bien? ¿Puedo grabar
> el audio solo para tomar notas? Lo borraré cuando las tenga.

- Anotar en la hoja la respuesta: acepta (sí o no) y grabación (sí o no).
- **Anonimización:** cada entrevista se identifica con un código (E1, E2, E3). No se anotan nombre, teléfono,
  dirección, referencias SIGPAC ni nada que identifique la explotación. Si se graba, el audio se borra al pasar
  las notas y no se sube al repositorio (principio VI de la constitución).

## Preguntas

Las preguntas son orientativas: no hace falta leerlas al pie de la letra ni hacerlas todas. Las marcadas con ★
son las prioritarias si falta tiempo.

### A. Perfil (2 minutos)

1. ★ ¿Qué cultivos tienes y, más o menos, cuántas hectáreas? ¿Secano, regadío o ambos?
2. ¿Cuántas parcelas o recintos, aproximadamente?
3. ¿Haces tú los tratamientos, alguien de la familia, un empleado o una empresa de servicios?

### B. Cómo llevas hoy el cuaderno (5 minutos)

4. ★ ¿Quién rellena el cuaderno de explotación: tú, el asesor, la cooperativa u otra persona?
5. ★ ¿Cómo lo llevas: papel, hoja de cálculo, la aplicación de la Junta (SGA_CEX), la de la cooperativa u otra?
6. ★ ¿Cuándo lo apuntas: en el momento, al terminar el día, al final de la semana, cuando te lo piden…?
7. ¿Qué datos apuntas de cada tratamiento? (Dejar que responda y después preguntar por los que no mencione:
   producto, cantidad, superficie, plaga, quién lo aplicó, con qué equipo, si funcionó).
8. ¿Apuntas la **dosis por hectárea**, la **hora** a la que empiezas o en qué **estado está el cultivo**
   (brotación, floración…)? *(Reglamento de Ejecución (UE) 2023/564: dosis por hectárea, hora de inicio cuando sea
   relevante y estado fenológico BBCH en su caso.)*
9. ¿Sabes que desde el 1 de enero de 2027 el registro de tratamientos tendrá que ser electrónico? ¿Cómo lo vas a
   hacer?

### C. La fricción (5 minutos)

10. ★ Más o menos, ¿cuánto tiempo te lleva el cuaderno al mes? ¿Y en las épocas de más tratamientos?
11. ★ ¿Qué es lo que más te cuesta o más pereza te da del cuaderno?
12. ¿Alguna vez se te ha pasado el plazo de un mes para apuntar un tratamiento, o has tenido que reconstruirlo de
    memoria?
13. ¿Has tenido alguna inspección o control? ¿Qué te pidieron? ¿Hubo algún problema? *(Sin datos que identifiquen
    la explotación.)*
14. Cuando tienes una duda sobre la normativa (plazo de seguridad, dosis, si puedes cosechar ya), ¿a quién o a qué
    consultas? ¿Cuánto tardas en resolverla? *(Sirve para la funcionalidad 002, el RAG.)*

### D. Validar las decisiones de la funcionalidad 001 (6 minutos)

15. ★ ¿Qué móvil usas: Android o iPhone? ¿Lo llevas encima en el campo? *(Plataforma de referencia: Android.)*
16. ★ En tus parcelas, ¿tienes cobertura de datos? ¿En todas, en algunas, en ninguna? *(Prioridad del modo sin
    conexión, REQ-06.)*
17. ★ Si tuvieras una aplicación, ¿apuntarías el tratamiento en el campo, en el tractor o al llegar a casa?
18. ¿Usas el correo electrónico con frecuencia? ¿Preferirías los avisos de plazo por correo, en la propia app, por
    WhatsApp o SMS? *(REQ-08: avisos en la app y por correo.)*
19. Para entrar en la aplicación, ¿te supondría un problema una contraseña larga, tipo frase, como "tractor rojo
    en la viña"? ¿La guardarías en el móvil? *(REQ-20: mínimo de 15 caracteres.)*
20. ¿Te resultaría útil decirle a la aplicación por voz "he tratado la parcela 4 con cobre" en lugar de rellenar
    un formulario? *(Funcionalidad 006.)*
21. Si lo lleva un asesor o la cooperativa: ¿te gustaría poder verlo o apuntarlo tú, o preferirías que siguiera
    haciéndolo él? *(Afecta a quién es el usuario de la app.)*

### E. Cierre (2 minutos)

22. ¿Hay algo del cuaderno o de la normativa que te gustaría que una aplicación te solucionara y no te he
    preguntado?
23. Cuando la aplicación esté hecha, ¿te importaría probarla un rato? *(Sesión de la tarea T-71, que mide SC-001,
    SC-005 y SC-007.)*

Agradecer el tiempo.

## Hoja de notas (una por entrevista)

```text
Código: E_   Fecha: ____   Medio: presencial / teléfono
Consentimiento: sí / no    Grabación: sí / no (audio borrado el ____)

A. Cultivos y superficie (aprox.):            Leñoso / herbáceo / ambos   Secano / regadío
   Quién trata:
B. Quién rellena el cuaderno:                 Cómo (papel, SGA_CEX, otra):
   Cuándo lo apunta:                          Datos que apunta:
   Dosis/ha, hora, estado del cultivo:        Conoce lo de 2027: sí / no
C. Tiempo al mes (aprox.):                    Lo que más cuesta:
   Plazos, inspecciones:                      Cómo resuelve dudas:
D. Móvil: Android / iPhone                    Cobertura en parcelas:
   Dónde registraría:                         Correo / canal preferido de avisos:
   Contraseña larga:                          Voz:
   Asesor o cooperativa:
E. Otras necesidades:                         Participa en T-71: sí / no

Frase literal destacable (para la memoria, sin datos personales):
```

## Síntesis y efecto en el proyecto

Al terminar las entrevistas, rellenar esta tabla y llevarla a la revisión del hito H2. Cada fila que cambie una
decisión se anota como decisión en el registro y, si afecta a un requisito, se modifica primero la spec.

| Decisión de la 001 | Qué dicen las entrevistas (E1, E2, E3) | ¿Se mantiene? | Cambio, si lo hay |
| --- | --- | --- | --- |
| Android como plataforma de referencia | | | |
| Modo sin conexión como prioridad (REQ-06) | | | |
| El agricultor rellena el cuaderno | | | |
| Contraseña de 15 caracteres (REQ-20) | | | |
| Avisos en la app y por correo (REQ-08) | | | |
| Formulario en la 001; voz en la 006 | | | |
| Datos del Reglamento (UE) 2023/564 (dosis/ha, hora, BBCH) | | | |

Los testimonios sobre la fricción (bloque C) se resumen para el apartado 1.1, sin datos personales y presentados
como cualitativos.
