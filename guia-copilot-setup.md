# Guía: Cómo configurar un proyecto para trabajar con GitHub Copilot

> Basado en la documentación oficial de VS Code: [Customize AI in Visual Studio Code](https://code.visualstudio.com/docs/copilot/customization/overview)

---

## El concepto clave

Los modelos de IA tienen conocimiento general amplio, **pero no conocen tu codebase ni las prácticas de tu equipo**.

> *"Think of the AI as a skilled new team member: it writes great code, but doesn't know your conventions, architecture decisions, or preferred libraries."*
> — VS Code Docs

La customización es cómo le das ese contexto, para que las respuestas reflejen tus estándares y tu arquitectura. Esto es lo que se conoce como **Context Engineering**.

---

## Referencia rápida: ¿Qué herramienta usar?

| Necesidad | Herramienta | Cuándo aplica |
|---|---|---|
| Reglas que aplican a todo el proyecto | `copilot-instructions.md` | Siempre, en cada request |
| Reglas distintas por tipo de archivo | `*.instructions.md` | Cuando los archivos coinciden con el patrón |
| Tarea repetible que ejecutas frecuente | `*.prompt.md` | Cuando invocas el slash command |
| Workflow multi-paso con scripts | Agent Skills | Cuando la tarea coincide con la descripción del skill |
| Persona de IA especializada | Custom Agents | Cuando la seleccionas o un agente te delega |
| Conectar a APIs o bases de datos externas | MCP Servers | Cuando la tarea requiere la herramienta |
| Automatizar en puntos del ciclo del agente | Hooks | Cuando el agente llega al evento correspondiente |
| Tarea autónoma en paralelo sin bloquear editor | Background Agent | Cuando quieres delegar sin interrumpir tu trabajo |
| Implementar y abrir un PR automáticamente | Cloud Agent | Cuando necesitas colaboración en GitHub |
| Planificar antes de codificar | Plan Agent | Cuando la tarea es compleja y requiere plan previo |

---

## Paso a paso: Setup de un proyecto nuevo

### Paso 1 — Generar las instrucciones base con `/init`

En el chat de Copilot (modo Agent), escribe:

```
/init
```

Copilot analiza tu workspace y genera automáticamente el archivo
`.github/copilot-instructions.md` con el contexto real de tu proyecto
(stack detectado, estructura de archivos, patrones de código existentes).

> **Revisa y ajusta** el archivo generado — añade lo que Copilot no pudo inferir:
> decisiones de arquitectura, librerías preferidas, patrones a evitar.

---

### Paso 2 — Añadir instrucciones por tipo de archivo (`*.instructions.md`)

Para reglas específicas de una parte del codebase, crea archivos en `.github/instructions/`.

**Formato del archivo:**

```markdown
---
name: 'Nombre descriptivo'
description: 'Qué hace esta instrucción'
applyTo: 'backend/**'   # glob pattern — omitir = no aplica automáticamente
---

# Reglas aquí en Markdown
- Usar aws-cdk-lib (CDK v2)
- Activar CORS en todos los endpoints
```

**Cómo crearlo:**

```
/create-instruction
```

Describe la convención y Copilot genera el archivo con el `applyTo` correcto.

> **Prioridad de instrucciones** (cuando hay conflicto):
> 1. Instrucciones personales (user-level)
> 2. Instrucciones del repositorio (`.github/copilot-instructions.md`)
> 3. Instrucciones de la organización

---

### Paso 3 — Crear prompts para tareas repetibles (`*.prompt.md`)

Para tareas que ejecutas frecuentemente (crear un componente, preparar un PR,
generar tests), crea prompt files en `.github/prompts/`.

**Formato del archivo:**

```markdown
---
description: 'Scaffoldea una nueva Lambda function'
name: 'new-lambda'
agent: agent
tools: [createFile, readFile]
---

Crea una nueva Lambda function en `backend/lambda/${input:name}/index.ts`
siguiendo el patrón existente en `backend/lambda/hello/index.ts`.
Incluye handler exportado, CORS headers y try/catch.
```

**Cómo invocarlo en chat:**

```
/new-lambda
```

**Cómo crearlo:**

```
/create-prompt
```

---

### Paso 4 — Empaquetar workflows como Agent Skills

Para capacidades reutilizables y complejas (deploy, testing, debugging),
crea una carpeta en `.github/skills/`.

> Docs oficiales: [Use Agent Skills in VS Code](https://code.visualstudio.com/docs/copilot/customization/agent-skills)

**Estructura — el nombre del directorio DEBE coincidir con el campo `name` del SKILL.md:**

```
.github/skills/
└── aws-deploy/           ← nombre del directorio = valor del campo `name`
    ├── SKILL.md          ← instrucciones principales (requerido)
    ├── scripts/          ← scripts ejecutables (opcional)
    └── examples/         ← ejemplos de referencia (opcional)
```

**Formato del SKILL.md:**

```markdown
---
name: aws-deploy              # requerido — debe coincidir con el nombre del directorio
description: >                # requerido — describe QUÉ hace y CUÁNDO usarlo (máx. 1024 chars)
  Guía paso a paso para deployar el stack CDK en AWS.
  Úsalo cuando necesites deployar o actualizar la infraestructura.
argument-hint: '[ambiente]'   # opcional — hint en el input del chat
user-invocable: true          # opcional — si aparece como slash command (default: true)
disable-model-invocation: false # opcional — si el agente puede cargarlo automáticamente
---

# Instrucciones detalladas aquí en Markdown
```

**Cómo lo carga Copilot (3 niveles progresivos):**

1. **Descubrimiento** — Copilot siempre lee `name` y `description` del frontmatter (ligero)
2. **Carga de instrucciones** — cuando el request coincide con la descripción, carga el body del `SKILL.md`
3. **Acceso a recursos** — solo carga scripts/ejemplos cuando los necesita

Este sistema permite tener muchos skills instalados sin saturar el contexto.

**Cómo crearlo:**

```
/create-skill
```

> Los Agent Skills son un **open standard** ([agentskills.io](https://agentskills.io)) que funciona
> en VS Code, GitHub Copilot CLI y GitHub Copilot coding agent — portables entre herramientas.

---

### Paso 5 — Crear Custom Agents para roles especializados

Para personas de IA especializadas (DBA, Frontend Lead, Security Reviewer),
crea archivos `.agent.md` en `.github/agents/`.

> Docs oficiales: [Custom agents in VS Code](https://code.visualstudio.com/docs/copilot/customization/custom-agents)
> Disponibles desde VS Code 1.106. Antes se llamaban **custom chat modes** (`.chatmode.md` → renombrar a `.agent.md`)

**Formato del archivo:**

```markdown
---
name: 'aws-cdk-expert'
description: 'Especialista en infraestructura AWS CDK. Úsalo para crear o modificar stacks.'
tools: [createFile, editFiles, runInTerminal]
agents: []                    # subagentes permitidos — [] = ninguno, * = todos
model: 'Claude Sonnet 4.5 (copilot)'  # opcional — modelo específico para este agente
user-invocable: true          # opcional — si aparece en el dropdown de agentes
handoffs:                     # opcional — botones de transición a otro agente
  - label: 'Revisar seguridad'
    agent: security-reviewer
    prompt: 'Revisa el código CDK generado buscando problemas de seguridad.'
    send: false               # true = envía el prompt automáticamente
---

Eres un experto en AWS CDK v2 con TypeScript.
Solo usas aws-cdk-lib. Siempre validas con cdk synth antes de deploy.
```

**Handoffs — workflows guiados entre agentes:**

Los handoffs permiten crear flujos multi-paso donde el desarrollador aprueba
cada transición. Ejemplos típicos:

```
Planning Agent → Implementation Agent → Security Review Agent
```

Después de cada respuesta, aparecen botones que llevan al siguiente agente
con contexto pre-cargado.

**Compatibilidad con Claude Code:**

VS Code también detecta archivos `.md` en `.claude/agents/` siguiendo el formato
de sub-agents de Claude Code — mismas definiciones funcionan en ambas herramientas.

**Cómo crearlo:**

```
/create-agent
```

---

### Paso 6 — Configurar Hooks para automatización

Los hooks ejecutan comandos shell en puntos determinísticos del ciclo del agente.
A diferencia de las instrucciones (que *guían* al agente), los hooks *garantizan*
que algo ocurre sin importar cómo fue el prompt.

> Docs oficiales: [Agent hooks in VS Code](https://code.visualstudio.com/docs/copilot/customization/hooks)

#### Eventos disponibles

| Evento | Cuándo dispara | Uso típico |
|---|---|---|
| `SessionStart` | Al iniciar una sesión nueva | Inyectar contexto, validar estado del proyecto |
| `UserPromptSubmit` | Cuando el usuario envía un prompt | Auditar requests, añadir contexto del sistema |
| `PreToolUse` | Antes de que el agente invoque una herramienta | Bloquear operaciones peligrosas |
| `PostToolUse` | Después de que una herramienta completa | Ejecutar formatter/linter, loguear resultados |
| `PreCompact` | Antes de compactar el contexto | Exportar estado importante |
| `SubagentStart` | Cuando se lanza un subagente | Inicializar recursos del subagente |
| `SubagentStop` | Cuando un subagente termina | Agregar resultados |
| `Stop` | Al finalizar la sesión del agente | Generar reportes, limpiar recursos |

#### Ubicación de los archivos

```
.github/hooks/          ← hooks del proyecto (se commitean con el repo)
.claude/settings.json   ← hooks locales del workspace
~/.claude/settings.json ← hooks personales (todos los proyectos)
```

#### Formato del archivo (`*.json`)

```json
{
  "hooks": {
    "NombreDelEvento": [
      {
        "type": "command",
        "command": "comando-a-ejecutar",
        "timeout": 30
      }
    ]
  }
}
```

#### Cómo el hook controla al agente

El hook se comunica vía `stdin`/`stdout` con JSON:

| Exit code | Comportamiento |
|---|---|
| `0` | Éxito — el agente continúa |
| `2` | Error bloqueante — detiene la operación |
| Otro | Warning — avisa al usuario pero continúa |

---

#### 🧪 Ejemplo simple: auto-formatear archivos TypeScript después de editarlos

**Archivo:** `.github/hooks/post-edit.json`

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "type": "command",
        "command": "node -e \"const input = require('fs').readFileSync('/dev/stdin','utf8'); const data = JSON.parse(input); const file = data.tool_input && data.tool_input.filePath; if (file && (file.endsWith('.ts') || file.endsWith('.js'))) { require('child_process').execSync('npx prettier --write ' + JSON.stringify(file), {stdio:'inherit'}); } \"",
        "timeout": 30
      }
    ]
  }
}
```

O con un script separado (más limpio):

**Archivo:** `.github/hooks/post-edit.json`

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "type": "command",
        "command": ".github/hooks/scripts/format-on-edit.sh",
        "timeout": 30
      }
    ]
  }
}
```

**Archivo:** `.github/hooks/scripts/format-on-edit.sh`

```bash
#!/bin/bash
# Lee el input JSON del agente
INPUT=$(cat)

# Extrae el nombre del archivo editado
FILE=$(echo "$INPUT" | jq -r '.tool_input.filePath // empty')

# Solo formatear si es un archivo TypeScript o JavaScript
if [[ "$FILE" == *.ts || "$FILE" == *.js ]]; then
  npx prettier --write "$FILE"
  echo '{"continue": true, "systemMessage": "✅ Prettier aplicado en '"$FILE"'"}'
else
  echo '{"continue": true}'
fi
```

```bash
# Darle permisos de ejecución (una sola vez)
chmod +x .github/hooks/scripts/format-on-edit.sh
```

**Resultado:** cada vez que el agente edite un archivo `.ts` o `.js`, Prettier
corre automáticamente — sin que el desarrollador tenga que pedirlo.

---

#### Ejemplo de hook de seguridad: bloquear `rm -rf`

**Archivo:** `.github/hooks/security.json`

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "type": "command",
        "command": ".github/hooks/scripts/block-dangerous-commands.sh",
        "timeout": 10
      }
    ]
  }
}
```

**Archivo:** `.github/hooks/scripts/block-dangerous-commands.sh`

```bash
#!/bin/bash
INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty')
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Bloquear comandos destructivos
if [[ "$TOOL" == "runInTerminal" ]] && echo "$COMMAND" | grep -qE "rm -rf|DROP TABLE|DELETE FROM"; then
  echo '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": "Comando bloqueado por política de seguridad"}}'
  exit 0
fi

echo '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "allow"}}'
```

**Cómo crearlo con IA:**

```
/create-hook
```

---

## Otras capacidades clave de Copilot en VS Code

> Docs oficiales: [GitHub Copilot in VS Code](https://code.visualstudio.com/docs/copilot/overview)

### Modos de agente

Copilot ofrece distintos tipos de agente para cada necesidad. Todos comparten el mismo historial de sesión y puedes hacer **handoff** entre ellos en cualquier momento.

| Tipo | Dónde corre | Para qué úsarlo |
|---|---|---|
| **Local Agent** | En VS Code, interactivo | Tareas donde necesitas revisar y aprobar cada paso |
| **Background Agent** | En tu máquina, autónomo | Tareas bien definidas mientras sigues trabajando |
| **Cloud Agent** | En la nube (GitHub) | Crear un branch + PR automático para revisión del equipo |
| **Third-party Agents** | Externo (Claude, Codex) | Usar modelos de Anthropic u OpenAI desde el mismo chat |
| **Plan Agent** | En VS Code | Analizar el codebase y generar un plan antes de codificar |

---

### Background Agents — trabajar en paralelo

El agente corre autónomamente en background usando **Git worktrees** — trabaja
en una carpeta completamente aislada de tu workspace principal.

**Flujo típico:**

```
1. Describis la tarea en chat
2. Delegate Session → Background
3. Sigues trabajando en el editor sin interrupción
4. El agente reporta progreso en el panel de Sessions
5. Revisas los cambios y los aplicás con un click
```

**Cómo iniciarlo:**
- Desde chat: `Delegate Session dropdown → Background`
- Desde Command Palette: `Chat: New Background Agent`
- Desde una sesión local activa: delegar al llegar al punto de implementación

**Worktrees — aislamiento automático:**

VS Code crea automáticamente un Git worktree para cada sesión de background.
El agente commitea cambios al final de cada turno. Al terminar, podes:
- Ver los diffs en Source Control
- Aplicar los cambios al workspace principal
- Resolver conflictos con la herramienta de merge integrada

> Podés correr **múltiples sesiones de background en paralelo** para tareas independientes.

---

### Plan Agent — planificar antes de construir

Antes de escribir código, el Plan Agent analiza el codebase, hace preguntas
clarificadoras y genera un **plan de implementación paso a paso**.

```
1. Abrís chat y seleccionás el agente "Plan"
2. Describís la feature o cambio
3. El agente analiza tu codebase y genera el plan
4. Revisas y ajustas el plan
5. "Start Implementation" → local, background o cloud
```

Combinado con **Handoffs** en Custom Agents, permite orquestar workflows
multi-agente completos: Plan → Implementación → Code Review.

---

### Inline Suggestions + Next Edit Suggestions

**Inline Suggestions** — sugerencias mientras tipeas:
- Desde completar una línea hasta implementar funciones completas
- Acepta con `Tab`, descarta con `Esc`
- No se ven afectadas por las custom instructions (solo el chat)

**Next Edit Suggestions** *(nuevo)*:
- Predice el **próximo cambio lógico** basado en lo que acabas de editar
- No solo completa donde estás, sino que anticipa dónde vas a ir
- Por ejemplo: cambiás el tipo de un parámetro → sugiere automáticamente actualizar todas las llamadas a esa función

---

### Inline Chat (`⌘I`)

Abrís un chat **directamente en el editor** sin cambiar de contexto.
Describís el cambio y Copilot sugiere los edits in-place con diff visual.

```
⌘I → "refactoriza esta función para usar async/await"
     → ve el diff → acepta o rechaza
```

Ideal para refactors rápidos, explicaciones de código o correcciones puntuales.

---

### Smart Actions — AI sin escribir prompts

Acciones predefinidas accesibles con click derecho o desde el panel de problemas:

| Acción | Cómo acceder |
|---|---|
| **Generate commit message** | Panel de Source Control → ✨ |
| **Fix error** | Panel de Problems → click en el error |
| **Rename symbol** | Click derecho → Rename with Copilot |
| **Semantic search** | `⌘P` → buscar con lenguaje natural |
| **Explain code** | Click derecho → Copilot → Explain |
| **Generate tests** | Click derecho → Copilot → Generate Tests |

---

### Browser Agent Testing *(Experimental)*

El agente puede abrir tu web app en un **browser integrado dentro de VS Code**,
interactuar con ella y verificar que funcione correctamente.

Casos de uso:
- Verificar que una feature funcione visualmente
- Detectar layout issues
- Tomar screenshots para documentación
- Simular interacciones de usuario

```
"Abre la app, navega a la página de productos y verifica que el listado cargue correctamente"
```

> Docs: [Browser agent testing guide](https://code.visualstudio.com/docs/copilot/guides/browser-agent-testing-guide)

---

### El mapa completo de Copilot en VS Code

```
Editor (sin interrumpir el flujo)
  ├── Inline Suggestions       ← mientras tipeas
  ├── Next Edit Suggestions    ← predice tu próximo cambio
  ├── Inline Chat (⌘I)         ← edits in-place con diff
  └── Smart Actions            ← commit msg, fix, rename, explain

Agentes (tareas completas end-to-end)
  ├── Local Agent              ← interactivo, contexto del editor
  ├── Background Agent         ← autónomo, Git worktree, paralelo
  ├── Cloud Agent              ← branch + PR automático
  ├── Plan Agent               ← plan → delegar implementación
  └── Third-party (Claude, Codex) ← desde el mismo chat

Context Engineering (lo que configuras una vez)
  ├── copilot-instructions.md  ← siempre activo
  ├── *.instructions.md        ← por archivo/carpeta
  ├── *.prompt.md              ← slash commands
  ├── *.agent.md               ← personas especializadas
  ├── Skills                   ← workflows reutilizables
  ├── Hooks                    ← automatización determinística
  └── MCP Servers              ← conexión a APIs externas
```

---

## Estructura final del proyecto

```
mi-proyecto/
└── .github/
    ├── copilot-instructions.md      ← SIEMPRE activo (todo el proyecto)
    ├── instructions/
    │   ├── backend.instructions.md  ← aplica a backend/**
    │   ├── frontend.instructions.md ← aplica a frontend/**
    │   └── tests.instructions.md   ← aplica a **/*.test.ts
    ├── prompts/
    │   ├── new-component.prompt.md  ← /new-component
    │   ├── code-review.prompt.md   ← /code-review
    │   └── create-pr.prompt.md     ← /create-pr
    ├── agents/
    │   ├── backend-lead.agent.md
    │   └── security-reviewer.agent.md
    └── skills/
        ├── deploy/
        │   └── SKILL.md
        └── api-testing/
            └── SKILL.md
```

---

## Tips para instrucciones efectivas

> Basado en: [VS Code Docs — Tips for writing effective instructions](https://code.visualstudio.com/docs/copilot/customization/custom-instructions#_tips-for-writing-effective-instructions)

1. **Incluye el razonamiento detrás de las reglas**
   ```
   ❌ "Usa date-fns para fechas"
   ✅ "Usa date-fns en lugar de moment.js — moment.js está deprecated y aumenta el bundle size"
   ```

2. **Muestra patrones preferidos con ejemplos de código concretos**
   — La IA responde mejor a ejemplos que a reglas abstractas

3. **Enfócate en lo no obvio**
   — Omite convenciones que ya enforcea un linter o formatter

4. **Reutiliza instrucciones en prompt files y custom agents**
   — Evita duplicar — usa Markdown links para referenciarlas

5. **Versiona todo en git**
   — Los archivos en `.github/` se comparten con todo el equipo automáticamente

---

## Diagnóstico y troubleshooting

Si una instrucción no está siendo aplicada:

1. **Ver instrucciones cargadas:** Click derecho en el Chat → `Diagnostics`
2. **Verificar ubicación:** `.github/copilot-instructions.md` debe estar en la raíz
3. **Verificar `applyTo`:** El glob pattern debe coincidir con el archivo abierto
4. **Revisar References:** La sección References en la respuesta del chat muestra qué instrucciones se usaron

---

## Comandos de referencia rápida

| Comando en chat | Acción |
|---|---|
| `/init` | Genera `copilot-instructions.md` analizando el workspace |
| `/create-instruction` | Genera un nuevo `*.instructions.md` |
| `/create-prompt` | Genera un nuevo `*.prompt.md` |
| `/create-agent` | Genera un nuevo `*.agent.md` |
| `/create-skill` | Genera una nueva Agent Skill |
| `/create-hook` | Genera un nuevo Hook |
| `/instructions` | Abre el menú de instrucciones configuradas |
| `/prompts` | Abre el menú de prompt files |

---

## Recursos oficiales

**Capacidades generales**
- [GitHub Copilot in VS Code — Overview](https://code.visualstudio.com/docs/copilot/overview)
- [Agents overview](https://code.visualstudio.com/docs/copilot/agents/overview)
- [Background Agents](https://code.visualstudio.com/docs/copilot/agents/background-agents)
- [Cloud Agents](https://code.visualstudio.com/docs/copilot/agents/cloud-agents)
- [Plan Agent](https://code.visualstudio.com/docs/copilot/agents/planning)
- [Inline Suggestions](https://code.visualstudio.com/docs/copilot/ai-powered-suggestions)
- [Smart Actions](https://code.visualstudio.com/docs/copilot/copilot-smart-actions)
- [Browser Agent Testing Guide](https://code.visualstudio.com/docs/copilot/guides/browser-agent-testing-guide)

**Context Engineering**
- [Customize AI in VS Code](https://code.visualstudio.com/docs/copilot/customization/overview)
- [Custom Instructions](https://code.visualstudio.com/docs/copilot/customization/custom-instructions)
- [Prompt Files](https://code.visualstudio.com/docs/copilot/customization/prompt-files)
- [Custom Agents](https://code.visualstudio.com/docs/copilot/customization/custom-agents)
- [Agent Skills](https://code.visualstudio.com/docs/copilot/customization/agent-skills)
- [MCP Servers](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)
- [Hooks](https://code.visualstudio.com/docs/copilot/customization/hooks)
- [Awesome Copilot (community examples)](https://github.com/github/awesome-copilot)
