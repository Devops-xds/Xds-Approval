namespace Xds.Approval.Api.DTOs.Audit;

public class AuditLogQueryDto
{
    public int? PaymentRequestId { get; set; }
    public int? UserId { get; set; }
    public string? Action { get; set; }
    public DateTime? FromUtc { get; set; }
    public DateTime? ToUtc { get; set; }
}
