namespace Xds.Approval.Api.DTOs.Pdf
{
    public class DocumentVerificationResponseDto
    {
        public bool IsValid { get; set; }
        public int RequestId { get; set; }
        public string PaymentRequestTitle { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string DocumentNumber { get; set; } = string.Empty;
        public string VerificationCode { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime VerifiedAt { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}
