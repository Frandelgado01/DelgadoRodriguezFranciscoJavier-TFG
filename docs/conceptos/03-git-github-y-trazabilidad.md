# Módulo 03 — Git, GitHub y trazabilidad

Guía de conceptos del TFG. Base para los apartados 3.4 (Trazabilidad y registro del proceso) y 4.4 (tabla
REQ → prueba). Fuentes consultadas el 2026-10-13; referencias IEEE al final.

## En una frase

**Git** guarda la historia del proyecto, **GitHub** la comparte y automatiza sobre ella, y la **trazabilidad**
usa esa historia para demostrar que cada requisito acabó en código probado: `REQ-xx → T-xx → commit → prueba`.

## 1. Git: control de versiones distribuido

Un sistema de control de versiones "registra los cambios de un fichero o conjunto de ficheros a lo largo del
tiempo para poder recuperar versiones concretas más adelante" [1]. Permite volver a un estado anterior, comparar
cambios y saber quién cambió qué y cuándo.

Git es **distribuido**: cada copia del repositorio contiene la historia completa, de modo que cualquier copia
puede restaurar a las demás [1]. Tu repositorio local en `C:\Users\frand\TFG` y el de GitHub son dos copias
completas.

**Conceptos básicos:**

| Concepto | Qué es | En el TFG |
| --- | --- | --- |
| Repositorio | Carpeta con el proyecto y su historia (en `.git/`) | `C:\Users\frand\TFG` |
| Commit | Instantánea de los cambios, con autor, fecha, mensaje e identificador (hash) | `e11fab7` = módulo 01 |
| Área de preparación (*staging*) | Lo que entrará en el próximo commit (`git add`) | — |
| Rama (*branch*) | Línea de desarrollo independiente | `main`; Spec Kit puede crear una por funcionalidad |
| Fusión (*merge*) | Integrar una rama en otra | Rama de funcionalidad → `main` |
| Remoto | Otra copia del repositorio con la que sincronizas | `origin` = GitHub |
| `push` / `pull` | Enviar / traer commits del remoto | Push al cerrar cada iteración |
| `.gitignore` | Ficheros que Git no debe versionar | `.env`, `node_modules/`, `.venv/` |

**Comandos que verás a diario:**

```bash
git status                  # qué ha cambiado
git diff                    # cambios línea a línea
git add <fichero>           # preparar para el commit
git commit -m "mensaje"     # guardar la instantánea
git push                    # subir a GitHub
git log --oneline           # historia resumida
git switch -c <rama>        # crear una rama y cambiar a ella
```

## 2. GitHub: colaboración y automatización

GitHub aloja el repositorio remoto y añade funciones encima de Git:

| Función | Para qué sirve | Uso en el TFG |
| --- | --- | --- |
| Repositorio remoto | Copia de seguridad y acceso desde cualquier sitio | `Frandelgado01/DelgadoRodriguezFranciscoJavier-TFG` |
| Pull request (PR) | Proponer la fusión de una rama, revisarla y comentarla | Revisar cada funcionalidad antes de llevarla a `main` |
| Issues | Tareas, errores o peticiones con número (`#12`) | Opcional: una por `T-xx` o por defecto encontrado |
| GitHub Actions | Ejecutar flujos automáticos ante eventos (push, PR) | Pipeline CI/CD (módulo 07) |
| Referencias automáticas | `#123`, hashes de commit y URL se convierten en enlaces [3] | Enlazar commits, issues y PR entre sí |

## 3. Estrategia de ramas

**Trunk-based development** [4]: todo el mundo integra en una rama principal (`main`, el *trunk*) con
frecuencia; si hay ramas, son **de vida corta**, y un servidor de integración comprueba que cada commit no rompe
la construcción. Es la alternativa a modelos con muchas ramas de larga duración, como GitFlow, y facilita la
integración continua [4].

**Propuesta para el TFG:**

- `main` siempre estable: es lo que despliega el pipeline.
- Una **rama corta por funcionalidad** durante las fases 2–7 de SDD, fusionada a `main` mediante PR cuando
  `/speckit-converge` da "Converged" y el pipeline está en verde.
- La documentación y la memoria pueden ir directamente a `main`, como hasta ahora.

Böckeler describe que Spec Kit [2] trata cada especificación como una petición de cambio con su propia rama
[5]. **Verificado tras `specify init` (specify-cli 1.2.0):** el núcleo crea la carpeta numerada
`specs/<NNN-nombre>/`, pero no la rama; la rama se crea a mano (`git switch -c 001-nombre`) o con la extensión
opcional `git` de Spec Kit. Conviene usar el mismo nombre para la rama y la carpeta.

## 4. Trazabilidad

**Qué es.** La capacidad de seguir un requisito hacia delante (hasta el código y las pruebas que lo implementan y
verifican) y hacia atrás (de una línea de código o una prueba al requisito que la justifica). La norma de
referencia de ingeniería de requisitos, ISO/IEC/IEEE 29148, la incluye entre las características de una buena
especificación de requisitos [6].

**Por qué es central en este TFG:** el Cuaderno de Campo implementa obligaciones legales. Si cambia una norma,
hay que saber exactamente qué código y qué pruebas cambian, y poder demostrar ante una auditoría que cada
obligación está cubierta. Es el argumento 4 de la motivación (1.1).

**La cadena y dónde vive cada eslabón:**

| Eslabón | Dónde vive | Convención | Ejemplo |
| --- | --- | --- | --- |
| Requisito | `spec.md` | `REQ-xx` + criterios Dado/Cuando/Entonces | `REQ-04`: registrar un tratamiento fitosanitario por voz |
| Tarea | `tasks.md` | `T-xx`, con el `REQ` que implementa | `T-12 (REQ-04)`: endpoint de alta de tratamiento |
| Commit | Historia de Git | Mensaje empieza por la tarea | `T-12: añadir endpoint POST /tratamientos` |
| Prueba | `tests/` | El nombre o el docstring cita el `REQ` | `test_req04_registro_tratamiento_por_voz` |
| Resultado | Pipeline CI | Informe de pruebas por ejecución | Ejecución de GitHub Actions en verde |

**Cómo se consulta:**

```bash
git log --oneline --grep="T-12"     # commits de una tarea
grep -rn "REQ-04" specs/ tests/     # dónde aparece un requisito
```

**Matriz de trazabilidad.** Al final, en 4.4, se presenta una tabla `REQ → T → commit → prueba → resultado`.
Como todo sigue convenciones de texto, la matriz se puede **generar con un script** a partir de `spec.md`,
`tasks.md`, `git log` y el informe de pruebas, en vez de mantenerla a mano. Es una buena tarea para la fase 6.

## 5. Hooks de Git frente a hooks de Claude Code

Comparten nombre, pero son cosas distintas:

| | Hooks de Git | Hooks de Claude Code (módulo 02) |
| --- | --- | --- |
| Quién los ejecuta | Git | Claude Code |
| Cuándo | Antes o después de un commit, de un push… | Antes o después de que el agente use una herramienta, al enviar un mensaje… |
| Ejemplo | `pre-commit`: impedir un commit si el linter falla o hay secretos | `PostToolUse`: lanzar pruebas tras cada edición del agente |
| Cubre | También tus commits manuales | Solo lo que hace el agente |

Ambos son complementarios: el de Git es la última barrera antes de que algo entre en la historia.

## 6. Secretos y buenas prácticas

- **Nunca** se sube una clave al repositorio. Aunque se borre después, sigue en la historia de Git y en todas
  sus copias.
- Las claves van en `.env` (ignorado por `.gitignore`); en `.env.example` se documentan los nombres sin valores.
- En el pipeline, las claves se guardan como *secrets* de GitHub Actions (módulo 07).
- Un escáner de secretos en el pipeline o en un hook `pre-commit` es una de las medidas del apartado 3.5.
- Un commit es una unidad pequeña y con sentido, con un mensaje que explica el porqué. La regla del TFG es un
  commit por tarea.

## 7. Lo que ya estás haciendo

| Práctica | Estado |
| --- | --- |
| Repositorio fuera de OneDrive con remoto en GitHub | Hecho |
| `.gitignore` con secretos, entornos y dependencias | Hecho |
| Commit y push al cerrar cada iteración, con el registro en el mismo commit | Hecho |
| Registro de iteraciones versionado (`docs/proceso/registro-iteraciones.md`) | Hecho |
| Mensajes `T-xx:` y pruebas con `REQ-xx` | A partir de la fase 5 |
| Ramas por funcionalidad y PR | A partir de la fase 2 |
| Escáner de secretos y hook `pre-commit` | Al preparar el pipeline |

## Preguntas de autocomprobación

1. ¿Por qué Git es "distribuido" y qué ventaja tiene eso para tu TFG?
2. Si mañana cambia el plazo de seguridad de un fitosanitario, ¿cómo localizarías todo lo afectado con la
   cadena de trazabilidad?
3. ¿Qué diferencia hay entre un hook de Git y un hook de Claude Code? ¿Cuál cubre tus commits manuales?
4. ¿Por qué no basta con borrar una clave subida por error en el siguiente commit?
5. ¿Qué es trunk-based development y por qué encaja con un pipeline de CI?

## Referencias

[1] S. Chacon y B. Straub, "Getting Started — About Version Control", en *Pro Git*, 2.ª ed. Apress. [En línea].
Disponible en: https://git-scm.com/book/en/v2/Getting-Started-About-Version-Control. [Accedido: 13-oct-2026].

[2] GitHub, "Spec Kit", repositorio *github/spec-kit*. [En línea]. Disponible en:
https://github.com/github/spec-kit. [Accedido: 13-oct-2026].

[3] GitHub, "Autolinked references and URLs", *GitHub Docs*. [En línea]. Disponible en:
https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/autolinked-references-and-urls.
[Accedido: 13-oct-2026].

[4] P. Hammant, "Trunk Based Development". [En línea]. Disponible en: https://trunkbaseddevelopment.com/.
[Accedido: 13-oct-2026].

[5] B. Böckeler, "Understanding Spec-Driven-Development: Kiro, spec-kit, and Tessl", *martinfowler.com*,
15-oct-2025. [En línea]. Disponible en: https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html.
[Accedido: 13-oct-2026].

[6] *Systems and software engineering — Life cycle processes — Requirements engineering*, ISO/IEC/IEEE
29148:2018. (Pendiente: consultar el texto en la biblioteca de la UCLM o en IEEE Xplore y citar la sección
exacta sobre trazabilidad).
