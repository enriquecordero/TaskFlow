# Guía técnica: Configurar GitHub Copilot para TaskFlow (.NET 10 + Angular 19)

> Handoff del workshop **"GitHub Copilot Avanzado"**. Todos los ejemplos son los reales del proyecto TaskFlow.
> Basado en la documentación oficial de VS Code: [Customize AI in Visual Studio Code](https://code.visualstudio.com/docs/copilot/customization/overview)

---

## El concepto clave: Context Engineering

Los modelos de IA tienen conocimiento general amplio, **pero no conocen tu codebase ni las prácticas de tu equipo** — y menos aún versiones nuevas como .NET 10 o Angular 19, que son más recientes que su entrenamiento.

> *"Think of the AI as a skilled new team member: it writes great code, but doesn't know your conventions, architecture decisions, or preferred libraries."* — VS Code Docs

La customización es cómo le das ese contexto para que las respuestas reflejen tus estándares. La idea central del workshop: **el contexto no se escribe en cada prompt, se configura una vez en el repo.**

---

## Referencia rápida: ¿qué herramienta usar?

| Necesidad | Herramienta | Cuándo aplica | Ejemplo en TaskFlow |
|---|---|---|---|
| Reglas para todo el proyecto | `copilot-instructions.md` / `AGENTS.md` | Siempre, en cada request | "usa DTOs, nunca entidades" |
| Reglas por tipo de archivo | `*.instructions.md` + `applyTo` | Cuando el archivo coincide con el glob | reglas de C# solo en `TaskFlow.Api/` |
| Tarea repetible | `*.prompt.md` | Al invocar el slash command | `/nuevo-recurso recurso=Notification` |
| Workflow con pasos/scripts | Agent Skills | Cuando la tarea coincide con la descripción | `migracion-ef`, `caveman-mode` |
| Persona de IA especializada | Custom Agents | Al seleccionarla en el chat | `revisor`, `api-builder` |
| Conectar a datos/servicios reales | MCP Servers | Cuando la tarea requiere la herramienta | doc de .NET 10 / Angular 19 |
| Automatizar en el ciclo del agente | Hooks | Al llegar al evento (avanzado) | `dotnet format` tras editar |

---

## Setup paso a paso

### Paso 1 — Generar las instrucciones base con `/init`

En el chat de Copilot (modo **Agent**), escribe:

```
/init
```

Copilot analiza el workspace y genera el archivo de **instrucciones siempre activas** con el contexto real (stack detectado, estructura, patrones existentes).

> **`AGENTS.md` o `copilot-instructions.md`?** Según tu versión de VS Code, `/init` genera uno u otro. Hacen lo mismo (instrucciones globales siempre activas):
> - **`AGENTS.md`** (raíz): formato **portable** entre herramientas ([agents.md](https://agents.md)) — lo que hoy suele generar `/init`.
> - **`.github/copilot-instructions.md`**: específico de Copilot, se combina con los `*.instructions.md` por `applyTo`.
>
> Si tienes los dos, VS Code los combina.

**Revisa y ajusta** el archivo generado — en TaskFlow codifica: .NET 10 Minimal APIs por feature, DTOs como `record` (nunca exponer entidades), FluentValidation, errores con `Results.Problem`, Angular 19 standalone + signals + `inject()` + `@if`/`@for`, tests xUnit + FluentAssertions.

---

### Paso 2 — Instrucciones por tipo de archivo (`*.instructions.md`)

Para reglas específicas de una capa, crea archivos en `.github/instructions/`. El `applyTo` (glob) hace que solo carguen al tocar archivos que coinciden — así las reglas de backend no contaminan el frontend ni los tests.

**C# de la API** — `.github/instructions/csharp.instructions.md`:

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

> **Por qué `TaskFlow.Api/**/*.cs` y no `**/*.cs`:** si aplicara a todo el C#, estas reglas de endpoints cargarían también al editar tests, donde no aplican. Acotar por glob es el punto de `applyTo`.

**Angular** — `.github/instructions/angular.instructions.md`:

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

**Tests** — `.github/instructions/tests.instructions.md` (con `applyTo: "**/*Tests*.cs,**/*Test.cs"`): xUnit + FluentAssertions, Arrange-Act-Assert, `WebApplicationFactory<Program>`, y aislar la BD InMemory por test con `UseInMemoryDatabase($"TaskFlow-{Guid.NewGuid()}")`.

**Cómo crearlo:**

```
/create-instruction
```

> **Prioridad** (cuando hay conflicto): 1) instrucciones personales (user-level) → 2) del repositorio → 3) de la organización.

---

### Paso 3 — Prompt files para tareas repetibles (`*.prompt.md`)

Para tareas frecuentes (crear un recurso, un componente), crea prompt files en `.github/prompts/`.

**`nuevo-recurso.prompt.md`** — crea un recurso CRUD completo:

```markdown
---
description: Crea un recurso CRUD completo con DTOs, validadores, endpoints y tests.
argument-hint: recurso=<NombreDelRecurso>
agent: agent
---

# Nuevo recurso CRUD: ${input:recurso:NombreDelRecurso}

Crea una feature completa para el recurso **${input:recurso}**:
1. Entidad en `Domain/{Recurso}.cs`
2. DTOs (`record`) en `Features/{Recurso}s/{Recurso}Dto.cs`
3. Validadores con FluentValidation
4. Endpoints CRUD en un `MapGroup` (`/{recurso}s`, `/{recurso}s/{id:int}`)
5. Registrar en `Program.cs`
6. Tests en `TaskFlow.Tests/`

Si no se especifican las propiedades de la entidad, pregunta al usuario antes de asumirlas.
```

**Cómo invocarlo:**

```
/nuevo-recurso recurso=Notification
```

> **Sintaxis de parámetros (lo no obvio):** `${input:recurso:NombreDelRecurso}` es la sintaxis **oficial** de VS Code, y `argument-hint` sugiere qué escribir. Al invocar pasas el binding con `recurso=...`. **No existe** `{{variable}}` ni filtros tipo `| lowercase` — el casing se describe en prosa y lo aplica el agente.
>
> **Guardarraíl útil:** la línea *"pregunta al usuario antes de asumirlas"* hace que Copilot **te consulte** las propiedades de la entidad en vez de inventarlas. Un buen prompt pregunta, no alucina.

Análogo: **`nuevo-componente.prompt.md`** crea la feature Angular (modelo, servicio, componente standalone, ruta lazy, test).

**Cómo crearlo:**

```
/create-prompt
```

---

### Paso 4 — Empaquetar workflows como Agent Skills

Para capacidades reutilizables cargadas bajo demanda, crea carpetas en `.github/skills/`.

> Docs oficiales: [Use Agent Skills in VS Code](https://code.visualstudio.com/docs/copilot/customization/agent-skills)

**Estructura — el nombre del directorio DEBE coincidir con el campo `name`:**

```
.github/skills/
├── migracion-ef/
│   ├── SKILL.md              ← instrucciones (requerido)
│   └── crear-migracion.sh    ← script auxiliar (opcional)
└── caveman-mode/
    └── SKILL.md
```

**Frontmatter del SKILL.md (ejemplo `migracion-ef`):**

```markdown
---
name: migracion-ef                # requerido — DEBE coincidir con el nombre del directorio
description: >                     # requerido — QUÉ hace y CUÁNDO usarlo
  Crea y aplica migraciones de EF Core en TaskFlow. Usalo cuando cambien
  las entidades del dominio o necesites actualizar el esquema de base de datos.
---

# Migración de EF Core
## Procedimiento
1. dotnet build
2. dotnet ef migrations add <Nombre> --project TaskFlow.Api
3. Revisar la migración generada
4. dotnet ef database update --project TaskFlow.Api
```

**Cómo lo carga Copilot (3 niveles progresivos):**

1. **Descubrimiento** — siempre lee `name` + `description` de todos los skills (barato).
2. **Carga de instrucciones** — cuando el request coincide con la descripción, carga el body del `SKILL.md`.
3. **Acceso a recursos** — solo carga scripts/ejemplos cuando los necesita.

Así puedes tener muchos skills sin saturar el contexto. En TaskFlow: `migracion-ef` (procedimiento + script) y `caveman-mode` (respuestas breves, ahorra 50-70% de tokens; se **apila** con cualquier agente).

**Cómo crearlo:**

```
/create-skill
```

> Los Agent Skills son un **open standard** ([agentskills.io](https://agentskills.io)), portables entre VS Code, Copilot CLI y coding agent. Angular publica los suyos oficiales ([angular.dev/ai/agent-skills](https://angular.dev/ai/agent-skills)).

---

### Paso 5 — Custom Agents para roles especializados

Para personas de IA especializadas, crea archivos `.agent.md` en `.github/agents/`.

> Docs oficiales: [Custom agents in VS Code](https://code.visualstudio.com/docs/copilot/customization/custom-agents). Disponibles desde VS Code 1.106 (antes: **custom chat modes**, `.chatmode.md`).

**`revisor.agent.md`** — revisor que **solo reporta, no edita**:

```markdown
---
name: revisor
description: Revisa codigo C# y Angular buscando problemas de convenciones, seguridad y calidad. Solo reporta, no edita.
tools: ['search/codebase', 'search/usages', 'web/fetch']
---

Eres un revisor de codigo senior en .NET y Angular. Tu trabajo es revisar, no editar.
Revisas: DTOs vs entidades, FluentValidation, Results.Problem, nombres,
tests con Arrange-Act-Assert, standalone + inject() + @if/@for.
Reportas con: archivo:linea | severidad | descripcion | recomendacion.
```

> **La clave está en `tools:`.** Al declarar solo herramientas de lectura/búsqueda (sin `edit`), el agente **puede leer el codebase pero no modificarlo** — el patrón oficial de agente solo-lectura. Una lista vacía `tools: []` lo dejaría ciego. Los otros dos agentes (`api-builder`, `frontend-builder`) **no** declaran `tools`, así que heredan todas (pueden escribir).

Los otros roles de TaskFlow: **`api-builder`** (Minimal APIs de .NET) y **`frontend-builder`** (Angular 19 con signals).

**Campos opcionales útiles:** `model` (fija un modelo concreto), `user-invocable` (si aparece en el dropdown), `handoffs` (botones para pasar a otro agente con contexto, ej. `api-builder → revisor`).

**Cómo crearlo:**

```
/create-agent
```

---

### Paso 6 — MCP: conectar Copilot a documentación y datos reales

Los MCP servers conectan Copilot a herramientas y datos externos. En TaskFlow los usamos para que consulte **documentación al día** de .NET 10 y Angular 19 — que son más nuevos que el entrenamiento del modelo, así que sin esto tiende a alucinar APIs.

> Docs oficiales: [MCP servers in VS Code](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)

**`.vscode/mcp.json`:**

```json
{
  "servers": {
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

- **microsoft.docs.mcp** (HTTP, oficial, sin API key): doc real de .NET / ASP.NET / EF Core. Ej: *"¿cómo configuro un índice único con Fluent API en EF Core 10? Usa la doc oficial."*
- **angular-cli** (stdio): doc + tooling de Angular 19 (best practices, corre `build`/`test`, lee `angular.json`). Lleva `cwd` a `TaskFlow.Web` porque el `angular.json` vive en esa subcarpeta.

> **Para proyectos en Azure DevOps:** existe el [MCP oficial de Azure DevOps](https://github.com/microsoft/azure-devops-mcp) (`npx -y @azure-devops/mcp ${input:ado_org}`) que trae work items, PRs y pipelines reales. Requiere `az login` + tu organización. Fíjate en el patrón `inputs` de `mcp.json` para pedir la organización sin hardcodearla.

> **Seguridad:** revisa qué hace un MCP antes de conectarlo. Los `stdio` con `npx` **descargan y ejecutan** un paquete de npm (cadena de suministro); los `http` envían tus prompts a un servicio remoto.

---

### Paso 7 — Hooks (avanzado — fuera del alcance del workshop)

Los hooks ejecutan comandos shell en puntos **determinísticos** del ciclo del agente. A diferencia de las instrucciones (que *guían*), los hooks *garantizan* que algo ocurra sin importar el prompt. El workshop no los cubre, pero aquí van adaptados a TaskFlow.

> Docs oficiales: [Agent hooks in VS Code](https://code.visualstudio.com/docs/copilot/customization/hooks)

| Evento | Cuándo dispara | Uso típico en TaskFlow |
|---|---|---|
| `SessionStart` | Al iniciar sesión | Validar que compila (`dotnet build`) |
| `PreToolUse` | Antes de invocar una herramienta | Bloquear comandos peligrosos |
| `PostToolUse` | Tras completar una herramienta | Formatear el archivo editado |
| `Stop` | Al finalizar | Correr los tests |

**Ejemplo: auto-formatear tras editar** — `.github/hooks/post-edit.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      { "type": "command", "command": ".github/hooks/scripts/format-on-edit.sh", "timeout": 30 }
    ]
  }
}
```

`.github/hooks/scripts/format-on-edit.sh`:

```bash
#!/bin/bash
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.filePath // empty')

if [[ "$FILE" == *.cs ]]; then
  dotnet format --include "$FILE" 2>/dev/null
elif [[ "$FILE" == *.ts || "$FILE" == *.html || "$FILE" == *.scss ]]; then
  (cd TaskFlow.Web && npx prettier --write "$FILE") 2>/dev/null
fi
echo '{"continue": true}'
```

**Resultado:** cada `.cs` se formatea con `dotnet format` y cada `.ts`/`.html`/`.scss` con Prettier, automáticamente, sin pedirlo.

| Exit code | Comportamiento |
|---|---|
| `0` | Éxito — el agente continúa |
| `2` | Error bloqueante — detiene la operación |
| Otro | Warning — avisa pero continúa |

**Cómo crearlo:** `/create-hook`

---

## Otras capacidades de Copilot en VS Code

> Docs: [GitHub Copilot in VS Code](https://code.visualstudio.com/docs/copilot/overview). Todo esto aplica a TaskFlow aunque el workshop se centre en Context Engineering.

### Modos de agente

| Tipo | Dónde corre | Para qué |
|---|---|---|
| **Local Agent** | En VS Code, interactivo | Revisar y aprobar cada paso |
| **Background Agent** | En tu máquina, autónomo (Git worktree) | Delegar sin bloquear el editor |
| **Cloud Agent** | En la nube | Branch + PR automático |
| **Plan Agent** | En VS Code | Analizar el codebase y generar un plan antes de codificar |

Comparten historial de sesión; puedes hacer **handoff** entre ellos. El **Plan Agent** combinado con handoffs orquesta *Plan → Implementación → Revisión* — encaja con los agentes `api-builder` y `revisor` de TaskFlow.

### El piso gratis (no consume peticiones premium)

- **Inline Suggestions** — completa mientras tipeas (`Tab` acepta). **No** las afectan las custom instructions (solo el chat).
- **Next Edit Suggestions (NES)** — predice tu **próximo cambio** basado en lo que acabas de editar (ej: cambias un DTO → sugiere actualizar el modelo de Angular que lo espeja).

> En el plan **Free** las completions están topadas a ~2.000/mes; en planes de pago, ilimitadas.

### Inline Chat (`⌘I`) y Smart Actions

- **Inline Chat** — chat dentro del editor con diff visual. Ej: *"refactoriza esta función para usar `AsNoTracking()`"*.
- **Smart Actions** (click derecho / panel de Problems): generar commit message, Fix error, Rename with Copilot, Explain, Generate Tests.

### El mapa completo

```
Editor (sin interrumpir el flujo)
  ├── Inline Suggestions       ← mientras tipeas
  ├── Next Edit Suggestions    ← predice tu próximo cambio
  ├── Inline Chat (⌘I)         ← edits in-place con diff
  └── Smart Actions            ← commit msg, fix, rename, explain

Agentes (tareas end-to-end)
  ├── Local · Background · Cloud · Plan
  └── Handoffs entre agentes

Context Engineering (lo que configuras una vez)  ← el foco del workshop
  ├── copilot-instructions.md / AGENTS.md  ← siempre activo
  ├── *.instructions.md                    ← por archivo/carpeta (applyTo)
  ├── *.prompt.md                          ← slash commands
  ├── *.agent.md                           ← personas especializadas
  ├── Skills                               ← workflows bajo demanda
  ├── MCP Servers                          ← doc/datos reales
  └── Hooks                                ← automatización determinística
```

---

## Estructura final del proyecto (TaskFlow)

```
TaskFlow/
├── .github/
│   ├── copilot-instructions.md              ← SIEMPRE activo (o AGENTS.md en la raíz)
│   ├── instructions/
│   │   ├── csharp.instructions.md           → TaskFlow.Api/**/*.cs
│   │   ├── tests.instructions.md            → **/*Tests*.cs
│   │   ├── angular.instructions.md          → TaskFlow.Web/**/*.{ts,html,scss}
│   │   └── angular-tests.instructions.md    → TaskFlow.Web/**/*.spec.ts
│   ├── prompts/
│   │   ├── nuevo-recurso.prompt.md          → /nuevo-recurso recurso=Entidad
│   │   └── nuevo-componente.prompt.md       → /nuevo-componente recurso=Entidad
│   ├── agents/
│   │   ├── revisor.agent.md                 ← solo reporta (tools de lectura)
│   │   ├── api-builder.agent.md             ← Minimal APIs .NET
│   │   └── frontend-builder.agent.md        ← Angular 19
│   └── skills/
│       ├── migracion-ef/ (SKILL.md + crear-migracion.sh)
│       └── caveman-mode/SKILL.md
├── .vscode/
│   └── mcp.json                             ← microsoft.docs.mcp + angular-cli
├── TaskFlow.Api/                            ← .NET 10 Minimal API
├── TaskFlow.Web/                            ← Angular 19
└── TaskFlow.Tests/                          ← xUnit + FluentAssertions
```

---

## Tips para instrucciones efectivas

> Basado en: [VS Code Docs — Tips for writing effective instructions](https://code.visualstudio.com/docs/copilot/customization/custom-instructions#_tips-for-writing-effective-instructions)

1. **Incluye el razonamiento detrás de las reglas**
   ```
   ❌ "Usa Results.Problem para errores"
   ✅ "Usa Results.Problem porque unifica los errores como ProblemDetails (RFC 7807), que cualquier cliente puede parsear"
   ```
2. **Muestra patrones preferidos con código concreto** — la IA responde mejor a ejemplos (DO/DON'T) que a reglas abstractas.
3. **Enfócate en lo no obvio** — omite lo que ya enforcea un linter o formatter.
4. **Reutiliza** instrucciones en prompt files y agents con Markdown links, sin duplicar.
5. **Versiona todo en git** — los archivos en `.github/` se comparten con el equipo (`git clone` y listo). *Ojo:* una instrucción desactualizada (ej. "backend en :5100" tras cambiar el puerto) **miente** al modelo en cada request — mantenlas al día.

---

## Diagnóstico y troubleshooting

Si una instrucción no se aplica:

1. **Ver instrucciones cargadas:** click derecho en el Chat → `Diagnostics`.
2. **Verificar ubicación:** `.github/copilot-instructions.md` (o `AGENTS.md`) en la raíz.
3. **Verificar `applyTo`:** el glob debe coincidir con el archivo abierto.
4. **Revisar References:** la sección *References* en la respuesta del chat muestra qué instrucciones se usaron.
5. **Skill no carga:** el `name` del `SKILL.md` debe coincidir con el nombre de la carpeta (falla en silencio si no).

---

## Comandos de referencia rápida

| Comando en chat | Acción |
|---|---|
| `/init` | Genera el archivo de instrucciones analizando el workspace |
| `/create-instruction` | Genera un `*.instructions.md` |
| `/create-prompt` | Genera un `*.prompt.md` |
| `/create-agent` | Genera un `*.agent.md` |
| `/create-skill` | Genera una Agent Skill |
| `/create-hook` | Genera un Hook |
| `/instructions`, `/prompts`, `/skills`, `/agents` | Abren los menús de configuración |

---

## Recursos oficiales

**Context Engineering**
- [Customize AI in VS Code](https://code.visualstudio.com/docs/copilot/customization/overview)
- [Custom Instructions](https://code.visualstudio.com/docs/copilot/customization/custom-instructions)
- [Prompt Files](https://code.visualstudio.com/docs/copilot/customization/prompt-files)
- [Custom Agents](https://code.visualstudio.com/docs/copilot/customization/custom-agents)
- [Agent Skills](https://code.visualstudio.com/docs/copilot/customization/agent-skills)
- [MCP Servers](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)
- [Hooks](https://code.visualstudio.com/docs/copilot/customization/hooks)

**Capacidades generales**
- [GitHub Copilot in VS Code — Overview](https://code.visualstudio.com/docs/copilot/overview)
- [Agents overview](https://code.visualstudio.com/docs/copilot/agents/overview)
- [Awesome Copilot (ejemplos de la comunidad)](https://github.com/github/awesome-copilot)

**Stack de TaskFlow**
- [.NET 10](https://dotnet.microsoft.com/download) · [Angular 19](https://angular.dev) · [Repo del workshop](https://github.com/enriquecordero/TaskFlow)

---

> Material educativo del workshop **TaskFlow**. Reutiliza esta estructura (`.github/`) en tus proyectos reales — es portable: copia, ajusta las instrucciones a tu dominio y stack.
