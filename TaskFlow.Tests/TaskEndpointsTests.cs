using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using TaskFlow.Api.Features.Tasks;

namespace TaskFlow.Tests;

public class TaskEndpointsTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client = factory.CreateClient();

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
