using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Xds.Approval.Api.DTOs.Auth;
using Xds.Approval.Api.DTOs.Common;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequestDto request)
    {
        var result = await _authService.RegisterAsync(request);

        return result.ResultType switch
        {
            ServiceResultType.Conflict => Conflict(result.Message),
            ServiceResultType.ValidationError => BadRequest(result.Message),
            _ => Ok(result.Data)
        };
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequestDto request)
    {
        var result = await _authService.LoginAsync(request);

        if (result is null)
        {
            return Unauthorized("Invalid username or password.");
        }

        return Ok(result);
    }
}
