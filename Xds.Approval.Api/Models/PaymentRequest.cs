
namespace Xds.Approval.Api.Models
{

    public class PaymentRequest
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string? Currency { get; set; } = "GHS";
        public DateTime Deadline { get; set; }
        public string? PaymentType { get; set; } = string.Empty;

        public int RequestedBy { get; set; }
        public string Status { get; set; } = "Pending";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public List<Attachment>? Attachments { get; set; }
    }
}
