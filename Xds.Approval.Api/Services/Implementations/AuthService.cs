using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Xds.Approval.Api.DTOs.Auth;
using Xds.Approval.Api.DTOs.Common;
using Xds.Approval.Api.Models;

public class AuthService : IAuthService
{
    private static readonly string[] AllowedRoles = ["User", "CEO", "Finance", "HeadOfFinance"];
    private readonly IConfiguration _configuration;
    private readonly AppDbContext _context;
    private readonly PasswordHasher<AuthUser> _passwordHasher;

    public AuthService(IConfiguration configuration, AppDbContext context)
    {
        _configuration = configuration;
        _context = context;
        _passwordHasher = new PasswordHasher<AuthUser>();
    }

    public async Task<AuthResponseDto?> LoginAsync(LoginRequestDto request)
    {
        var user = await _context.AuthUsers
            .FirstOrDefaultAsync(u => u.Username.ToLower() == request.Username.ToLower());

        if (user is null)
        {
            return null;
        }

        var passwordVerificationResult = _passwordHasher.VerifyHashedPassword(
            user,
            user.PasswordHash,
            request.Password);

        if (passwordVerificationResult == PasswordVerificationResult.Failed)
        {
            return null;
        }

        var jwtSettings = _configuration.GetSection("Jwt");
        var jwtKey = jwtSettings["Key"] ?? throw new InvalidOperationException("JWT configuration is missing: Jwt:Key");
        var jwtIssuer = jwtSettings["Issuer"] ?? throw new InvalidOperationException("JWT configuration is missing: Jwt:Issuer");
        var jwtAudience = jwtSettings["Audience"] ?? throw new InvalidOperationException("JWT configuration is missing: Jwt:Audience");
        var durationInMinutes = int.TryParse(jwtSettings["DurationInMinutes"], out var parsedDuration)
            ? parsedDuration
            : 60;

        var expiresAtUtc = DateTime.UtcNow.AddMinutes(durationInMinutes);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.UniqueName, user.Username),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.Username),
            new(ClaimTypes.Role, user.Role),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: jwtIssuer,
            audience: jwtAudience,
            claims: claims,
            expires: expiresAtUtc,
            signingCredentials: credentials);

        return new AuthResponseDto
        {
            Token = new JwtSecurityTokenHandler().WriteToken(token),
            ExpiresAtUtc = expiresAtUtc,
            Username = user.Username,
            Email = string.IsNullOrWhiteSpace(user.Email) ? user.Username : user.Email,
            FullName = string.IsNullOrWhiteSpace(user.FullName) ? user.Username : user.FullName,
            Department = string.IsNullOrWhiteSpace(user.Department) ? "General" : user.Department,
            Role = user.Role
        };
    }

    public async Task<ServiceResult<AuthResponseDto>> RegisterAsync(RegisterRequestDto request)
    {
        var normalizedFullName = request.FullName.Trim();
        if (string.IsNullOrWhiteSpace(normalizedFullName))
        {
            return ServiceResult<AuthResponseDto>.Fail(ServiceResultType.ValidationError, "Full name is required.");
        }

        var normalizedDepartment = request.Department.Trim();
        if (string.IsNullOrWhiteSpace(normalizedDepartment))
        {
            return ServiceResult<AuthResponseDto>.Fail(ServiceResultType.ValidationError, "Department is required.");
        }

        var normalizedUsername = request.Username.Trim();
        if (string.IsNullOrWhiteSpace(normalizedUsername))
        {
            return ServiceResult<AuthResponseDto>.Fail(ServiceResultType.ValidationError, "Username is required.");
        }

        var normalizedEmail = request.Email.Trim();
        if (string.IsNullOrWhiteSpace(normalizedEmail))
        {
            return ServiceResult<AuthResponseDto>.Fail(ServiceResultType.ValidationError, "Email is required.");
        }

        var normalizedRole = AllowedRoles
            .FirstOrDefault(role => string.Equals(role, request.Role.Trim(), StringComparison.OrdinalIgnoreCase));

        if (normalizedRole is null)
        {
            return ServiceResult<AuthResponseDto>.Fail(
                ServiceResultType.ValidationError,
                "Role must be one of the following values: User, CEO, Finance, HeadOfFinance.");
        }

        var usernameExists = await _context.AuthUsers
            .AnyAsync(user => user.Username.ToLower() == normalizedUsername.ToLower());

        if (usernameExists)
        {
            return ServiceResult<AuthResponseDto>.Fail(ServiceResultType.Conflict, "Username already exists.");
        }

        var emailExists = await _context.AuthUsers
            .AnyAsync(user => user.Email != null && user.Email.ToLower() == normalizedEmail.ToLower());

        if (emailExists)
        {
            return ServiceResult<AuthResponseDto>.Fail(ServiceResultType.Conflict, "Email already exists.");
        }

        var user = new AuthUser
        {
            FullName = normalizedFullName,
            Department = normalizedDepartment,
            Username = normalizedUsername,
            Email = normalizedEmail,
            Role = normalizedRole
        };

        user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);

        _context.AuthUsers.Add(user);
        await _context.SaveChangesAsync();

        var authResponse = await LoginAsync(new LoginRequestDto
        {
            Username = request.Username,
            Password = request.Password
        });

        if (authResponse is null)
        {
            return ServiceResult<AuthResponseDto>.Fail(ServiceResultType.Conflict, "User created but automatic login failed.");
        }

        return ServiceResult<AuthResponseDto>.Ok(authResponse, "User registered successfully.");
    }
}
