using Xds.Approval.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Xds.Approval.Api.Models
{
    public class Approval
    {
        public int Id { get; set; }
        public int PaymentRequestId { get; set; }
        public int ApprovedBy { get; set; }
        public string? Stage { get; set; } = string.Empty;
        public string? Status { get; set; } = string.Empty; // Approved / Rejected
        public string? Comment { get; set; } = string.Empty;
        public DateTime ApprovedAt { get; set; }
    }
}
