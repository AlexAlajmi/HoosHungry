using System.Text.Json.Serialization;
using backend;

var builder = WebApplication.CreateBuilder(args);
var supabase =
    builder.Configuration.GetSection("Supabase").Get<SupabaseSettings>() ?? new SupabaseSettings();
supabase.Url =
    Environment.GetEnvironmentVariable("SUPABASE_URL")
    ?? builder.Configuration["SUPABASE_URL"]
    ?? supabase.Url;
supabase.ServiceRoleKey =
    Environment.GetEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY")
    ?? Environment.GetEnvironmentVariable("SUPABASE_SECRET_KEY")
    ?? builder.Configuration["SUPABASE_SERVICE_ROLE_KEY"]
    ?? builder.Configuration["SUPABASE_SECRET_KEY"]
    ?? supabase.ServiceRoleKey;
supabase.Schema =
    Environment.GetEnvironmentVariable("SUPABASE_SCHEMA")
    ?? builder.Configuration["SUPABASE_SCHEMA"]
    ?? supabase.Schema;

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(options =>
{
    options.AddPolicy(
        "frontend",
        policy =>
            policy
                .AllowAnyHeader()
                .AllowAnyMethod()
                .WithOrigins("http://localhost:5173", "https://localhost:5173")
    );
});
builder.Services.AddHttpClient();
builder.Services.AddSingleton(supabase);

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();
app.UseCors("frontend");

app.MapMarketplaceApi();

app.Run();
