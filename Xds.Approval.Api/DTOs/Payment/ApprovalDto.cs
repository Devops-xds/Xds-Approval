using Xds.Approval.Api.Models;
using System.ComponentModel.DataAnnotations;

namespace Xds.Approval.Api.DTOs.Payment
{
    public class ApprovalDto
    {
        public int PaymentRequestId { get; set; }

        [Required]
        [RegularExpression("Approved|Rejected", ErrorMessage = "Status must be Approved or Rejected")]
        public string Status { get; set; } = "Approved";
        public string Comment { get; set; } = string.Empty;
    }
}
