using FluentValidation;
using Microsoft.EntityFrameworkCore;
using TaskFlow.Api.Data;
using TaskFlow.Api.Features.Projects;
using TaskFlow.Api.Features.Tasks;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<TaskFlowDbContext>(options =>
    options.UseInMemoryDatabase("TaskFlow"));

builder.Services.AddValidatorsFromAssemblyContaining<Program>();

builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

var app = builder.Build();

app.UseCors();

app.MapTaskEndpoints();
app.MapProjectEndpoints();

app.Run();

public partial class Program;
