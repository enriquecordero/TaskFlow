---
applyTo: "**/*Tests*.cs,**/*Test.cs"
---

# Convenciones de tests para TaskFlow

- Framework: **xUnit** con **FluentAssertions**.
- Patrón **Arrange-Act-Assert** con comentarios `// Arrange`, `// Act`, `// Assert`.
- Usa `WebApplicationFactory<Program>` para tests de integración.
- Inyecta la factory con `IClassFixture<WebApplicationFactory<Program>>`.
- Nombres descriptivos: `MetodoUnderTest_Escenario_ResultadoEsperado`.
- Cada test debe ser independiente y no depender de orden de ejecución.
- Usa `HttpClient` methods (`GetAsync`, `PostAsJsonAsync`, etc.) para probar endpoints.
- Verifica status codes con `response.StatusCode.Should().Be(HttpStatusCode.X)`.
