namespace TaskFlow.Api.Features.Projects;

public record ProjectResponse(int Id, string Name, string? Description, DateTime CreatedAt);
public record CreateProjectRequest(string Name, string? Description);
public record UpdateProjectRequest(string Name, string? Description);
