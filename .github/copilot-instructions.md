# TaskFlow — Instrucciones de proyecto

## Stack

### Backend (TaskFlow.Api)
- .NET 10, C# con `nullable` y `implicit usings` activados.
- Minimal APIs organizadas por feature (una carpeta por recurso bajo `Features/`).
- Entity Framework Core con base de datos InMemory para desarrollo.

### Frontend (TaskFlow.Web)
- Angular 19 con standalone components (sin NgModules).
- Signals para estado reactivo en componentes.
- SCSS para estilos.
- Conectado al backend en `http://localhost:5100`.

## Arquitectura

### Backend
- Cada feature tiene: endpoints, DTOs (request/response) y validadores.
- **Nunca** exponer entidades de dominio en respuestas de API; siempre usar DTOs.
- Validacion con **FluentValidation** registrado por DI — porque centraliza reglas y las hace testeables.
- Errores con `Results.Problem` / `ProblemDetails` (RFC 7807) — porque unifica el formato de error como JSON estandar que cualquier cliente puede parsear.
- DTOs en archivo separado: `{Recurso}Dto.cs` dentro de la carpeta del feature.

### Frontend
- Organizado por features: `features/{recurso}/` con componentes standalone.
- Modelos (interfaces) en `models/` espejando los DTOs del backend.
- Servicios HTTP en `services/` con `{ providedIn: 'root' }`.
- Rutas con lazy loading (`loadComponent`).
- URL del API siempre desde `environment.apiUrl`, nunca hardcoded.

## Patrones — DO / DON'T

### Backend

```csharp
// DO: Devolver DTOs con Results
Results.Ok(MapToResponse(entity));
Results.Created($"/tasks/{task.Id}", MapToResponse(task));
Results.Problem("Not found.", statusCode: 404);

// DON'T: Devolver entidades directamente
Results.Ok(entity); // NUNCA — expone el modelo de dominio
```

```csharp
// DO: Minimal APIs con MapGroup
var group = app.MapGroup("/tasks").WithTags("Tasks");
group.MapGet("/", async (TaskFlowDbContext db) => ...);

// DON'T: Controllers
[ApiController] // NO — este proyecto usa Minimal APIs, no controllers
public class TasksController : ControllerBase { }
```

### Frontend

```typescript
// DO: Standalone component con signals e inject()
@Component({ standalone: true, imports: [FormsModule] })
export class TaskListComponent {
  private readonly svc = inject(TaskService);
  tasks = signal<TaskResponse[]>([]);
}

// DON'T: NgModules, constructor injection, CommonModule
@NgModule({ declarations: [TaskListComponent] }) // NO
constructor(private svc: TaskService) { }          // NO — usar inject()
imports: [CommonModule]                            // NO — usar @if/@for
```

## Convenciones de nombres

- **C#**: `PascalCase` para tipos y metodos, `camelCase` para variables, `_camelCase` para campos privados, `ALL_CAPS` para constantes.
- **TypeScript**: `camelCase` para variables/funciones, `PascalCase` para tipos/interfaces, `kebab-case` para archivos.

## Tests

### Backend
- xUnit + FluentAssertions.
- Patron **Arrange-Act-Assert**.
- Tests de integracion con `WebApplicationFactory<Program>`.
- `Program.cs` debe tener `public partial class Program;` para que WebApplicationFactory funcione.

### Frontend
- Jasmine + Karma.
- `TestBed` con `provideHttpClientTesting`.
- Nombres descriptivos: `should do X when Y`.
