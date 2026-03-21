using System.Text.Json.Serialization;
using backend;

var builder = WebApplication.CreateBuilder(args);
var supabase =
    builder.Configuration.GetSection("Supabase").Get<SupabaseSettings>() ?? new SupabaseSettings();

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
