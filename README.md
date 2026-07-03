# Workshop: GitHub Copilot Avanzado en .NET + Angular — Configura una vez, deja de repetir prompts

## Tabla de Contenidos

- [Introduccion](#introduccion)
- [Conceptos Clave de GitHub Copilot](#conceptos-clave-de-github-copilot)
- [Pre-requisitos](#pre-requisitos)
- [Agenda del Workshop](#agenda-del-workshop)
- [Ejercicio 0: Punto de Partida (sin configurar)](#ejercicio-0-punto-de-partida-sin-configurar)
- [Ejercicio 1: /init y copilot-instructions.md](#ejercicio-1-init-y-copilot-instructionsmd)
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

### El Piso Gratis (no consume AI Credits)

| Funcion | Que hace | Shortcut |
|---------|----------|----------|
| **Inline completions** | Autocompleta mientras escribes | `Tab` para aceptar |
| **NES** (Next Edit Suggestions) | Predice la ubicacion y el contenido de tu siguiente edicion | `Tab` → `Tab` |

> **Estos dos representan ~70% del valor diario** y no consumen peticiones premium. (En el plan **Free** las completions estan topadas a ~2.000/mes; en planes de pago son ilimitadas.)

### Herramientas que consumen AI Credits

| Funcion | Que hace | Shortcut |
|---------|----------|----------|
| **Inline chat** | Refactoring en contexto | `Cmd+I` (⌘I) |
| **Chat panel** | Conversacion con contexto del proyecto | `Ctrl+Cmd+I` (⌃⌘I) |
| **Agent mode** | Crea/modifica archivos, usa tools | Chat → Agent |

### Comandos Especiales

| Comando | Descripcion |
|---------|-------------|
| `/init` | Genera `copilot-instructions.md` inicial |
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

> **Importante:** el Ejercicio 0 solo funciona desde `inicio`. Si empiezas en `main`, Copilot ya tiene `copilot-instructions.md` y generará buen código desde el principio — nunca sentirás el "antes". Cuando un paso dice *"el repo ya incluye [archivo]"*, se refiere a la solución en `main`: genera tu versión y compárala.

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
| Ej. 1 | `/init` + `copilot-instructions.md` | 30 min |
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
> - **Ritual de reset entre ejercicios** (cada vez que veas *"Deshaz los cambios"*): como el repo está versionado, vuelve al estado limpio con git —
>   ```bash
>   git restore .        # revierte ediciones a archivos existentes
>   git clean -fd        # borra archivos nuevos que Copilot creó
>   ```
>   Usa `git clean -nd` (dry-run) para ver qué borraría sin borrarlo. No toca `bin/`, `obj/` ni `node_modules/` (están en `.gitignore`). Alternativa reversible: `git stash -u`.

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

**Deshaz los cambios** antes de continuar.

---

## Ejercicio 1: /init y copilot-instructions.md

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

`/init` da un buen punto de partida, pero tu mandas. Abrelo y ajustalo. El repo ya incluye un ejemplo completo en [`.github/copilot-instructions.md`](https://github.com/enriquecordero/TaskFlow/blob/main/.github/copilot-instructions.md).

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

> **Momento wow:** En la respuesta del chat, abre la seccion **References** para confirmar que `copilot-instructions.md` se uso.

**Deshaz los cambios** antes de continuar.

---

## Ejercicio 2: Instructions Especificas con applyTo

> **Objetivo:** reglas que solo apliquen a ciertos archivos (tests, Angular, C#), sin contaminar todo el contexto.

---

### Paso 2.1: Instructions de C#

El repo ya incluye [`.github/instructions/csharp.instructions.md`](https://github.com/enriquecordero/TaskFlow/blob/main/.github/instructions/csharp.instructions.md) con `applyTo: "TaskFlow.Api/**/*.cs"`. Define convenciones de C#: records para DTOs, `AsNoTracking()`, `Results.Problem`, etc.

> **Por que no `**/*.cs`?** Si aplicara a todo el C#, las reglas de endpoints (`AsNoTracking`, `Results.Problem`) tambien cargarian al editar tests, donde no aplican. Scoping al proyecto de la API mantiene cada capa con sus reglas. Ese es el punto de `applyTo`.

---

### Paso 2.2: Instructions de tests

El repo incluye [`.github/instructions/tests.instructions.md`](https://github.com/enriquecordero/TaskFlow/blob/main/.github/instructions/tests.instructions.md) con `applyTo: "**/*Tests*.cs,**/*Test.cs"`. Define: Arrange-Act-Assert, xUnit, FluentAssertions, nombres descriptivos.

---

### Paso 2.3: Instructions de Angular

El repo incluye [`.github/instructions/angular.instructions.md`](https://github.com/enriquecordero/TaskFlow/blob/main/.github/instructions/angular.instructions.md) con `applyTo: "TaskFlow.Web/**/*.ts,TaskFlow.Web/**/*.html,TaskFlow.Web/**/*.scss"`. Define: standalone components, signals, `inject()`, `@if`/`@for`.

---

### Paso 2.4: Instructions de tests Angular

El repo incluye [`.github/instructions/angular-tests.instructions.md`](https://github.com/enriquecordero/TaskFlow/blob/main/.github/instructions/angular-tests.instructions.md) con `applyTo: "TaskFlow.Web/**/*.spec.ts"`. Define: Jasmine + Karma, `TestBed`, `provideHttpClientTesting`, `HttpTestingController`.

Fijate en el glob: solo aplica a archivos `.spec.ts` dentro de `TaskFlow.Web/`. Esto demuestra que puedes tener **multiples instructions para la misma tecnologia** con globs cada vez mas especificos.

---

### Paso 2.5: Comprobarlo

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

**Deshaz los cambios** antes de continuar.

---

## Ejercicio 3: Prompt Files (slash commands reutilizables)

> **Objetivo:** convertir un prompt largo y repetido en **un comando**.

---

### Paso 3.1: Prompt para recursos backend

El repo incluye [`.github/prompts/nuevo-recurso.prompt.md`](https://github.com/enriquecordero/TaskFlow/blob/main/.github/prompts/nuevo-recurso.prompt.md). Es un prompt parametrizable que crea, para un recurso dado, su entidad, DTO, validador, endpoints CRUD, tests y registro en Program.cs.

> **Sintaxis de parametros (oficial de VS Code):** el prompt usa `${input:recurso:NombreDelRecurso}` para pedir un valor, y `argument-hint` en el frontmatter para sugerir que escribir. Al invocarlo pasas el binding con `recurso=...`. No existe la sintaxis `{{variable}}` ni filtros tipo `| lowercase` — el casing se describe en prosa y lo aplica el agente.

---

### Paso 3.2: Prompt para componentes Angular

El repo incluye [`.github/prompts/nuevo-componente.prompt.md`](https://github.com/enriquecordero/TaskFlow/blob/main/.github/prompts/nuevo-componente.prompt.md). Crea un componente Angular completo: modelo, servicio, componente standalone con signals, ruta con lazy loading, link de navegacion y un test del servicio (`.spec.ts`).

---

### Paso 3.3: Usarlos

**Backend:**

```
/nuevo-recurso recurso=Notification
```

Un solo comando genera toda la feature de "Notification" en el backend. (Tambien puedes anadir contexto libre tras el comando, p. ej. `/nuevo-recurso recurso=Notification con campos title y read`.)

**Frontend:**

```
/nuevo-componente recurso=Notification
```

Un solo comando genera toda la feature en Angular.

> **Diferencia con skills:** un **prompt file** lo invocas tu (`/comando`). Un **skill** lo puede cargar Copilot **solo** cuando detecta que aplica.

**Deshaz los cambios** antes de continuar.

---

## Ejercicio 4: Custom Agents (roles)

> **Objetivo:** crear "personas" especializadas con sus propias instrucciones.

---

### Paso 4.1: Agente revisor

El repo incluye [`.github/agents/revisor.agent.md`](https://github.com/enriquecordero/TaskFlow/blob/main/.github/agents/revisor.agent.md): un revisor de codigo que comprueba convenciones y **no edita, solo reporta** con severidades (error, warning, sugerencia).

---

### Paso 4.2: Agente API Builder

El repo incluye [`.github/agents/api-builder.agent.md`](https://github.com/enriquecordero/TaskFlow/blob/main/.github/agents/api-builder.agent.md): especializado en Minimal APIs de .NET, con foco en endpoints, DTOs y validacion.

---

### Paso 4.3: Agente Frontend Builder

El repo incluye [`.github/agents/frontend-builder.agent.md`](https://github.com/enriquecordero/TaskFlow/blob/main/.github/agents/frontend-builder.agent.md): especialista en Angular 19, construye componentes standalone con signals conectados al backend.

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

**Deshaz los cambios** antes de continuar.

---

## Ejercicio 5: Agent Skills (capacidades reutilizables)

> **Objetivo:** capacidades que Copilot **carga solo cuando hace falta** — no saturan el contexto.

---

### Paso 5.1: Skill de migraciones EF Core

El repo incluye [`.github/skills/migracion-ef/SKILL.md`](https://github.com/enriquecordero/TaskFlow/blob/main/.github/skills/migracion-ef/SKILL.md). Ensena a Copilot el procedimiento para crear y aplicar migraciones.

El skill incluye un **script auxiliar** (`crear-migracion.sh`) que automatiza todo el procedimiento en un solo comando: compila, crea la migracion y la aplica. Esto demuestra que los skills **pueden contener archivos adicionales** (scripts, templates, configs) junto al `SKILL.md`.

> **Nota:** Este proyecto usa `InMemoryDatabase`. Las migraciones se crean pero no tienen efecto real — es un ejercicio pedagogico. Con un proveedor real (SQL Server, PostgreSQL) los pasos son identicos.

**Anatomia de un skill — el frontmatter es clave:**

```yaml
---
name: migracion-ef          # debe coincidir con el nombre de la carpeta
description: Crea y aplica migraciones de EF Core en TaskFlow.
---
```

Copilot solo lee `name` + `description` de todos tus skills (barato). **Carga el cuerpo completo solo cuando tu tarea coincide** con la descripcion.

> **Detalle que rompe un skill en silencio:** el `name` debe coincidir con el nombre de la carpeta. Si no coincide, el skill no carga y no hay error visible.

---

### Paso 5.2: Skill caveman-mode (ahorro de tokens)

El repo incluye [`.github/skills/caveman-mode/SKILL.md`](https://github.com/enriquecordero/TaskFlow/blob/main/.github/skills/caveman-mode/SKILL.md). Reduce el consumo de tokens 50-70% haciendo que las respuestas sean ultra-breves sin perder calidad tecnica.

**Por que es un skill y no un agent:** como skill se **apila** con cualquier agent. Puedes usar `api-builder` en modo caveman sin duplicar instrucciones. Un agent seria exclusivo — no podrias combinarlo.

**Invocacion manual:**

```
/caveman-mode
```

**Auto-carga — pide algo asi:**

```
Se breve, ahorra tokens. Crea un endpoint para filtrar proyectos por nombre.
```

**Resultado normal (sin caveman):**
> He analizado tu codigo y encontre que necesitas un endpoint de busqueda. Voy a crear un endpoint GET /projects con un query parameter de filtro...

**Resultado caveman:**
> Endpoint GET /projects?search=. Filtro por nombre. Creo.

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

**Deshaz los cambios** antes de continuar.

---

## Ejercicio 6: MCP (conectar Copilot a tus herramientas)

> **Objetivo:** que Copilot trabaje con datos y servicios reales, no solo con el codigo.

---

### Paso 6.1: Revisar la configuracion

El repo incluye [`.vscode/mcp.json`](https://github.com/enriquecordero/TaskFlow/blob/main/.vscode/mcp.json) con dos servidores:

- **github** (HTTP): consultar issues y PRs del repo
- **filesystem** (stdio, via `npx`): acceso controlado a archivos del proyecto

```json
{
  "servers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/"
    },
    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "${workspaceFolder}"]
    }
  }
}
```

> **`type`:** `http` para servers remotos, `stdio` para procesos locales. Es requerido; declararlo en ambos evita ambigüedad.

---

### Paso 6.2: Usarlo

Con el servidor de GitHub conectado:

```
Lista los issues abiertos de este repo y propon en cuales podriamos
empezar por la feature de notificaciones.
```

**Verificar:** Copilot consulta datos reales, no inventa.

> **Seguridad:** revisa siempre que hace un servidor MCP antes de conectarlo. Las aprobaciones de VS Code cubren edicion de archivos, ejecucion de comandos y uso de herramientas (no solo la terminal). Ojo: el server `filesystem` corre `npx -y ...`, que **descarga y ejecuta** un paquete de npm en cada arranque (riesgo de cadena de suministro).

---

### Paso 6.3: Disciplina de costo

| Accion | Consume AI Credits? |
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

- `copilot-instructions.md` → stack, DTOs, manejo de errores, nombres
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
| 1 | `copilot-instructions.md` | Siempre | Reglas globales del proyecto |
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
| Quiero deshacer lo que generó Copilot | `git restore . && git clean -fd` (o `git stash -u` para poder recuperarlo). `git clean -nd` muestra qué borraría sin borrarlo. `Cmd+Z` no basta si creó archivos nuevos |

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
Si. Son archivos de texto — cero costo. Lo que consume AI Credits es la conversacion de Copilot que los lee.

**¿Que pasa si Copilot genera codigo incorrecto?**
Itera. El feedback loop es: generar → verificar → corregir. Con las instrucciones bien configuradas, la primera generacion es mucho mas precisa.

**¿Las instructions afectan al autocompletado inline?**
No. Aplican al chat (Ask, Plan, Agent), a Copilot code review y al coding agent — **no** al autocompletado inline ni a NES, que usan el contexto del archivo abierto.

**¿Puedo tener muchos skills sin saturar el contexto?**
Si. Copilot solo lee `name` + `description` de cada skill. Carga el cuerpo completo solo cuando la tarea coincide.

---

> Workshop inspirado en [acquirer-lite](https://github.com/enriquecordero/acquirer-lite), reenfocado hacia un stack Angular + .NET con el **marco de customization** de VS Code. Material para fines educativos.
