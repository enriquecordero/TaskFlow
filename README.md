# Workshop: GitHub Copilot Avanzado en .NET + Angular — Configura una vez, deja de repetir prompts

## Tabla de Contenidos

- [Introduccion](#introduccion)
- [Conceptos Clave de GitHub Copilot](#conceptos-clave-de-github-copilot)
- [Pre-requisitos](#pre-requisitos)
- [Agenda del Workshop](#agenda-del-workshop)
- [Ejercicio 0: Punto de Partida (sin configurar)](#ejercicio-0-punto-de-partida-sin-configurar)
- [Ejercicio 1: /init e instrucciones de proyecto](#ejercicio-1-init-e-instrucciones-de-proyecto)
- [Ejercicio 2: Instructions Especificas con applyTo](#ejercicio-2-instructions-especificas-con-applyto)
- [Ejercicio 3: Prompt Files (slash commands reutilizables)](#ejercicio-3-prompt-files-slash-commands-reutilizables)
- [Ejercicio 4: Custom Agents (roles)](#ejercicio-4-custom-agents-roles)
- [Ejercicio 5: Agent Skills (capacidades reutilizables)](#ejercicio-5-agent-skills-capacidades-reutilizables)
- [Ejercicio 6: MCP (conectar Copilot a tus herramientas)](#ejercicio-6-mcp-conectar-copilot-a-tus-herramientas)
- [Ejercicio 7: Todo Junto — El Efecto Compuesto](#ejercicio-7-todo-junto--el-efecto-compuesto)
- [Referencia Rapida](#referencia-rapida)
- [Troubleshooting](#troubleshooting)
- [Recursos Adicionales](#recursos-adicionales)

---

## Introduccion

Este workshop practico tiene un solo objetivo:

**Dejar de repetir prompts.** Mover el contexto del chat al repositorio para que Copilot ya sepa tus convenciones, tu stack y tu dominio — sin que se lo recuerdes en cada mensaje.

> **La idea central:** *El contexto no se escribe en cada prompt, se configura una vez en el repo.* Todo lo demas cuelga de ahi.

### Aprenderas a:

- Generar instrucciones de proyecto con **`/init`**
- Crear **instructions globales** y **por tipo de archivo** (`applyTo`)
- Empaquetar prompts largos como **prompt files** (`/comando`)
- Crear **custom agents** (roles especializados)
- Construir **Agent Skills** portables que Copilot carga bajo demanda
- Conectar Copilot a herramientas externas con **MCP**
- Optimizar consumo de tokens con el skill **caveman-mode**
- Combinar todo para que un prompt de una frase produzca codigo completo

### La App: TaskFlow

Un SaaS de gestion de tareas con API REST + frontend Angular. Deliberadamente sencillo — el protagonista es la configuracion de Copilot, no la app.

Asi se ve la pantalla que vas a construir (wireframe):

```text
+-------------------------------------------------------+
|  TaskFlow                        Tareas | Proyectos   |  <- nav (RouterLink)
+-------------------------------------------------------+
|  Tareas                                               |
|                                                       |
|  [ Nueva tarea...   ]  [ Descripcion ]   ( Crear )    |  <- form con signals
|                                                       |
|  [ ] Disenar el API                          ( x )    |
|  [x] Configurar copilot-instructions.md      ( x )    |  <- @for (task of
|  [ ] Escribir tests de integracion           ( x )    |      tasks(); ...)
|                                                       |
+-------------------------------------------------------+
        |                                    |
        v  RouterLink -> lazy loadComponent  v  ( x ) -> deleteTask(id)
```

### Stack

| Capa | Tecnologia |
|------|-----------|
| Backend | .NET 10 / C# 13, ASP.NET Core (Minimal APIs), EF Core (InMemory), FluentValidation |
| Frontend | Angular 19 (standalone components, signals, `inject()`, `@if`/`@for`) |
| Tests | xUnit + FluentAssertions (backend), Jasmine + Karma (frontend) |

### Arquitectura

```
TaskFlow/
├── TaskFlow.Api/           # .NET 10 Minimal API
│   ├── Domain/             # Entidades (TaskItem, Project)
│   ├── Data/               # DbContext (EF Core InMemory)
│   └── Features/           # Por recurso: endpoints + DTOs + validadores
│       ├── Tasks/
│       └── Projects/
├── TaskFlow.Web/           # Angular 19
│   └── src/app/
│       ├── models/         # Interfaces espejando DTOs del backend
│       ├── services/       # HttpClient services
│       └── features/       # Componentes standalone por recurso
│           ├── tasks/
│           └── projects/
├── TaskFlow.Tests/         # xUnit + FluentAssertions
└── .github/                # Copilot customizations (el protagonista)
    ├── copilot-instructions.md
    ├── instructions/
    ├── prompts/
    ├── agents/
    └── skills/
```

Y asi fluye una peticion de extremo a extremo — fijate que la entidad de dominio **nunca** cruza la frontera HTTP, solo el DTO:

```text
  Angular 19 (browser)                    .NET 10 API (:5100)
  --------------------                    -------------------
  TaskListComponent                       MapTaskEndpoints()
    signal tasks()                          |
        |                                   v
        v              GET /tasks         FluentValidation
  TaskService          ------------>        |
    inject(HttpClient)                      v
    environment.apiUrl   <------------   TaskFlowDbContext
        |               JSON (DTO)        (EF Core InMemory)
        v               TaskResponse         |
  models/*.model.ts                          v
  (espejan los DTOs)                      TaskItem (Domain)

  Regla clave: la entidad TaskItem NUNCA cruza el HTTP; solo viaja el DTO.
```

### Estandares del Proyecto (los que normalmente repetirias en cada prompt)

- **.NET 10**, Minimal APIs organizadas por feature
- DTOs como `record` — **nunca** exponer entidades de dominio
- Validacion con **FluentValidation**
- Errores con `Results.Problem` / `ProblemDetails` (RFC 7807)
- Tests con **xUnit** + **FluentAssertions**, patron Arrange-Act-Assert
- Angular 19 standalone, signals, `inject()`, `@if`/`@for`
- Nombres: `PascalCase` para tipos, `camelCase` para variables, `kebab-case` para archivos TS

> Fijate: **toda esta lista es exactamente lo que vamos a mover a archivos de configuracion.** Despues de hacerlo, no la volveras a escribir.

---

## Conceptos Clave de GitHub Copilot

### Modos de GitHub Copilot Chat

| Modo | Funcion | Cuando usarlo |
|------|---------|--------------|
| **Ask** | Solo responde, NO modifica archivos | Explorar, entender, preguntar |
| **Plan** | Genera un plan de implementacion estructurado, no edita | Disenar antes de codificar |
| **Agent** | PUEDE crear y modificar archivos, usa tools | Implementar features completas |

> **Nota:** el antiguo modo **Edit** esta deprecado; usa **Agent** para ediciones multi-archivo. VS Code 1.106 (oct-2025) ademas renombro los "chat modes" a **custom agents**.

En modo **Agent** es donde las customizations brillan: el agente lee tus instructions, carga skills y usa herramientas MCP por su cuenta.

### El Piso Gratis (no consume peticiones premium)

| Funcion | Que hace | Shortcut |
|---------|----------|----------|
| **Inline completions** | Autocompleta mientras escribes | `Tab` para aceptar |
| **NES** (Next Edit Suggestions) | Predice la ubicacion y el contenido de tu siguiente edicion | `Tab` → `Tab` |

> **Estos dos representan ~70% del valor diario** y no consumen peticiones premium. (En el plan **Free** las completions estan topadas a ~2.000/mes; en planes de pago son ilimitadas.)

### Herramientas que consumen peticiones premium

| Funcion | Que hace | Shortcut |
|---------|----------|----------|
| **Inline chat** | Refactoring en contexto | `Cmd+I` (⌘I) |
| **Chat panel** | Conversacion con contexto del proyecto | `Ctrl+Cmd+I` (⌃⌘I) |
| **Agent mode** | Crea/modifica archivos, usa tools | Chat → Agent |

### Comandos Especiales

| Comando | Descripcion |
|---------|-------------|
| `/init` | Genera el archivo de instrucciones inicial (`AGENTS.md` o `copilot-instructions.md`) |
| `/create-instruction` | Genera un `*.instructions.md` puntual |
| `/create-prompt` | Genera un prompt file |
| `/create-skill` | Genera un skill |
| `/create-agent` | Genera un custom agent |
| `/instructions`, `/skills`, `/agents` | Abren los menus de configuracion |

### Las Customizations principales de VS Code

| Customization | Que te da | Archivo / ubicacion |
|---------------|-----------|---------------------|
| **Instructions** | Estandares aplicados automaticamente | `.github/copilot-instructions.md`, `.github/instructions/*.instructions.md` |
| **Prompt files** | Un prompt reutilizable invocado como `/comando` | `.github/prompts/*.prompt.md` |
| **Custom agents** | Un rol con sus propias instrucciones y modelo | `.github/agents/*.agent.md` |
| **Agent skills** | Capacidad repetible con scripts, cargada bajo demanda | `.github/skills/<nombre>/SKILL.md` |
| **MCP servers** | Conectar Copilot a herramientas externas | `.vscode/mcp.json` |
| **Hooks** | Ejecutar comandos en puntos del ciclo del agente | configuracion de hooks |

> **`AGENTS.md`** es el formato **portable** de instrucciones siempre activas (estandar abierto, entre herramientas); es lo que hoy suele generar `/init` y lo vemos en el Ejercicio 1 — equivale a `copilot-instructions.md`. VS Code documenta ademas **Agent plugins** (empaquetado distribuible de customizations como extension), que queda fuera del alcance del taller.

Regla practica de adopcion **incremental**:

1. Empieza con **instructions** de proyecto (`/init`)
2. Anade **instructions especificas** por lenguaje/carpeta
3. Automatiza tareas repetitivas con **prompt files** y **skills**
4. Especializa con **custom agents**
5. Conecta herramientas externas con **MCP** (y **hooks**)

---

## Pre-requisitos

### Software

```bash
dotnet --version      # debe ser 10.x
node --version        # 22 o superior
code --version        # VS Code actualizado
git --version
```

- **.NET SDK 10** — https://dotnet.microsoft.com/download
- **Node.js 22+** — https://nodejs.org
- **Visual Studio Code** actualizado
- **Git**

### Extensiones de VS Code

**Requeridas:**
- **GitHub Copilot** (`github.copilot`)
- **GitHub Copilot Chat** (`github.copilot-chat`)

**Recomendadas:**
- **C# Dev Kit** (`ms-dotnettools.csdevkit`)
- **Angular Language Service** (`Angular.ng-template`)

**Instalacion rapida:**

```bash
code --install-extension github.copilot
code --install-extension github.copilot-chat
code --install-extension ms-dotnettools.csdevkit
code --install-extension Angular.ng-template
```

### Cuenta

- Cuenta de GitHub con **Copilot activo**. El plan **Free** incluye Agent mode, instructions y MCP —tecnicamente alcanza—, pero su cuota de chat/agente es **limitada y no ampliable** (no se pueden comprar peticiones extra). Para un taller de ~3.5 h en Agent mode, conviene **Copilot Pro** (o su prueba gratuita) o verificar la cuota restante antes de empezar.

### Dos ramas: empiezas de cero, comparas con la solución

Este repo tiene dos ramas a propósito:

| Rama | Qué es | Para qué |
|------|--------|----------|
| **`inicio`** | La app + este README, **sin** `.github/` ni `.vscode/mcp.json` | **Empieza aquí.** Construyes toda la configuración de Copilot tú mismo, ejercicio por ejercicio. |
| **`main`** | Todo lo anterior **+ la configuración completa** (`.github/`, MCP) | La **solución de referencia**. Compárala cuando termines cada ejercicio. |

> **Importante:** el Ejercicio 0 solo funciona desde `inicio`. Si empiezas en `main`, Copilot ya tiene la configuración y generará buen código desde el principio — nunca sentirás el "antes". A partir del Ejercicio 1 **construyes** cada archivo de configuración tú mismo: el contenido completo de cada uno está en su ejercicio (no necesitas salir del README). La rama `main` tiene la versión final montada por si quieres verla funcionando.

### Clonar y Levantar

```bash
git clone https://github.com/enriquecordero/TaskFlow.git
cd TaskFlow
git checkout inicio          # ← empieza de cero (sin .github/)

# Backend
dotnet restore TaskFlow.Api
dotnet build TaskFlow.Api

# Frontend
cd TaskFlow.Web
npm install
cd ..
```

> **Para comparar con la solución** en cualquier momento: `git diff inicio origin/main -- .github` (o abre la rama `main` en GitHub).

### Levantar la App

**Terminal 1 — API (.NET):**

```bash
dotnet run --project TaskFlow.Api --urls http://localhost:5100
```

Espera a ver: `Now listening on: http://localhost:5100`

**Terminal 2 — Frontend (Angular):**

```bash
cd TaskFlow.Web
./node_modules/.bin/ng serve --port 4200
```

Espera a ver: `Local: http://localhost:4200/`

**Verificar:** Abre `http://localhost:4200` en el browser. Debes ver la app TaskFlow con navegacion entre Tareas y Proyectos.

---

## Agenda del Workshop

| Bloque | Tema | Tiempo |
|--------|------|--------|
| Ej. 0 | Punto de partida: el dolor de repetir prompts | 15 min |
| Ej. 1 | `/init` + instrucciones de proyecto | 30 min |
| Ej. 2 | Instructions especificas con `applyTo` | 25 min |
| Descanso | | 10 min |
| Ej. 3 | Prompt files (`/comando`) | 25 min |
| Ej. 4 | Custom agents (roles) | 30 min |
| Ej. 5 | Agent Skills | 35 min |
| Descanso | | 10 min |
| Ej. 6 | MCP | 25 min |
| Ej. 7 | Todo junto + cierre | 20 min |
| | **Total** | **≈ 3h 30min** |

> **Nota:** Los **Hooks** (la 6ta customization) quedan fuera del alcance de este taller. Son comandos que se ejecutan automaticamente en puntos del ciclo del agente (ej. antes de guardar un archivo). Puedes explorarlos en la [documentacion oficial](https://code.visualstudio.com/docs/agent-customization/overview).

---

## Ejercicio 0: Punto de Partida (sin configurar)

> **Objetivo:** *sentir* el problema antes de resolverlo.

> **Dos costumbres para todo el taller:**
> - **Para que la audiencia siga los cambios:** termina cada prompt con *"...y al final resume qué archivos creaste o modificaste y por qué"*. Así Copilot entrega un resumen legible de lo que tocó, además del diff.
> - **Ritual de reset entre ejercicios** (cada vez que veas *"Deshaz los cambios"*): deshaz solo el **código de demo** que Copilot generó (endpoints, componentes, tests) — **no** tu configuración. Como el repo está versionado:
>   ```bash
>   git restore TaskFlow.Api TaskFlow.Web TaskFlow.Tests
>   git clean -fd TaskFlow.Api TaskFlow.Web TaskFlow.Tests
>   ```
>   Limpia solo las carpetas de la app. Añade `-nd` en vez de `-fd` para un dry-run. No toca `bin/`, `obj/` ni `node_modules/` (gitignored).
>
> ⚠️ **Tu configuración es tu progreso.** Los archivos que construyes (`AGENTS.md` o `.github/…`, `.vscode/mcp.json`) **se acumulan ejercicio a ejercicio** — el efecto compuesto del Ejercicio 7 depende de ello. **No los borres**; por eso el reset de arriba limita `git clean` a las carpetas de la app.

---

### Paso 0.1: Pedir un endpoint (modo Agent)

Abre Copilot Chat en **Agent Mode** y escribe, **sin ninguna configuracion todavia**:

```
Crea un endpoint GET /tasks que devuelva una lista de tareas.
Al terminar, resume que archivos creaste o modificaste y por que.
```

**Observa y anota** — casi seguro:

- No usa DTOs (devuelve entidades)
- No valida nada
- El estilo de nombres puede no coincidir con el tuyo
- No anade tests

---

### Paso 0.2: Ahora pidelo "bien"

```
Crea un endpoint GET /tasks. Usa Minimal API, .NET 10, devuelve un DTO
(no la entidad), inyecta el DbContext, maneja errores con Results.Problem,
nombres en PascalCase para tipos y camelCase para variables, y anade un
test xUnit con FluentAssertions.
Al terminar, resume que archivos cambiaste y que convenciones aplicaste.
```

Mejor resultado, pero **acabas de escribir el prompt que tendras que repetir en cada endpoint**.

> **Reflexion:** ¿Cuantas palabras de ese prompt son sobre el *que* (el endpoint) y cuantas sobre el *como* (convenciones)? Todo el "como" es candidato a moverse a configuracion.

**Deshaz los cambios** antes de continuar (borra solo el código de demo — tu configuración se queda):

```bash
git restore TaskFlow.Api TaskFlow.Web TaskFlow.Tests && git clean -fd TaskFlow.Api TaskFlow.Web TaskFlow.Tests
```

---

## Ejercicio 1: /init e instrucciones de proyecto

> **Objetivo:** generar las instrucciones de proyecto una sola vez y que apliquen a *todo* el chat automaticamente.

---

### Paso 1.1: Generar con /init

En el chat escribe:

```
/init
```

VS Code analiza el workspace y genera un archivo de **instrucciones siempre activas**, que se aplica **automaticamente a todas las peticiones** del chat — no hay que adjuntarlo ni mencionarlo.

> **¿`AGENTS.md` o `copilot-instructions.md`?** Segun tu version de VS Code, `/init` puede generar uno u otro. Hacen **exactamente lo mismo** (instrucciones globales siempre activas); solo cambian el formato y la ubicacion:
>
> | | `AGENTS.md` | `.github/copilot-instructions.md` |
> |---|---|---|
> | Formato | Estandar abierto ([agents.md](https://agents.md)), **portable** entre herramientas (Copilot, Cursor, Zed…) | Especifico de Copilot / VS Code |
> | Ubicacion | Raiz del repo (o anidado en subcarpetas) | `.github/` |
> | Scoping | Por carpeta (un `AGENTS.md` por directorio) | Se combina con `*.instructions.md` + `applyTo` por glob (Ejercicio 2) |
> | Genera hoy `/init` | Versiones recientes | Versiones/configuracion previas |
>
> Ambos son **siempre activos** y, si tienes los dos, VS Code los **combina**. Este taller usa `.github/copilot-instructions.md` como solucion de referencia porque se empareja de forma natural con las instructions por `applyTo` del Ejercicio 2 — pero si tu `/init` genero `AGENTS.md`, **estas igual de bien**: es el mismo concepto en formato portable. Lo que aprendas aqui aplica a ambos.

---

### Paso 1.2: Revisar y afinar

`/init` da un buen punto de partida, pero tu mandas. Abre **el archivo que te genero** — `AGENTS.md` o `.github/copilot-instructions.md`, segun tu version — y ajustalo. Como referencia, la rama `main` incluye un ejemplo completo en el formato clasico: [`.github/copilot-instructions.md`](https://github.com/enriquecordero/TaskFlow/blob/main/.github/copilot-instructions.md).

> Las buenas practicas de abajo valen para **ambos formatos**: solo cambia el nombre y la ubicacion del archivo, no *como* se redactan las reglas.

Buenas practicas al redactar instructions:

- **Cortas y autocontenidas:** una idea por instruccion
- **Explica el porque:** "usa `Results.Problem` *porque* unifica los errores como ProblemDetails (RFC 7807)"
- **Muestra patrones a favor y en contra** con ejemplos de codigo
- **Centrate en lo no obvio:** no documentes lo que ya hace el formateador/linter

---

### Paso 1.3: La prueba del algodon

Vuelve a pedir, **ahora sin convenciones en el prompt**:

```
Crea un endpoint GET /tasks que devuelva una lista de tareas.
```

Compara con el resultado del Ejercicio 0. Ahora el resultado **ya respeta DTOs, manejo de errores y estilo**. El contexto vino del archivo, no de ti.

> **Momento wow:** En la respuesta del chat, abre la seccion **References** para confirmar que tu archivo de instrucciones (`AGENTS.md` o `copilot-instructions.md`) se uso.

**Deshaz los cambios** antes de continuar (borra solo el código de demo — tu configuración se queda):

```bash
git restore TaskFlow.Api TaskFlow.Web TaskFlow.Tests && git clean -fd TaskFlow.Api TaskFlow.Web TaskFlow.Tests
```

---

## Ejercicio 2: Instructions Especificas con applyTo

> **Objetivo:** reglas que solo apliquen a ciertos archivos (tests, Angular, C#), sin contaminar todo el contexto.

> Vas a crear cuatro archivos en `.github/instructions/`, cada uno acotado con `applyTo`. Aquí tienes **el contenido y el porqué** de cada uno — escríbelos directamente (o genera un borrador con `/create-instruction` y ajústalo). Los pruebas en el Paso 2.5.

---

### Paso 2.1: Crea las instructions de C#

Crea **`.github/instructions/csharp.instructions.md`** con este contenido:

```markdown
---
applyTo: "TaskFlow.Api/**/*.cs"
---

# Convenciones C# para la API

- Usa `record` para los DTOs (request y response).
- Usa primary constructors cuando sea posible.
- Usa `AsNoTracking()` en consultas de solo lectura.
- Respuestas con `Results.Ok()`, `Results.Created()`, `Results.Problem()`, `Results.NoContent()`.
- Valida con FluentValidation; si falla, retorna `Results.ValidationProblem()`.
```

**¿Por qué el glob `TaskFlow.Api/**/*.cs` y no `**/*.cs`?** Si aplicara a todo el C#, estas reglas de endpoints (`AsNoTracking`, `Results.Problem`) también cargarían al editar tests, donde no aplican. Acotarlo al proyecto de la API mantiene cada capa con sus propias reglas. Ese es el punto de `applyTo`.

---

### Paso 2.2: Crea las instructions de tests

Crea **`.github/instructions/tests.instructions.md`**:

```markdown
---
applyTo: "**/*Tests*.cs,**/*Test.cs"
---

# Convenciones de tests

- Framework: xUnit + FluentAssertions.
- Patrón Arrange-Act-Assert con comentarios `// Arrange`, `// Act`, `// Assert`.
- Tests de integración con `WebApplicationFactory<Program>`.
- Aísla la BD InMemory por test: `UseInMemoryDatabase($"TaskFlow-{Guid.NewGuid()}")`.
- Nombres descriptivos: `Metodo_Escenario_ResultadoEsperado`.
```

**¿Por qué un archivo aparte para los tests?** Sus convenciones (AAA, `WebApplicationFactory`, aislamiento InMemory) no tienen que ver con las de endpoints. Con su propio glob cargan **solo** al editar un archivo de test — y no ensucian el contexto cuando trabajas en la API.

---

### Paso 2.3: Crea las instructions de Angular

Crea **`.github/instructions/angular.instructions.md`**:

```markdown
---
applyTo: "TaskFlow.Web/**/*.ts,TaskFlow.Web/**/*.html,TaskFlow.Web/**/*.scss"
---

# Convenciones Angular 19

- Standalone components (sin NgModules).
- `signal()` para estado; `inject()` en vez de constructor.
- Control flow `@if`/`@for` (no `*ngIf`/`*ngFor`); sin `CommonModule`.
- Rutas con lazy `loadComponent`.
- URL del API desde `environment.apiUrl`, nunca hardcodeada.
```

**¿Por qué separado del C#?** Es otra capa, otro lenguaje, otras reglas. El glob apunta solo a `TaskFlow.Web/`, así que Copilot aplica esto al tocar un `.ts`/`.html`/`.scss` del frontend — y las reglas de C# ni aparecen.

---

### Paso 2.4: Crea las instructions de tests Angular

Crea **`.github/instructions/angular-tests.instructions.md`**:

```markdown
---
applyTo: "TaskFlow.Web/**/*.spec.ts"
---

# Convenciones de tests Angular

- Jasmine + Karma.
- `TestBed` con `provideHttpClientTesting`.
- `HttpTestingController` para verificar las llamadas HTTP.
- `fixture.detectChanges()` para disparar la detección de cambios.
```

**Fíjate en el glob:** es más específico que el de Angular (`.spec.ts` dentro de `TaskFlow.Web/`). Demuestra que puedes tener **varias instructions para la misma tecnología** con globs cada vez más finos: la regla general de Angular (2.3) y la de sus tests (2.4) conviven sin pisarse.

---

### Paso 2.5: Pruébalos

Ahora que tus instructions existen, comprueba que Copilot las aplica **solo por tocar un archivo que matchea el glob** — sin que se lo recuerdes.

**Prueba backend — pide un test sin explicar tu estilo:**

```
Genera tests para el endpoint de crear tareas.
```

**Verificar:** ¿Usa Arrange-Act-Assert? ¿FluentAssertions? ¿Nombres descriptivos?

**Prueba frontend — pide un componente:**

```
Crea un componente para mostrar el detalle de una tarea.
```

**Verificar:** ¿Es standalone? ¿Usa `inject()` en vez de constructor? ¿Usa `@if` en vez de `*ngIf`?

> **Punto clave:** Copilot aplica las reglas **solo porque esta tocando un archivo que matchea el glob**. Las reglas globales siguen activas; las especificas se suman cuando corresponde.

**Deshaz los cambios** antes de continuar (borra solo el código de demo — tu configuración se queda):

```bash
git restore TaskFlow.Api TaskFlow.Web TaskFlow.Tests && git clean -fd TaskFlow.Api TaskFlow.Web TaskFlow.Tests
```

---

## Ejercicio 3: Prompt Files (slash commands reutilizables)

> **Objetivo:** convertir un prompt largo y repetido en **un comando**.

> Aquí tienes el contenido completo de los dos prompt files. Créalos en `.github/prompts/` (o genera un borrador con **`/create-prompt`** y pégalo).

---

### Paso 3.1: Prompt para recursos backend

Crea **`.github/prompts/nuevo-recurso.prompt.md`**:

````markdown
---
description: Crea un recurso CRUD completo con DTOs, validadores, endpoints y tests.
argument-hint: recurso=<NombreDelRecurso>
agent: agent
---

# Nuevo recurso CRUD: ${input:recurso:NombreDelRecurso}

Crea una feature completa para el recurso **${input:recurso}** siguiendo la arquitectura del proyecto.

> En los pasos, `{Recurso}` es el nombre en **PascalCase** y `{recurso}` en **minusculas** (para carpetas, archivos y rutas URL). Mira `Features/Tasks/` como referencia del patron.

1. **Entidad** en `Domain/{Recurso}.cs`
2. **DTOs** en `Features/{Recurso}s/{Recurso}Dto.cs`:
   - `{Recurso}Response` (record)
   - `Create{Recurso}Request` (record)
   - `Update{Recurso}Request` (record)
3. **Validadores** en `Features/{Recurso}s/{Recurso}Validators.cs` con FluentValidation
4. **Endpoints** en `Features/{Recurso}s/{Recurso}Endpoints.cs`:
   - GET /{recurso}s — listar todos
   - GET /{recurso}s/{id:int} — obtener por id
   - POST /{recurso}s — crear
   - PUT /{recurso}s/{id:int} — actualizar
   - DELETE /{recurso}s/{id:int} — eliminar
5. **Registrar** los endpoints en `Program.cs`
6. **Tests** en `TaskFlow.Tests/{Recurso}EndpointsTests.cs`
7. Actualizar el `DbContext` si hace falta

Si no se especifican las propiedades de la entidad, **pregunta al usuario** antes de asumirlas.

Sigue todas las convenciones del proyecto (DTOs, validacion, Results.Problem, nombres).
````

> **Sintaxis de parámetros (lo no obvio):** `${input:recurso:NombreDelRecurso}` es la sintaxis **oficial** de VS Code para pedir un valor, y `argument-hint` en el frontmatter sugiere qué escribir. Al invocarlo pasas el binding con `recurso=...`. **No existe** la sintaxis `{{variable}}` ni filtros tipo `| lowercase` — por eso el casing (`{Recurso}` vs `{recurso}`) se describe en prosa y lo aplica el agente al generar.

---

### Paso 3.2: Prompt para componentes Angular

Crea **`.github/prompts/nuevo-componente.prompt.md`**:

````markdown
---
description: Crea un componente Angular completo con servicio, modelo, ruta y test.
argument-hint: recurso=<NombreDelRecurso>
agent: agent
---

# Nuevo componente Angular: ${input:recurso:NombreDelRecurso}

Crea una feature completa en el frontend Angular para el recurso **${input:recurso}**.

> En los pasos, `{Recurso}` es el nombre en **PascalCase** y `{recurso}` en **minusculas** (para carpetas, archivos y rutas). Mira `features/tasks/` como referencia.

> **Prerequisito:** el recurso debe existir en el backend para poder espejar sus DTOs.

1. **Modelo** en `TaskFlow.Web/src/app/models/{recurso}.model.ts`:
   - Interfaces `{Recurso}Response`, `Create{Recurso}Request`, `Update{Recurso}Request`
   - Deben espejar los DTOs del backend

2. **Servicio** en `TaskFlow.Web/src/app/services/{recurso}.service.ts`:
   - CRUD completo con `HttpClient`
   - `{ providedIn: 'root' }`
   - Usa `inject(HttpClient)` y `environment.apiUrl`

3. **Componente** en `TaskFlow.Web/src/app/features/{recurso}s/{recurso}-list.component.ts`:
   - Standalone component con signals
   - Formulario de creacion
   - Lista con acciones (editar, eliminar)
   - Manejo de errores con signal `error`

4. **Ruta** en `app.routes.ts`:
   - Lazy loading con `loadComponent`

5. **Navegacion** en `app.component.ts`:
   - Agregar link en la nav

6. **Test** en `TaskFlow.Web/src/app/services/{recurso}.service.spec.ts`:
   - Test basico del servicio con `provideHttpClientTesting`
   - Verifica que las llamadas HTTP apuntan a las URLs correctas

Sigue las convenciones de Angular del proyecto (signals, inject, standalone, @if/@for).
````

> **Por qué separar backend y frontend en dos prompts:** cada uno vive en su capa y se invoca por separado (`/nuevo-recurso` primero, `/nuevo-componente` después, cuando el backend ya expone los DTOs a espejar).

---

### Paso 3.3: Usarlos

**Backend:**

```
/nuevo-recurso recurso=Notification
```

Un solo comando genera toda la feature de "Notification" en el backend. (Tambien puedes anadir contexto libre tras el comando, p. ej. `/nuevo-recurso recurso=Notification con campos title y read`.)

> **Si Copilot te pregunta las propiedades, es el guardarraíl del prompt funcionando** — no está fallando. El prompt dice *"si no se especifican las propiedades, pregunta antes de asumirlas"*, así que en vez de alucinar el modelo, te lo pide. Respóndele algo consistente con el proyecto:
>
> - **Propiedades:** `Title:string (requerido), Message:string (requerido), IsRead:bool (default false), CreatedAt:DateTime (lo asigna el servidor)`
> - **Reglas:** `Title requerido y max 200. Message requerido. IsRead por defecto false. CreatedAt no viene en el request.`
>
> (Encajan con el patrón existente: `Title` como en `TaskValidators`, `IsRead` como `IsCompleted`, `CreatedAt` server-side.) **Un buen prompt pregunta en vez de asumir** — ese es el punto.

**Frontend:**

```
/nuevo-componente recurso=Notification
```

Un solo comando genera toda la feature en Angular.

> **Diferencia con skills:** un **prompt file** lo invocas tu (`/comando`). Un **skill** lo puede cargar Copilot **solo** cuando detecta que aplica.

**Deshaz los cambios** antes de continuar (borra solo el código de demo — tu configuración se queda):

```bash
git restore TaskFlow.Api TaskFlow.Web TaskFlow.Tests && git clean -fd TaskFlow.Api TaskFlow.Web TaskFlow.Tests
```

---

## Ejercicio 4: Custom Agents (roles)

> **Objetivo:** crear "personas" especializadas con sus propias instrucciones.

> Aquí tienes los tres agentes completos. Créalos en `.github/agents/` (o genera un borrador con **`/create-agent`** y pégalo).

---

### Paso 4.1: Agente revisor

Crea **`.github/agents/revisor.agent.md`**:

`````markdown
---
name: revisor
description: Revisa codigo C# y Angular buscando problemas de convenciones, seguridad y calidad. Solo reporta, no edita.
tools: ['search/codebase', 'search/usages', 'web/fetch']
---

# Agente Revisor

Eres un revisor de codigo senior especializado en .NET y Angular. Tu trabajo es **revisar, no editar**.

> Este agente declara solo tools de lectura/busqueda (sin `edit`), asi que puede explorar el codebase pero **no puede modificar archivos** — el patron oficial de agente solo-lectura. Una lista vacia `tools: []` lo dejaria sin poder leer el codigo.

## Que revisas

### Backend (.NET)
- Que se usen DTOs y no se expongan entidades directamente.
- Que la validacion use FluentValidation.
- Que los errores usen `Results.Problem` / `ProblemDetails`.
- Convenciones de nombres (PascalCase, camelCase, _camelCase).
- Que los tests sigan Arrange-Act-Assert.
- Que los endpoints tengan tests correspondientes.
- Posibles problemas de seguridad o rendimiento.

### Frontend (Angular)
- Que los componentes sean standalone (sin NgModules).
- Que usen `inject()` en lugar de constructor injection.
- Que usen `@if`/`@for` en lugar de `*ngIf`/`*ngFor`.
- Que no importen `CommonModule` innecesariamente.
- Que los modelos espejen los DTOs del backend.

## Formato de reporte

Para cada hallazgo indica:
- **Archivo y linea**
- **Severidad**: error | warning | sugerencia
- **Descripcion** del problema
- **Recomendacion** de como corregirlo

### Ejemplo

```
- TaskEndpoints.cs:17 | warning | El MapGet devuelve entidades sin mapear a DTO
  → Crear TaskResponse record y usar MapToResponse()
```

No hagas cambios en el codigo. Solo reporta.
`````

> **La clave está en `tools:`.** Al declarar solo herramientas de lectura/búsqueda (sin `edit`), el agente **puede leer el codebase pero no modificarlo** — es el patrón oficial de agente solo-lectura. Una lista vacía `tools: []` lo dejaría ciego (sin poder leer). Eso es lo que garantiza que "revisa, no edita".

---

### Paso 4.2: Agente API Builder

Crea **`.github/agents/api-builder.agent.md`**:

````markdown
---
name: api-builder
description: Especialista en construir endpoints con Minimal APIs de .NET 10. Crea endpoints, DTOs y validadores.
---

# Agente API Builder

Eres un desarrollador especializado en **Minimal APIs de .NET 10**. Tu foco es construir endpoints RESTful completos.

## Tu flujo de trabajo

1. Analiza el recurso solicitado.
2. Crea la entidad de dominio si no existe.
3. Crea DTOs de request y response como `record`.
4. Crea validadores con FluentValidation.
5. Implementa endpoints CRUD en un `MapGroup`.
6. Registra los endpoints en `Program.cs`.
7. Añade el `DbSet` al contexto si es necesario.

## Reglas

- Siempre usa DTOs, nunca expongas entidades.
- Valida con FluentValidation antes de procesar.
- Usa `Results.Problem` para errores.
- Usa `AsNoTracking()` en lecturas.
- Organiza por feature: `Features/{Recurso}/`.
````

---

### Paso 4.3: Agente Frontend Builder

Crea **`.github/agents/frontend-builder.agent.md`**:

````markdown
---
name: frontend-builder
description: Especialista en Angular 19. Crea componentes, servicios y rutas con standalone components y signals.
---

# Agente Frontend Builder

Eres un desarrollador especializado en **Angular 19** con standalone components. Tu foco es construir features de UI conectadas al backend .NET.

## Tu flujo de trabajo

1. Analiza el recurso o feature solicitada.
2. Crea o actualiza el modelo (interface) espejando los DTOs del backend.
3. Crea el servicio HTTP con CRUD completo.
4. Implementa el componente standalone con signals y el nuevo control flow.
5. Registra la ruta con lazy loading.
6. Actualiza la navegación si es necesario.

## Reglas

- Siempre usa standalone components (sin NgModules).
- Usa `signal()` y `computed()` para estado reactivo, no propiedades mutables.
- Inyecta con `inject()`, no por constructor.
- Usa `@if`, `@for`, `@switch` en templates.
- Los modelos deben espejar exactamente los DTOs del backend.
- Maneja errores de HTTP mostrando feedback al usuario.
- Usa lazy loading con `loadComponent` en las rutas.
````

> **Instructions vs Agents:** las instructions (Ejercicio 2) aplican a **todo** el chat según el archivo que tocas. Un agente es un **rol** que eliges: cambia el foco y las reglas de *esa* conversación. Nota que `api-builder` y `frontend-builder` no declaran `tools:` → heredan todas (pueden escribir); el `revisor` sí las restringe.

---

### Paso 4.4: Usarlos

En el selector de agente del chat, elige **revisor** y pide:

```
Revisa la feature Tasks.
```

**Verificar:** El revisor reporta hallazgos con severidad pero **no edita** codigo.

Cambia al **api-builder** y pide:

```
Crea un endpoint para buscar tareas por titulo.
```

**Verificar:** Sigue el patron de Minimal APIs, DTOs, FluentValidation.

> **Punto clave:** Cambias de rol en un clic, sin volver a explicar que esperas de un "revisor" o un "builder". El rol vive en el repo.

> **Agents vs Prompt Files:** ambos pueden generar codigo, pero cumplen roles distintos. Usa un **prompt file** (`/nuevo-recurso`) cuando quieras un resultado one-shot y predecible — siempre los mismos pasos. Usa un **agent** (`api-builder`) cuando quieras una conversacion iterativa donde el agente toma decisiones segun el contexto.

**Deshaz los cambios** antes de continuar (borra solo el código de demo — tu configuración se queda):

```bash
git restore TaskFlow.Api TaskFlow.Web TaskFlow.Tests && git clean -fd TaskFlow.Api TaskFlow.Web TaskFlow.Tests
```

---

## Ejercicio 5: Agent Skills (capacidades reutilizables)

> **Objetivo:** capacidades que Copilot **carga solo cuando hace falta** — no saturan el contexto.

> Aquí tienes los dos skills completos. Créalos en `.github/skills/<nombre>/SKILL.md` (o genera un borrador con **`/create-skill`** y pégalo).

> **Esto existe de verdad, a escala:** Angular publica [skills oficiales](https://angular.dev/ai/agent-skills) (`angular-developer`, `angular-new-app`) — misma idea que este ejercicio. Ojo al matiz: se instalan con `npx skills add https://github.com/angular/skills` (pensados para Gemini CLI / skills.sh), no como los `.github/skills/*/SKILL.md` de VS Code. Mismo concepto portable, distinto mecanismo de instalación.

---

### Paso 5.1: Skill de migraciones EF Core

Crea **`.github/skills/migracion-ef/SKILL.md`**:

`````markdown
---
name: migracion-ef
description: Crea y aplica migraciones de EF Core en TaskFlow. Usalo cuando cambien las entidades del dominio, el modelo de datos, o necesites actualizar el esquema de base de datos.
---

# Migracion de EF Core

## Cuando usar

Cuando se modifica una entidad en `Domain/`, se anade un nuevo `DbSet` al contexto, o se cambia la configuracion del modelo.

## Procedimiento

1. Verifica que los cambios en las entidades compilan: `dotnet build`
2. Crea la migracion:
   ```bash
   dotnet ef migrations add <NombreDescriptivo> --project TaskFlow.Api
   ```
3. Revisa el archivo de migracion generado en `Migrations/`.
4. Aplica la migracion:
   ```bash
   dotnet ef database update --project TaskFlow.Api
   ```

## Script auxiliar

Este skill incluye `crear-migracion.sh` que automatiza los pasos de **build + add + update** en un solo comando. Ejecutalo desde la raiz del repo:

```bash
bash .github/skills/migracion-ef/crear-migracion.sh AddDueDateToTask
```

El script compila, crea la migracion y la aplica (`set -e`, falla rapido). **No** cubre el paso 3 (revisar la migracion generada): hazlo a mano antes de aplicar en un proyecto real.

## Nota sobre InMemory

Este proyecto usa `InMemoryDatabase` para desarrollo. Con InMemory, las migraciones **se crean pero no tienen efecto real** — el esquema se genera en memoria al iniciar. Este skill es pedagogico: demuestra el procedimiento para cuando uses un proveedor real (SQL Server, PostgreSQL, etc.).

## Convenciones

- Nombres de migracion descriptivos: `AddDueDateToTask`, `CreateNotificationsTable`.
- Una migracion por cambio logico — no agrupar cambios no relacionados.
`````

Y su **script auxiliar** en la misma carpeta, `.github/skills/migracion-ef/crear-migracion.sh`:

```bash
#!/bin/bash
# Uso: ./crear-migracion.sh NombreDeLaMigracion
set -e

MIGRATION_NAME=${1:?"Uso: $0 <NombreDeLaMigracion>"}

echo "Compilando el proyecto..."
dotnet build TaskFlow.Api

echo "Creando migración: $MIGRATION_NAME"
dotnet ef migrations add "$MIGRATION_NAME" --project TaskFlow.Api

echo "Aplicando migración..."
dotnet ef database update --project TaskFlow.Api

echo "Migración '$MIGRATION_NAME' creada y aplicada."
```

> **Lo no obvio (el frontmatter):** Copilot solo lee `name` + `description` de *todos* tus skills al abrir el chat (barato), y **carga el cuerpo completo solo cuando tu tarea coincide** con la `description`. Por eso puedes tener muchos skills sin saturar el contexto.

> **Detalle que rompe un skill en silencio:** el `name` **debe coincidir** con el nombre de la carpeta (`migracion-ef`). Si no coinciden, el skill no carga y no hay error visible. Además, un skill **puede traer archivos** junto al `SKILL.md` — aquí, el `.sh`.

---

### Paso 5.2: Skill caveman-mode (ahorro de tokens)

Crea **`.github/skills/caveman-mode/SKILL.md`** (reduce el consumo de tokens 50-70% con respuestas ultra-breves, sin perder calidad técnica):

`````markdown
---
name: caveman-mode
description: Modo caveman — respuestas ultra-breves para ahorrar tokens. Activalo cuando pidas modo caveman, respuestas concisas, bajo consumo de tokens, reducir verbosidad, ser breve, o respuestas cortas.
---

# Caveman Mode — Modo ahorro de tokens

Persona: un experto de pocas palabras, humor seco. Aplica estas reglas de comunicacion a todas tus respuestas mientras este skill este activo. Tu capacidad tecnica no cambia; solo cambia la forma de comunicar.

## Reglas de comunicacion

- **Maximo una frase por idea.** No elaborar salvo que lo pidan.
- **Objetivo: 50-70% menos tokens** que una respuesta normal.
- **Formato:** bullets, bloques de codigo cortos, tablas. Nada de parrafos en prosa.
- **Frases de 3-6 palabras.** Eliminar articulos innecesarios.
- **Sin relleno:** nada de "Aqui tienes lo que hice", saludos, resumenes, meta-comentarios, disculpas.
- **Sin emojis.**
- **Si algo es ambiguo:** una sola pregunta directa, nada mas.

## Que NO cambia

- **El codigo se escribe igual:** legible, bien formateado, con las convenciones del proyecto.
- **Acceso completo a herramientas:** igual que en modo normal.
- **Calidad tecnica:** misma calidad de analisis y decisiones.

## Cuando expandir (excepciones)

- El usuario pide "explica" -> dar contexto, pero seguir breve.
- Logica compleja necesita pseudocodigo -> proporcionarlo.

## Volver al modo normal

Este skill no es un interruptor: aplica mientras la conversacion lo mantenga en contexto. Para volver al tono normal, pide explicitamente "responde normal, sin modo breve" o empieza un chat nuevo.

## Ejemplos

### Normal (sin caveman)
> He analizado tu codigo y encontre que el endpoint de Tasks no esta usando DTOs para la respuesta.
> Esto viola las convenciones del proyecto que dicen que nunca debemos exponer entidades de dominio.
> Voy a crear un TaskResponse record y modificar el endpoint para usarlo.
> (3 frases, ~45 palabras)

### Caveman
> Endpoint Tasks expone entidad directamente. Creo TaskResponse DTO. Corrijo.
> (3 frases, ~10 palabras — 78% menos tokens)
`````

**Por qué es un skill y no un agent:** como skill se **apila** con cualquier agent — puedes usar `api-builder` en modo caveman sin duplicar instrucciones. Un agent sería exclusivo (eliges uno u otro), no podrías combinarlo.

**Pruébalo** — invócalo a mano con `/caveman-mode`, o deja que se auto-cargue por su `description`:

```
Se breve, ahorra tokens. Crea un endpoint para filtrar proyectos por nombre.
```

---

### Paso 5.3: Carga automatica

Pide algo que *encaje con la descripcion* del skill migracion-ef sin nombrarlo:

```
Anadi un campo DueDate a la entidad TaskItem. Necesito reflejarlo en la base de datos.
```

Asi decide Copilot que skill cargar — solo lee el frontmatter (barato) y expande el cuerpo del que coincide:

```text
1) Al abrir el chat: Copilot lee SOLO name + description (barato)
   +--------------------------------------------------+
   | migracion-ef  ->  "migraciones EF Core, modelo"  |
   | caveman-mode  ->  "ahorro de tokens, ser breve"  |
   +--------------------------------------------------+

2) Pides: "anadi DueDate, reflejalo en la base de datos"
                          |
                          v   compara con cada description
   +--------------------------------------------------+
   | migracion-ef  MATCH  -> carga el cuerpo completo |
   | caveman-mode   no    -> sigue dormido (0 costo)  |
   +--------------------------------------------------+
```

**Verificar:** Copilot detecta que tu tarea coincide con la `description` del skill, **carga el procedimiento por su cuenta** y sigue los pasos.

> **Si no se carga automaticamente:** la auto-carga depende de que la descripcion del skill coincida con tu peticion. Si no funciona, invocalo directamente con `/migracion-ef`. Ambas formas son validas.

> **Instructions vs Skills:** las *instructions* son reglas siempre presentes (el *como* escribir). Los *skills* son procedimientos cargados bajo demanda (el *como hacer una tarea concreta*). Los skills pueden traer scripts y son portables entre herramientas.

**Deshaz los cambios** antes de continuar (borra solo el código de demo — tu configuración se queda):

```bash
git restore TaskFlow.Api TaskFlow.Web TaskFlow.Tests && git clean -fd TaskFlow.Api TaskFlow.Web TaskFlow.Tests
```

---

## Ejercicio 6: MCP (conectar Copilot a tus herramientas)

> **Objetivo:** que Copilot trabaje con datos y servicios reales, no solo con el codigo.

> A diferencia de los ejercicios anteriores, MCP no tiene un comando `/create-*`: creas `.vscode/mcp.json` a mano o con el comando **MCP: Add Server** de VS Code. Aquí tienes el archivo completo.

---

### Paso 6.1: Crear la configuracion

Crea **`.vscode/mcp.json`** con tres servidores — cada uno cubre una necesidad real de *este* proyecto:

- **github** (HTTP): datos reales del repo (issues, PRs).
- **microsoft.docs.mcp** (HTTP): doc oficial y al día de .NET / ASP.NET / EF Core — para el **backend**.
- **angular-cli** (stdio): doc + tooling de Angular 19 (busca en la doc, best practices, corre build/test) — para el **frontend**.

```json
{
  "servers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/"
    },
    "microsoft.docs.mcp": {
      "type": "http",
      "url": "https://learn.microsoft.com/api/mcp"
    },
    "angular-cli": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@angular/cli", "mcp"],
      "cwd": "${workspaceFolder}/TaskFlow.Web"
    }
  }
}
```

> **El beneficio (por qué estos tres):** el modelo conoce versiones más viejas que las tuyas (.NET 10, Angular 19). Los MCP de doc le dan la **referencia real y actual** en vez de que la adivine — menos alucinaciones de API. Y el Angular MCP hace **más que doc**: lee `angular.json` y corre `build`/`test`/`lint`. Los tres son **oficiales y sin API key**.

> **`type` y `cwd`:** `http` para servers remotos, `stdio` para procesos locales (el campo `type` es requerido). El `angular-cli` lleva `cwd: "${workspaceFolder}/TaskFlow.Web"` porque el `angular.json` vive en esa subcarpeta, no en la raíz — sin eso, sus tools de workspace (`list_projects`, `run_target`) no encontrarían el proyecto.

---

### Paso 6.2: Usarlo

Prueba los tres servidores:

**Datos del repo (github):**
```
Lista los issues abiertos de este repo y propon en cuales podriamos
empezar por la feature de notificaciones.
```

**Doc de backend (microsoft.docs.mcp):**
```
¿Como configuro un indice unico con Fluent API en EF Core 10? Usa la doc oficial.
```

**Doc de frontend (angular-cli):**
```
Dame las best practices oficiales de Angular 19 para componentes standalone
con signals, consultando la doc.
```

**Verificar:** Copilot consulta datos y documentación **reales y actuales**, no lo que "medio recuerda" del entrenamiento.

> **Seguridad:** revisa siempre qué hace un servidor MCP antes de conectarlo. Las aprobaciones de VS Code cubren edición de archivos, ejecución de comandos y uso de herramientas (no solo la terminal). Ojo: `angular-cli` corre `npx -y @angular/cli`, que **descarga y ejecuta** un paquete de npm (riesgo de cadena de suministro); los servers HTTP (`github`, `microsoft.docs.mcp`) envían tus prompts a un servicio remoto.

---

### Paso 6.3: Disciplina de costo

| Accion | Consume peticiones premium? |
|--------|---------------------|
| Inline completions | No |
| NES (Next Edit Suggestions) | No |
| Inline chat (`Cmd+I`) | Si |
| Chat panel | Si |
| Agent Mode | Si (mas: contexto + tools) |
| Instructions / Skills / MCP config | No (son archivos de texto) |

**Reglas de eficiencia:**

1. **El 70% del valor diario (inline + NES) es gratis** — usarlo primero
2. **Las instrucciones son texto plano** — cero costo, maximo impacto
3. **Activar `/caveman-mode`** cuando necesites muchas iteraciones rapidas
4. **Habilita solo los MCP/tools que uses**: cada tool activa consume contexto (hay un tope practico de tools por chat), asi que no dejes servers encendidos "por si acaso"

---

## Ejercicio 7: Todo Junto — El Efecto Compuesto

> **Objetivo:** ver como las capas se suman.

---

### Paso 7.1: El prompt de una frase

Empieza una conversacion **nueva y limpia** y pide:

```
Quiero una nueva feature "Notifications": un recurso para crear y listar
notificaciones de un usuario. Que cambie el modelo de datos si hace falta.
Al terminar, resume que archivos generaste y que convencion aplico cada capa.
```

**Observa, sin que tu lo digas, como entran en juego todas las capas:**

- `copilot-instructions.md` (o `AGENTS.md`) → stack, DTOs, manejo de errores, nombres
- `csharp.instructions.md` / `angular.instructions.md` → estilo por capa
- `tests.instructions.md` → patron de tests al tocar archivos `.Tests.cs`
- El skill `migracion-ef` → se autocarga porque cambia el modelo de datos
- (Si usas) `/nuevo-recurso` o `/nuevo-componente`
- Los agents `api-builder` / `frontend-builder` si los seleccionas
- MCP → si necesita datos del repo

Visto como diagrama: una frase entra, Copilot ensambla el contexto de cada capa por su cuenta, y sale una feature completa:

```text
            "Crea la feature Notifications"   (1 frase)
                            |
                            v
                +-----------------------+
                |  Copilot (Agent mode) |
                +-----------------------+
                            |  ensambla el contexto de cada capa
      +----------+---------+----------+-----------+----------+
      v          v         v          v           v          v
  copilot-   *.instr.    SKILL     /prompt    *.agent.md    MCP
  instr.     por glob   on-match   /comando    si eliges   si data
  (siempre)  C# / NG    migrac-ef  nuevo-*     builders    issues
      +----------+---------+----------+-----------+----------+
                            |
                            v
        +---------------------------------------------+
        | Feature completa, sin repetir convenciones: |
        | entidad + DTOs + validador + endpoints +    |
        | tests + componente + servicio + ruta        |
        +---------------------------------------------+
```

### El antes y el despues

| | "Vibe coding" (Ej. 0) | Con el marco (Ej. 7) |
|---|---|---|
| Contexto | Lo escribes en cada prompt | Vive en el repo |
| Consistencia | Depende de que recuerdes | Garantizada por config |
| Equipo | Cada uno a su manera | Todos comparten la config |
| Cambiar de maquina | Pierdes tus "prompts buenos" | `git clone` y listo |
| Prompt tipico | 3 parrafos | 1 frase |

---

### Paso 7.2: Crea tu propia customization (opcional)

Hasta ahora usaste archivos pre-construidos. Ahora crea uno desde cero:

**Opcion A — Instruction:** Usa `/create-instruction` para crear una instruction nueva. Por ejemplo, una que aplique solo a archivos SCSS con reglas de estilo.

**Opcion B — Skill:** Usa `/create-skill` para crear un skill. Por ejemplo, uno que ejecute `dotnet test` y explique los fallos.

**Opcion C — Agent:** Usa `/create-agent` para crear un agente. Por ejemplo, uno que escriba documentacion en espanol.

> **Por que importa:** Configurar archivos que ya existen es util, pero la habilidad real es saber **crear nuevas customizations** para tu proyecto. Este paso te lleva de consumidor a creador.

> **Cierre:** No escribiste mejores prompts. **Dejaste de necesitarlos.** Ese es el cambio de mentalidad.

---

## Referencia Rapida

### Que uso cuando

| Necesidad | Customization |
|-----------|--------------|
| Regla de estilo siempre valida | **Instructions** (`copilot-instructions.md`) |
| Solo aplica a ciertos archivos | **`*.instructions.md`** con `applyTo` |
| Prompt largo que repito | **Prompt file** (`/comando`) |
| Quiero un rol (revisor, builder) | **Custom agent** |
| Procedimiento con pasos/scripts, carga bajo demanda | **Skill** |
| Datos o herramientas externas | **MCP** |
| Respuestas breves para ahorrar tokens | **Skill** (`/caveman-mode`) |

### 5 Niveles de Personalizacion

| Nivel | Archivo | Se activa | Proposito |
|-------|---------|-----------|-----------|
| 1 | `copilot-instructions.md` / `AGENTS.md` | Siempre | Reglas globales del proyecto |
| 2 | `*.instructions.md` + `applyTo` | Al editar archivo que matchea | Convenciones por capa |
| 3 | `*.prompt.md` | Al invocar `/nombre` | Comandos reutilizables |
| 4 | `SKILL.md` | Al detectar intent o invocar `/nombre` | Workflows bajo demanda |
| 5 | `*.agent.md` | Al seleccionar del dropdown | Agentes especializados |

### Estructura del Repo

```
TaskFlow/
├── .github/
│   ├── copilot-instructions.md              # Ej. 1 — siempre activo
│   ├── instructions/                        # Ej. 2 — por glob (applyTo)
│   │   ├── csharp.instructions.md           #   → TaskFlow.Api/**/*.cs
│   │   ├── tests.instructions.md            #   → **/*Tests*.cs,**/*Test.cs
│   │   ├── angular.instructions.md          #   → TaskFlow.Web/**/*.ts,*.html,*.scss
│   │   └── angular-tests.instructions.md    #   → TaskFlow.Web/**/*.spec.ts
│   ├── prompts/                             # Ej. 3 — /comando
│   │   ├── nuevo-recurso.prompt.md          #   /nuevo-recurso recurso=Entidad
│   │   └── nuevo-componente.prompt.md       #   /nuevo-componente recurso=Entidad
│   ├── agents/                              # Ej. 4 — roles
│   │   ├── revisor.agent.md                 #   Solo reporta, no edita
│   │   ├── api-builder.agent.md             #   Minimal APIs .NET
│   │   └── frontend-builder.agent.md        #   Angular 19
│   └── skills/                              # Ej. 5 — bajo demanda
│       ├── migracion-ef/                    #   Migraciones EF Core
│       │   ├── SKILL.md
│       │   └── crear-migracion.sh           #   script auxiliar del skill
│       └── caveman-mode/SKILL.md            #   Ahorro de tokens
├── .vscode/
│   └── mcp.json                             # Ej. 6 — MCP servers
├── .claude/
│   └── launch.json                          # config del dev server (preview)
├── TaskFlow.slnx                            # solucion (.NET)
├── TaskFlow.Api/                            # .NET 10 Minimal API
├── TaskFlow.Web/                            # Angular 19
└── TaskFlow.Tests/                          # xUnit + FluentAssertions
```

### Endpoints del API

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/tasks` | Listar tareas |
| GET | `/tasks/{id:int}` | Obtener tarea |
| POST | `/tasks` | Crear tarea |
| PUT | `/tasks/{id:int}` | Actualizar tarea |
| DELETE | `/tasks/{id:int}` | Eliminar tarea |
| GET | `/projects` | Listar proyectos |
| GET | `/projects/{id:int}` | Obtener proyecto |
| POST | `/projects` | Crear proyecto |
| PUT | `/projects/{id:int}` | Actualizar proyecto |
| DELETE | `/projects/{id:int}` | Eliminar proyecto |

---

## Troubleshooting

| Problema | Solucion |
|----------|----------|
| `dotnet run` falla con "address already in use" | Matar el proceso: `lsof -ti:5100 \| xargs kill` |
| `npm install` falla con E401 | Registry corporativo con token expirado. Usar: `npm install --registry https://registry.npmjs.org` |
| Angular CLI no encontrado | Usar el binario local: `./node_modules/.bin/ng serve` |
| Puerto 5000 en uso (macOS) | AirPlay usa 5000. La API ya usa 5100 |
| CORS error en el browser | Verificar que el backend tiene `app.UseCors()` en Program.cs |
| Skill no carga | Verificar que el `name` en SKILL.md coincide con el nombre de la carpeta |
| `applyTo` no aplica | Verificar el glob pattern. Abrir **References** en la respuesta del chat |
| Angular muestra pagina en blanco | Verificar consola del browser (F12). Puede faltar un import |
| Tests de integracion no arrancan | `WebApplicationFactory<Program>` levanta la API en memoria — **no** hace falta correr el API en :5100. Verifica que `Program.cs` tenga `public partial class Program;` |
| `dotnet build` falla | Ejecutar `dotnet restore TaskFlow.Api` primero |
| Quiero deshacer lo que generó Copilot | Solo el código de demo (conserva tu config): `git restore TaskFlow.Api TaskFlow.Web TaskFlow.Tests && git clean -fd TaskFlow.Api TaskFlow.Web TaskFlow.Tests`. `git clean -nd <ruta>` muestra qué borraría. Ojo: `git clean -fd` sin ruta también borra tu config no commiteada. `Cmd+Z` no basta si creó archivos nuevos |

---

## Recursos Adicionales

### Documentacion

- [Customizacion de agentes en VS Code](https://code.visualstudio.com/docs/agent-customization/overview)
- [Custom instructions](https://code.visualstudio.com/docs/agent-customization/custom-instructions)
- [Agent Skills](https://code.visualstudio.com/docs/agent-customization/agent-skills)
- [Custom agents](https://code.visualstudio.com/docs/agent-customization/custom-agents)
- [Prompt files](https://code.visualstudio.com/docs/agent-customization/prompt-files)
- [MCP servers](https://code.visualstudio.com/docs/agent-customization/mcp-servers)
- [Estandar Agent Skills](https://agentskills.io)
- [Awesome Copilot](https://github.com/github/awesome-copilot)
- [.NET 10](https://dotnet.microsoft.com/download)
- [Angular 19](https://angular.dev)

### FAQ

**¿Puedo usar esto en mi proyecto real?**
Si. Todo el harness (`.github/`) es portable. Copia la estructura, ajusta las instrucciones a tu dominio y stack.

**¿Las customizations son gratis?**
Si. Son archivos de texto — cero costo. Lo que consume peticiones premium es la conversacion de Copilot que los lee.

**¿Que pasa si Copilot genera codigo incorrecto?**
Itera. El feedback loop es: generar → verificar → corregir. Con las instrucciones bien configuradas, la primera generacion es mucho mas precisa.

**¿Las instructions afectan al autocompletado inline?**
No. Aplican al chat (Ask, Plan, Agent), a Copilot code review y al coding agent — **no** al autocompletado inline ni a NES, que usan el contexto del archivo abierto.

**¿Puedo tener muchos skills sin saturar el contexto?**
Si. Copilot solo lee `name` + `description` de cada skill. Carga el cuerpo completo solo cuando la tarea coincide.

---

> Workshop inspirado en [acquirer-lite](https://github.com/enriquecordero/acquirer-lite), reenfocado hacia un stack Angular + .NET con el **marco de customization** de VS Code. Material para fines educativos.
