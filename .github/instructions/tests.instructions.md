---
applyTo: "**/*Tests*.cs,**/*Test.cs"
---

# Convenciones de tests para TaskFlow

- Framework: **xUnit** con **FluentAssertions**.
- Patron **Arrange-Act-Assert** con comentarios `// Arrange`, `// Act`, `// Assert`.
- Usa `WebApplicationFactory<Program>` para tests de integracion.
- Inyecta la factory con `IClassFixture<WebApplicationFactory<Program>>`.
- Para que funcione, `Program.cs` debe tener `public partial class Program;` al final.
- Nombres descriptivos: `MetodoUnderTest_Escenario_ResultadoEsperado`.
- Cada test debe ser independiente y no depender de orden de ejecucion.
- Usa `HttpClient` methods (`GetAsync`, `PostAsJsonAsync`, etc.) para probar endpoints.
- Verifica status codes con `response.StatusCode.Should().Be(HttpStatusCode.X)`.
- La base de datos InMemory se reinicia por factory — cada test clase arranca con datos limpios.
