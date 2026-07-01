namespace TaskFlow.Api.Features.Tasks;

public record TaskResponse(int Id, string Title, string? Description, bool IsCompleted, DateTime CreatedAt, int? ProjectId);
public record CreateTaskRequest(string Title, string? Description, int? ProjectId);
public record UpdateTaskRequest(string Title, string? Description, bool IsCompleted);
