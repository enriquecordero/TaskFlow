---
applyTo: "TaskFlow.Web/**/*.spec.ts"
---

# Convenciones de tests Angular para TaskFlow

- Framework: **Jasmine** + **Karma** (el default de Angular CLI).
- Usa `TestBed.configureTestingModule` con `provideHttpClientTesting` para mockear HTTP.
- Patrón **Arrange-Act-Assert** con comentarios.
- Usa `HttpTestingController` para verificar requests HTTP.
- Nombres descriptivos: `should load tasks on init`, `should create a task when form is valid`.
- Cada test debe ser independiente; no compartir estado mutable entre tests.
- Usa `fixture.detectChanges()` para triggear el ciclo de detección de cambios.
