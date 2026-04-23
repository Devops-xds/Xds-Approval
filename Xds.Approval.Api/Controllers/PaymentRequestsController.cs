using Microsoft.EntityFrameworkCore;
using Xds.Approval.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Xds.Approval.Api.DTOs.Audit;
using Xds.Approval.Api.DTOs.Common;
using Xds.Approval.Api.DTOs.Pdf;
using Xds.Approval.Api.DTOs.Payment;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PaymentRequestsController : ControllerBase
{
    private readonly IPaymentService _service;

    public PaymentRequestsController(IPaymentService service)
    {
        _service = service;
    }

    [HttpPost]
    [Authorize(Roles = "User")]
    public async Task<IActionResult> Create(CreatePaymentRequestDto dto)
    {
        var createdRequest = await _service.CreateAsync(dto, GetCurrentUserId());
        return CreatedAtAction(nameof(GetById), new { id = createdRequest.Id }, createdRequest);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        return Ok(await _service.GetAllAsync(GetCurrentUserId(), GetCurrentUserRole()));
    }

    [HttpGet("audit-logs")]
    [Authorize(Roles = "User,CEO,Finance,HeadOfFinance")]
    public async Task<IActionResult> SearchAuditLogs([FromQuery] AuditLogQueryDto query)
    {
        var result = await _service.SearchAuditLogsAsync(query, GetCurrentUserId(), GetCurrentUserRole());

        return result.ResultType switch
        {
            ServiceResultType.NotFound => NotFound(result.Message),
            ServiceResultType.Conflict => Conflict(result.Message),
            ServiceResultType.ValidationError => BadRequest(result.Message),
            _ => Ok(result.Data)
        };
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var request = await _service.GetByIdAsync(id, GetCurrentUserId(), GetCurrentUserRole());
        return request is null ? NotFound() : Ok(request);
    }

    [HttpGet("{id:int}/audit-logs")]
    [Authorize(Roles = "User,CEO,Finance,HeadOfFinance")]
    public async Task<IActionResult> GetAuditLogs(int id)
    {
        var result = await _service.GetAuditLogsAsync(id, GetCurrentUserId(), GetCurrentUserRole());

        return result.ResultType switch
        {
            ServiceResultType.NotFound => NotFound(result.Message),
            ServiceResultType.Conflict => Conflict(result.Message),
            ServiceResultType.ValidationError => BadRequest(result.Message),
            _ => Ok(result.Data)
        };
    }

    [HttpPost("approve")]
    [Authorize(Roles = "CEO")]
    public async Task<IActionResult> Approve(ApprovalDto dto)
    {
        var result = await _service.ApproveAsync(dto, GetCurrentUserId());
        return BuildActionResult(result);
    }

    [HttpPost("{id}/process")]
    [Authorize(Roles = "Finance,HeadOfFinance")]
    public async Task<IActionResult> Process(int id, FinanceProcessRequestDto dto)
    {
        var result = await _service.ProcessFinanceAsync(id, dto, GetCurrentUserId(), GetCurrentUserRole());
        return BuildActionResult(result);
    }

    [HttpPost("{id}/attachments")]
    [Authorize(Roles = "User,Finance,HeadOfFinance")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadAttachment(int id, IFormFile file)
    {
        var result = await _service.UploadAttachmentAsync(id, file, GetCurrentUserId());

        return result.ResultType switch
        {
            ServiceResultType.NotFound => NotFound(result.Message),
            ServiceResultType.Conflict => Conflict(result.Message),
            ServiceResultType.ValidationError => BadRequest(result.Message),
            _ => Created(result.Data?.FileUrl ?? string.Empty, result)
        };
    }

    [HttpGet("{id}/attachments/{attachmentId:int}")]
    [Authorize(Roles = "User,CEO,Finance,HeadOfFinance")]
    public async Task<IActionResult> DownloadAttachment(int id, int attachmentId)
    {
        var result = await _service.GetAttachmentAsync(id, attachmentId, GetCurrentUserId(), GetCurrentUserRole());

        return result.ResultType switch
        {
            ServiceResultType.NotFound => NotFound(result.Message),
            ServiceResultType.Conflict => Conflict(result.Message),
            ServiceResultType.ValidationError => BadRequest(result.Message),
            _ => File(result.Data!.Content, result.Data.ContentType, result.Data.FileName)
        };
    }

    [HttpGet("{id}/document")]
    [Authorize(Roles = "User,CEO,Finance,HeadOfFinance")]
    public async Task<IActionResult> DownloadDocument(int id)
    {
        var result = await _service.GeneratePdfAsync(id, GetCurrentUserId(), GetCurrentUserRole());

        return result.ResultType switch
        {
            ServiceResultType.NotFound => NotFound(result.Message),
            ServiceResultType.Conflict => Conflict(result.Message),
            ServiceResultType.ValidationError => BadRequest(result.Message),
            _ => File(result.Data!.Content, result.Data.ContentType, result.Data.FileName)
        };
    }

    [HttpGet("{id}/document/archive")]
    [Authorize(Roles = "User,CEO,Finance,HeadOfFinance")]
    public async Task<IActionResult> DownloadArchivedDocument(int id)
    {
        var result = await _service.GetArchivedPdfAsync(id, GetCurrentUserId(), GetCurrentUserRole());

        return result.ResultType switch
        {
            ServiceResultType.NotFound => NotFound(result.Message),
            ServiceResultType.Conflict => Conflict(result.Message),
            ServiceResultType.ValidationError => BadRequest(result.Message),
            _ => File(result.Data!.Content, result.Data.ContentType, result.Data.FileName)
        };
    }

    [AllowAnonymous]
    [HttpGet("documents/verify")]
    public async Task<IActionResult> VerifyDocument([FromQuery] string? documentNumber, [FromQuery] string? verificationCode)
    {
        var result = await _service.VerifyDocumentAsync(documentNumber, verificationCode);

        return result.ResultType switch
        {
            ServiceResultType.NotFound => NotFound(result.Message),
            ServiceResultType.ValidationError => BadRequest(result.Message),
            _ => Ok(result.Data)
        };
    }

    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!int.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException("Authenticated user identifier is missing or invalid.");
        }

        return userId;
    }

    private string GetCurrentUserRole()
    {
        var role = User.FindFirstValue(ClaimTypes.Role);

        if (string.IsNullOrWhiteSpace(role))
        {
            throw new UnauthorizedAccessException("Authenticated user role is missing.");
        }

        return role;
    }

    private IActionResult BuildActionResult(ServiceResult result)
    {
        return result.ResultType switch
        {
            ServiceResultType.NotFound => NotFound(result.Message),
            ServiceResultType.Conflict => Conflict(result.Message),
            ServiceResultType.ValidationError => BadRequest(result.Message),
            _ => Ok(result)
        };
    }
}
