namespace Xds.Approval.Api.DTOs.Audit;

public class AuditLogResponseDto
{
    public int Id { get; set; }
    public int PaymentRequestId { get; set; }
    public int UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Details { get; set; } = string.Empty;
    public string Entity { get; set; } = string.Empty;
    public int EntityId { get; set; }
    public DateTime CreatedAt { get; set; }
}
