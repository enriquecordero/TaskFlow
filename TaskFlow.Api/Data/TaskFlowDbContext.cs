using Microsoft.EntityFrameworkCore;
using TaskFlow.Api.Domain;

namespace TaskFlow.Api.Data;

public class TaskFlowDbContext(DbContextOptions<TaskFlowDbContext> options) : DbContext(options)
{
    public DbSet<TaskItem> Tasks => Set<TaskItem>();
    public DbSet<Project> Projects => Set<Project>();
}
