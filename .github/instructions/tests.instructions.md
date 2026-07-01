---
applyTo: "**/*Tests*.cs,**/*Test.cs"
---

# Convenciones de tests para TaskFlow

- Framework: **xUnit** con **FluentAssertions**.
- Patron **Arrange-Act-Assert** con comentarios `// Arrange`, `// Act`, `// Assert`.
- Usa `WebApplicationFactory<Program>` para tests de integracion.
- Para que funcione, `Program.cs` debe tener `public partial class Program;` al final.
- **Aislamiento con InMemory:** la base InMemory NO se reinicia sola entre tests. Para que los tests no dependan del orden, crea la factory por test (constructor + `IDisposable`) y asigna un nombre de BD unico con `UseInMemoryDatabase($"TaskFlow-{Guid.NewGuid()}")` via `WithWebHostBuilder`. (`IClassFixture` comparte una sola BD entre todos los tests de la clase — solo sirve si no dependes de estado limpio.)
- Nombres descriptivos: `MetodoUnderTest_Escenario_ResultadoEsperado`.
- Usa `HttpClient` methods (`GetAsync`, `PostAsJsonAsync`, etc.) para probar endpoints.
- Verifica status codes con `response.StatusCode.Should().Be(HttpStatusCode.X)`.
