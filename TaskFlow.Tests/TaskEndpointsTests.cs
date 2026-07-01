using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TaskFlow.Api.Data;
using TaskFlow.Api.Features.Tasks;

namespace TaskFlow.Tests;

public class TaskEndpointsTests : IDisposable
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;

    public TaskEndpointsTests()
    {
        // xUnit crea una instancia nueva de la clase por cada test, asi que cada
        // test recibe una base InMemory con nombre unico: quedan aislados y no
        // dependen del orden de ejecucion.
        _factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                var descriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(DbContextOptions<TaskFlowDbContext>));
                if (descriptor is not null)
                    services.Remove(descriptor);

                services.AddDbContext<TaskFlowDbContext>(options =>
                    options.UseInMemoryDatabase($"TaskFlow-{Guid.NewGuid()}"));
            });
        });
        _client = _factory.CreateClient();
    }

    public void Dispose() => _factory.Dispose();

    [Fact]
    public async Task GetTasks_ReturnsEmptyList_WhenNoTasksExist()
    {
        // Arrange & Act
        var response = await _client.GetAsync("/tasks");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var tasks = await response.Content.ReadFromJsonAsync<List<TaskResponse>>();
        tasks.Should().NotBeNull().And.BeEmpty();
    }

    [Fact]
    public async Task CreateTask_ReturnsCreated_WhenRequestIsValid()
    {
        // Arrange
        var request = new CreateTaskRequest("Test Task", "A test description", null);

        // Act
        var response = await _client.PostAsJsonAsync("/tasks", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var task = await response.Content.ReadFromJsonAsync<TaskResponse>();
        task.Should().NotBeNull();
        task!.Title.Should().Be("Test Task");
        task.Description.Should().Be("A test description");
        task.IsCompleted.Should().BeFalse();
    }

    [Fact]
    public async Task CreateTask_ReturnsBadRequest_WhenTitleIsEmpty()
    {
        // Arrange
        var request = new CreateTaskRequest("", null, null);

        // Act
        var response = await _client.PostAsJsonAsync("/tasks", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetTask_ReturnsNotFound_WhenTaskDoesNotExist()
    {
        // Arrange & Act
        var response = await _client.GetAsync("/tasks/99999");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
