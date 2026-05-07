namespace Xds.Approval.Api.DTOs.Payment
{
    public class PaymentRequestResponseDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public decimal VatAmount { get; set; }
        public decimal WhtAmount { get; set; }
        public string Currency { get; set; } = "GHS";
        public DateTime Deadline { get; set; }
        public string PaymentType { get; set; } = string.Empty;
        public int RequestedBy { get; set; }
        public string RequesterId { get; set; } = string.Empty;
        public string RequesterName { get; set; } = string.Empty;
        public string? RequesterDepartment { get; set; }
        public string? CompanyName { get; set; }
        public string? RecipientName { get; set; }
        public string? RecipientAddress { get; set; }
        public string? RecipientTelephone { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string? CeoComment { get; set; }
        public int? ApprovedByUserId { get; set; }
        public string? ApprovedByUserName { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public int? PreparedByUserId { get; set; }
        public string? PreparedByUserName { get; set; }
        public DateTime? PreparedAt { get; set; }
        public int? AuthorizedByUserId { get; set; }
        public string? AuthorizedByUserName { get; set; }
        public DateTime? AuthorizedAt { get; set; }
        public string? DocumentNumber { get; set; }
        public string? VerificationCode { get; set; }
        public List<AttachmentResponseDto> Attachments { get; set; } = [];
    }
}
