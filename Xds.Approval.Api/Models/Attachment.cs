
namespace Xds.Approval.Api.Models
{
    public class Attachment
    {
        public int Id { get; set; }
        public int PaymentRequestId { get; set; }
        public string FileName { get; set; } = string.Empty;
        public string ContentType { get; set; } = string.Empty;
        public string FilePath { get; set; } = string.Empty;
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

        public PaymentRequest? PaymentRequest { get; set; }
    }
}
