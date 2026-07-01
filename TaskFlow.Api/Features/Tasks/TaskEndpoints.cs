using FluentValidation;
using Microsoft.EntityFrameworkCore;
using TaskFlow.Api.Data;
using TaskFlow.Api.Domain;

namespace TaskFlow.Api.Features.Tasks;

public static class TaskEndpoints
{
    public static void MapTaskEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/tasks").WithTags("Tasks");

        group.MapGet("/", async (TaskFlowDbContext db) =>
        {
            var tasks = await db.Tasks.AsNoTracking().ToListAsync();
            return Results.Ok(tasks.Select(MapToResponse));
        });

        group.MapGet("/{id:int}", async (int id, TaskFlowDbContext db) =>
        {
            var task = await db.Tasks.FindAsync(id);
            return task is null
                ? Results.Problem("Task not found.", statusCode: 404)
                : Results.Ok(MapToResponse(task));
        });

        group.MapPost("/", async (CreateTaskRequest request, IValidator<CreateTaskRequest> validator, TaskFlowDbContext db) =>
        {
            var validationResult = await validator.ValidateAsync(request);
            if (!validationResult.IsValid)
                return Results.ValidationProblem(validationResult.ToDictionary());

            var task = new TaskItem
            {
                Title = request.Title,
                Description = request.Description,
                ProjectId = request.ProjectId
            };

            db.Tasks.Add(task);
            await db.SaveChangesAsync();

            return Results.Created($"/tasks/{task.Id}", MapToResponse(task));
        });

        group.MapPut("/{id:int}", async (int id, UpdateTaskRequest request, IValidator<UpdateTaskRequest> validator, TaskFlowDbContext db) =>
        {
            var validationResult = await validator.ValidateAsync(request);
            if (!validationResult.IsValid)
                return Results.ValidationProblem(validationResult.ToDictionary());

            var task = await db.Tasks.FindAsync(id);
            if (task is null)
                return Results.Problem("Task not found.", statusCode: 404);

            task.Title = request.Title;
            task.Description = request.Description;
            task.IsCompleted = request.IsCompleted;

            await db.SaveChangesAsync();
            return Results.Ok(MapToResponse(task));
        });

        group.MapDelete("/{id:int}", async (int id, TaskFlowDbContext db) =>
        {
            var task = await db.Tasks.FindAsync(id);
            if (task is null)
                return Results.Problem("Task not found.", statusCode: 404);

            db.Tasks.Remove(task);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }

    private static TaskResponse MapToResponse(TaskItem task) =>
        new(task.Id, task.Title, task.Description, task.IsCompleted, task.CreatedAt, task.ProjectId);
}
