using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using QuestPDF.Infrastructure;
using Xds.Approval.Api.Models;

var builder = WebApplication.CreateBuilder(args);

// License QuestPDF
QuestPDF.Settings.License = LicenseType.Community;

// Logging
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

// JWT Config
var jwtSettings = builder.Configuration.GetSection("Jwt");
var jwtKey = jwtSettings["Key"] ?? throw new InvalidOperationException("JWT configuration is missing: Jwt:Key");
var jwtIssuer = jwtSettings["Issuer"] ?? throw new InvalidOperationException("JWT configuration is missing: Jwt:Issuer");
var jwtAudience = jwtSettings["Audience"] ?? throw new InvalidOperationException("JWT configuration is missing: Jwt:Audience");
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>()?
    .Where(origin => !string.IsNullOrWhiteSpace(origin))
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray()
    ?? ["http://localhost:8084", "http://127.0.0.1:8084", "http://192.168.1.2:8084"];

const string CorsPolicy = "FrontendPolicy";

// DB
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        sqlOptions => sqlOptions.UseCompatibilityLevel(120)));

// Controllers
builder.Services.AddControllers();

// ✅ CORS (corrigé proprement)
builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicy, policy =>
    {
        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
            // ❌ PAS de AllowCredentials ici (JWT = OK)
    });
});

// Swagger + JWT
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Xds Approval API",
        Version = "v1"
    });

    var securityScheme = new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Description = "Enter 'Bearer {token}'",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    };

    options.AddSecurityDefinition("Bearer", securityScheme);

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// Auth JWT
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),

            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,

            ValidateAudience = true,
            ValidAudience = jwtAudience,

            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });

// Authorization
builder.Services.AddAuthorization();

// Services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IPaymentService, PaymentService>();

var app = builder.Build();

// Migration auto
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    dbContext.Database.Migrate();
}

// Pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// ⚠️ ORDRE IMPORTANT
app.UseStaticFiles();

app.UseRouting(); // ✅ important

app.UseCors(CorsPolicy);

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();


// using System.Text;
// using Microsoft.AspNetCore.Authentication.JwtBearer;
// using Microsoft.AspNetCore.Authorization;
// using Microsoft.EntityFrameworkCore;
// using Microsoft.Extensions.Logging;
// using Microsoft.IdentityModel.Tokens;
// using Microsoft.OpenApi.Models;
// using QuestPDF.Infrastructure;
// using Xds.Approval.Api.Models;

// var builder = WebApplication.CreateBuilder(args);
// QuestPDF.Settings.License = LicenseType.Community;
// builder.Logging.ClearProviders();
// builder.Logging.AddConsole();
// builder.Logging.AddDebug();
// var jwtSettings = builder.Configuration.GetSection("Jwt");
// var jwtKey = jwtSettings["Key"] ?? throw new InvalidOperationException("JWT configuration is missing: Jwt:Key");
// var jwtIssuer = jwtSettings["Issuer"] ?? throw new InvalidOperationException("JWT configuration is missing: Jwt:Issuer");
// var jwtAudience = jwtSettings["Audience"] ?? throw new InvalidOperationException("JWT configuration is missing: Jwt:Audience");
// const string LocalFrontendCorsPolicy = "LocalFrontendCorsPolicy";

// // Add services to the container.
// builder.Services.AddDbContext<AppDbContext>(options =>
//     options.UseSqlServer(
//         builder.Configuration.GetConnectionString("DefaultConnection"),
//         sqlOptions => sqlOptions.UseCompatibilityLevel(120)));

// builder.Services.AddControllers();
// builder.Services.AddCors(options =>
// {
//     options.AddPolicy(LocalFrontendCorsPolicy, policy =>
//     {
//         policy.WithOrigins(
//                 "http://192.168.1.2:8084"
//                 )
//             .AllowAnyHeader()
//             .AllowAnyMethod();
//     });
// });
// builder.Services.AddEndpointsApiExplorer();
// builder.Services.AddSwaggerGen(options =>
// {
//     options.SwaggerDoc("v1", new OpenApiInfo
//     {
//         Title = "Xds Approval API",
//         Version = "v1"
//     });

//     var securityScheme = new OpenApiSecurityScheme
//     {
//         Name = "Authorization",
//         Description = "Enter the JWT bearer token.",
//         In = ParameterLocation.Header,
//         Type = SecuritySchemeType.Http,
//         Scheme = JwtBearerDefaults.AuthenticationScheme,
//         BearerFormat = "JWT",
//         Reference = new OpenApiReference
//         {
//             Id = JwtBearerDefaults.AuthenticationScheme,
//             Type = ReferenceType.SecurityScheme
//         }
//     };

//     options.AddSecurityDefinition(securityScheme.Reference.Id, securityScheme);
//     options.AddSecurityRequirement(new OpenApiSecurityRequirement
//     {
//         { securityScheme, Array.Empty<string>() }
//     });
// });

// builder.Services
//     .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
//     .AddJwtBearer(options =>
//     {
//         options.TokenValidationParameters = new TokenValidationParameters
//         {
//             ValidateIssuerSigningKey = true,
//             IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
//             ValidateIssuer = true,
//             ValidIssuer = jwtIssuer,
//             ValidateAudience = true,
//             ValidAudience = jwtAudience,
//             ValidateLifetime = true,
//             ClockSkew = TimeSpan.Zero
//         };
//     });

// builder.Services.AddAuthorization();
// builder.Services.AddScoped<IAuthService, AuthService>();
// builder.Services.AddScoped<IPaymentService, PaymentService>();

// var app = builder.Build();

// using (var scope = app.Services.CreateScope())
// {
//     var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
//     dbContext.Database.Migrate();
// }

// // Configure the HTTP request pipeline.
// if (app.Environment.IsDevelopment())
// {
//     app.UseSwagger();
//     app.UseSwaggerUI();
// }

// app.UseStaticFiles();
// //app.UseHttpsRedirection();
// app.UseCors(LocalFrontendCorsPolicy);
// app.UseAuthentication();
// app.UseAuthorization();
// app.MapControllers();

// app.Run();
