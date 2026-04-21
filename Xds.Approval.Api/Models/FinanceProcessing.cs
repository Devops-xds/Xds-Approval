using Xds.Approval.Api.Models;
using Microsoft.EntityFrameworkCore;


namespace Xds.Approval.Api.Models
{
    public class FinanceProcessing
    {
        public int Id { get; set; }
        public int PaymentRequestId { get; set; }
        public int PreparedBy { get; set; }
        public DateTime PreparedAt { get; set; }
        public int? AuthorizedBy { get; set; }
        public DateTime? AuthorizedAt { get; set; }
        public string? CompanyName { get; set; } = string.Empty;
        public string? RecipientName { get; set; } = string.Empty;
        public string? RecipientAddress { get; set; } = string.Empty;
        public string? RecipientTelephone { get; set; } = string.Empty;
        public string? Status { get; set; } = string.Empty;
    }
}
