using System.Text;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Data.SqlClient;
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
var defaultConnectionString = BuildDefaultConnectionString(builder.Configuration);

// DB
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        defaultConnectionString,
        sqlOptions =>
        {
            sqlOptions.UseCompatibilityLevel(120);
            sqlOptions.EnableRetryOnFailure(
                maxRetryCount: 10,
                maxRetryDelay: TimeSpan.FromSeconds(10),
                errorNumbersToAdd: null);
        }));

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
var startupLogger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Startup");

EnsureStorageFolders(app.Configuration, app.Environment, startupLogger);

await ApplyDatabaseMigrationsAsync(app.Services, startupLogger, app.Configuration);

// Pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var exception = context.Features.Get<IExceptionHandlerFeature>()?.Error;
        var logger = context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("UnhandledException");

        var (statusCode, title, detail) = exception switch
        {
            SqlException => (StatusCodes.Status503ServiceUnavailable, "Database unavailable", "SQL Server is unavailable or rejected the request. Check the connection string, database schema, and SQL Server service."),
            DbUpdateException => (StatusCodes.Status503ServiceUnavailable, "Database update failed", "The request could not be saved. Check required database columns, constraints, and migrations."),
            IOException => (StatusCodes.Status503ServiceUnavailable, "File storage unavailable", "The API could not access the required upload or document folder."),
            UnauthorizedAccessException => (StatusCodes.Status503ServiceUnavailable, "File storage permission denied", "The API does not have permission to access the required upload or document folder."),
            _ => (StatusCodes.Status500InternalServerError, "Server error", app.Environment.IsDevelopment()
                ? exception?.Message ?? "Unexpected server error."
                : "Unexpected server error.")
        };

        logger.LogError(exception, "{Title} while handling {Method} {Path}", title, context.Request.Method, context.Request.Path);

        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/problem+json";
        await context.Response.WriteAsJsonAsync(new
        {
            type = "about:blank",
            title,
            status = statusCode,
            detail
        });
    });
});

// ⚠️ ORDRE IMPORTANT
app.UseStaticFiles();

app.UseRouting(); // ✅ important

app.UseCors(CorsPolicy);

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

static void EnsureStorageFolders(IConfiguration configuration, IWebHostEnvironment environment, ILogger logger)
{
    var folders = new[]
    {
        configuration["FileStorage:UploadFolder"],
        configuration["PdfTemplate:ArchiveFolder"],
        Path.Combine("wwwroot", "uploads"),
        Path.Combine("wwwroot", "documents")
    };

    foreach (var folder in folders.Where(folder => !string.IsNullOrWhiteSpace(folder)).Distinct(StringComparer.OrdinalIgnoreCase))
    {
        var fullPath = Path.IsPathRooted(folder!)
            ? folder!
            : Path.Combine(environment.ContentRootPath, folder!);

        Directory.CreateDirectory(fullPath);
        logger.LogInformation("Ensured storage folder exists: {StorageFolder}", fullPath);
    }
}

static string BuildDefaultConnectionString(IConfiguration configuration)
{
    var explicitConnectionString = configuration.GetConnectionString("DefaultConnection");
    var sqlPassword = configuration["MSSQL_SA_PASSWORD"] ?? configuration["SQL_PASSWORD"];

    if (string.IsNullOrWhiteSpace(sqlPassword))
    {
        return explicitConnectionString
            ?? throw new InvalidOperationException("Database configuration is missing: ConnectionStrings:DefaultConnection.");
    }

    var sqlServer = configuration["SQL_SERVER"] ?? "127.0.0.1,1433";
    var sqlDatabase = configuration["SQL_DATABASE"] ?? "XdsApprovalDb";
    var sqlUser = configuration["SQL_USER"] ?? "sa";

    return $"Server={sqlServer};Database={sqlDatabase};User Id={sqlUser};Password={sqlPassword};Encrypt=false;TrustServerCertificate=true";
}

static async Task ApplyDatabaseMigrationsAsync(IServiceProvider services, ILogger logger, IConfiguration configuration)
{
    var maxAttempts = configuration.GetValue<int?>("Database:MigrateMaxAttempts") ?? 30;
    var retryDelaySeconds = configuration.GetValue<int?>("Database:MigrateRetryDelaySeconds") ?? 5;
    var retryDelay = TimeSpan.FromSeconds(Math.Max(1, retryDelaySeconds));

    for (var attempt = 1; attempt <= maxAttempts; attempt++)
    {
        try
        {
            using var scope = services.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var pendingMigrations = (await dbContext.Database.GetPendingMigrationsAsync()).ToList();

            if (pendingMigrations.Count > 0)
            {
                logger.LogInformation(
                    "Applying {MigrationCount} pending database migration(s): {Migrations}",
                    pendingMigrations.Count,
                    string.Join(", ", pendingMigrations));
            }
            else
            {
                logger.LogInformation("No pending database migrations.");
            }

            await dbContext.Database.MigrateAsync();
            await RepairDatabaseSchemaAsync(dbContext, logger);
            logger.LogInformation("Database migration check completed successfully.");
            return;
        }
        catch (Exception exception) when (exception is SqlException or InvalidOperationException)
        {
            if (attempt == maxAttempts)
            {
                logger.LogCritical(
                    exception,
                    "Database migration failed after {AttemptCount} attempt(s). The API will stop so Docker can restart it after SQL Server is ready.",
                    maxAttempts);
                throw;
            }

            logger.LogWarning(
                exception,
                "Database migration attempt {Attempt}/{MaxAttempts} failed. Retrying in {RetryDelaySeconds} second(s).",
                attempt,
                maxAttempts,
                retryDelay.TotalSeconds);

            await Task.Delay(retryDelay);
        }
    }
}

static async Task RepairDatabaseSchemaAsync(AppDbContext dbContext, ILogger logger)
{
    logger.LogInformation("Checking database schema drift for required columns.");

    await dbContext.Database.ExecuteSqlRawAsync("""
        IF OBJECT_ID(N'[AuthUsers]', N'U') IS NOT NULL
        BEGIN
            IF COL_LENGTH('AuthUsers', 'Email') IS NULL
            BEGIN
                ALTER TABLE [AuthUsers] ADD [Email] nvarchar(180) NULL;
            END;

            IF COL_LENGTH('AuthUsers', 'FullName') IS NULL
            BEGIN
                ALTER TABLE [AuthUsers] ADD [FullName] nvarchar(150) NULL;
            END;

            IF COL_LENGTH('AuthUsers', 'Department') IS NULL
            BEGIN
                ALTER TABLE [AuthUsers] ADD [Department] nvarchar(100) NULL;
            END;

            EXEC(N'
                UPDATE [AuthUsers]
                SET [Email] = [Username]
                WHERE [Email] IS NULL OR LTRIM(RTRIM([Email])) = '''';
            ');

            EXEC(N'
                UPDATE [AuthUsers]
                SET [FullName] = [Username]
                WHERE [FullName] IS NULL OR LTRIM(RTRIM([FullName])) = '''';
            ');

            EXEC(N'
                UPDATE [AuthUsers]
                SET [Department] = N''General''
                WHERE [Department] IS NULL OR LTRIM(RTRIM([Department])) = '''';
            ');
        END;

        IF OBJECT_ID(N'[PaymentRequests]', N'U') IS NOT NULL
        BEGIN
            IF COL_LENGTH('PaymentRequests', 'Currency') IS NULL
            BEGIN
                ALTER TABLE [PaymentRequests] ADD [Currency] nvarchar(10) NULL;
            END;

            IF COL_LENGTH('PaymentRequests', 'Deadline') IS NULL
            BEGIN
                ALTER TABLE [PaymentRequests]
                ADD [Deadline] datetime2 NOT NULL
                CONSTRAINT [DF_PaymentRequests_Deadline_RuntimeRepair] DEFAULT (GETUTCDATE());
            END;

            IF COL_LENGTH('PaymentRequests', 'PaymentType') IS NULL
            BEGIN
                ALTER TABLE [PaymentRequests] ADD [PaymentType] nvarchar(50) NULL;
            END;

            EXEC(N'
                UPDATE [PaymentRequests]
                SET [Currency] = N''GHS''
                WHERE [Currency] IS NULL OR LTRIM(RTRIM([Currency])) = '''';
            ');

            EXEC(N'
                UPDATE [PaymentRequests]
                SET [PaymentType] = N''One-off''
                WHERE [PaymentType] IS NULL
                   OR LTRIM(RTRIM([PaymentType])) = ''''
                   OR [PaymentType] IN (N''One month'', N''One off'', N''one-off'', N''one off'', N''Once-off'', N''once off'', N''once-off'');
            ');
        END;

        IF OBJECT_ID(N'[Approvals]', N'U') IS NOT NULL
        BEGIN
            IF COL_LENGTH('Approvals', 'Stage') IS NULL
            BEGIN
                ALTER TABLE [Approvals] ADD [Stage] nvarchar(50) NULL;
            END;

            EXEC(N'
                UPDATE [Approvals]
                SET [Stage] = N''Initial''
                WHERE [Stage] IS NULL OR LTRIM(RTRIM([Stage])) = '''';
            ');
        END;

        IF OBJECT_ID(N'[FinanceProcessings]', N'U') IS NOT NULL
        BEGIN
            IF COL_LENGTH('FinanceProcessings', 'ProcessedBy') IS NOT NULL
               AND COL_LENGTH('FinanceProcessings', 'PreparedBy') IS NULL
            BEGIN
                EXEC sp_rename N'[FinanceProcessings].[ProcessedBy]', N'PreparedBy', N'COLUMN';
            END;

            IF COL_LENGTH('FinanceProcessings', 'ProcessedAt') IS NOT NULL
               AND COL_LENGTH('FinanceProcessings', 'PreparedAt') IS NULL
            BEGIN
                EXEC sp_rename N'[FinanceProcessings].[ProcessedAt]', N'PreparedAt', N'COLUMN';
            END;

            IF COL_LENGTH('FinanceProcessings', 'PreparedBy') IS NULL
            BEGIN
                ALTER TABLE [FinanceProcessings]
                ADD [PreparedBy] int NOT NULL
                CONSTRAINT [DF_FinanceProcessings_PreparedBy_RuntimeRepair] DEFAULT (0);
            END;

            IF COL_LENGTH('FinanceProcessings', 'PreparedAt') IS NULL
            BEGIN
                ALTER TABLE [FinanceProcessings]
                ADD [PreparedAt] datetime2 NOT NULL
                CONSTRAINT [DF_FinanceProcessings_PreparedAt_RuntimeRepair] DEFAULT (GETUTCDATE());
            END;

            IF COL_LENGTH('FinanceProcessings', 'AuthorizedBy') IS NULL
            BEGIN
                ALTER TABLE [FinanceProcessings] ADD [AuthorizedBy] int NULL;
            END;

            IF COL_LENGTH('FinanceProcessings', 'AuthorizedAt') IS NULL
            BEGIN
                ALTER TABLE [FinanceProcessings] ADD [AuthorizedAt] datetime2 NULL;
            END;

            IF COL_LENGTH('FinanceProcessings', 'CompanyName') IS NULL
            BEGIN
                ALTER TABLE [FinanceProcessings] ADD [CompanyName] nvarchar(255) NULL;
            END;

            IF COL_LENGTH('FinanceProcessings', 'RecipientName') IS NULL
            BEGIN
                ALTER TABLE [FinanceProcessings] ADD [RecipientName] nvarchar(255) NULL;
            END;

            IF COL_LENGTH('FinanceProcessings', 'RecipientAddress') IS NULL
            BEGIN
                ALTER TABLE [FinanceProcessings] ADD [RecipientAddress] nvarchar(500) NULL;
            END;

            IF COL_LENGTH('FinanceProcessings', 'RecipientTelephone') IS NULL
            BEGIN
                ALTER TABLE [FinanceProcessings] ADD [RecipientTelephone] nvarchar(50) NULL;
            END;
        END;
        """);

    logger.LogInformation("Database schema drift check completed.");
}


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
