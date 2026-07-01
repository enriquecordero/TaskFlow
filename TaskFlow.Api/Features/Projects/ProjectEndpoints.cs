using FluentValidation;
using Microsoft.EntityFrameworkCore;
using TaskFlow.Api.Data;
using TaskFlow.Api.Domain;

namespace TaskFlow.Api.Features.Projects;

public static class ProjectEndpoints
{
    public static void MapProjectEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/projects").WithTags("Projects");

        group.MapGet("/", async (TaskFlowDbContext db) =>
        {
            var projects = await db.Projects.AsNoTracking().ToListAsync();
            return Results.Ok(projects.Select(MapToResponse));
        });

        group.MapGet("/{id:int}", async (int id, TaskFlowDbContext db) =>
        {
            var project = await db.Projects.FindAsync(id);
            return project is null
                ? Results.Problem("Project not found.", statusCode: 404)
                : Results.Ok(MapToResponse(project));
        });

        group.MapPost("/", async (CreateProjectRequest request, IValidator<CreateProjectRequest> validator, TaskFlowDbContext db) =>
        {
            var validationResult = await validator.ValidateAsync(request);
            if (!validationResult.IsValid)
                return Results.ValidationProblem(validationResult.ToDictionary());

            var project = new Project
            {
                Name = request.Name,
                Description = request.Description
            };

            db.Projects.Add(project);
            await db.SaveChangesAsync();

            return Results.Created($"/projects/{project.Id}", MapToResponse(project));
        });

        group.MapPut("/{id:int}", async (int id, UpdateProjectRequest request, IValidator<UpdateProjectRequest> validator, TaskFlowDbContext db) =>
        {
            var validationResult = await validator.ValidateAsync(request);
            if (!validationResult.IsValid)
                return Results.ValidationProblem(validationResult.ToDictionary());

            var project = await db.Projects.FindAsync(id);
            if (project is null)
                return Results.Problem("Project not found.", statusCode: 404);

            project.Name = request.Name;
            project.Description = request.Description;

            await db.SaveChangesAsync();
            return Results.Ok(MapToResponse(project));
        });

        group.MapDelete("/{id:int}", async (int id, TaskFlowDbContext db) =>
        {
            var project = await db.Projects.FindAsync(id);
            if (project is null)
                return Results.Problem("Project not found.", statusCode: 404);

            db.Projects.Remove(project);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }

    private static ProjectResponse MapToResponse(Project project) =>
        new(project.Id, project.Name, project.Description, project.CreatedAt);
}
