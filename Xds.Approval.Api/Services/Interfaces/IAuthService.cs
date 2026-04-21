using Xds.Approval.Api.DTOs.Auth;
using Xds.Approval.Api.DTOs.Common;

public interface IAuthService
{
    Task<AuthResponseDto?> LoginAsync(LoginRequestDto request);
    Task<ServiceResult<AuthResponseDto>> RegisterAsync(RegisterRequestDto request);
}
