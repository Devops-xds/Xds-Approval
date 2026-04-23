using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
using Xds.Approval.Api.Models;
using Xds.Approval.Api.DTOs.Audit;
using Xds.Approval.Api.DTOs;
using Xds.Approval.Api.DTOs.Common;
using Xds.Approval.Api.DTOs.Pdf;
using Xds.Approval.Api.DTOs.Payment;

public interface IPaymentService
{
    Task<PaymentRequestResponseDto> CreateAsync(CreatePaymentRequestDto dto, int requestedByUserId);
    Task<List<PaymentRequestResponseDto>> GetAllAsync(int currentUserId, string currentUserRole);
    Task<PaymentRequestResponseDto?> GetByIdAsync(int requestId, int currentUserId, string currentUserRole);
    Task<ServiceResult> ApproveAsync(ApprovalDto dto, int approvedByUserId);
    Task<ServiceResult> ProcessFinanceAsync(int requestId, FinanceProcessRequestDto dto, int userId, string userRole);
    Task<ServiceResult<AttachmentResponseDto>> UploadAttachmentAsync(int requestId, IFormFile file, int currentUserId);
    Task<ServiceResult<FileDownloadDto>> GetAttachmentAsync(int requestId, int attachmentId, int currentUserId, string currentUserRole);
    Task<ServiceResult<FileDownloadDto>> GeneratePdfAsync(int requestId, int currentUserId, string currentUserRole);
    Task<ServiceResult<FileDownloadDto>> GetArchivedPdfAsync(int requestId, int currentUserId, string currentUserRole);
    Task<ServiceResult<DocumentVerificationResponseDto>> VerifyDocumentAsync(string? documentNumber, string? verificationCode);
    Task<ServiceResult<List<AuditLogResponseDto>>> GetAuditLogsAsync(int requestId, int currentUserId, string currentUserRole);
    Task<ServiceResult<List<AuditLogResponseDto>>> SearchAuditLogsAsync(AuditLogQueryDto query, int currentUserId, string currentUserRole);
}
