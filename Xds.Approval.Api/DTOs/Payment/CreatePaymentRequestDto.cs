using System.ComponentModel.DataAnnotations;

namespace Xds.Approval.Api.DTOs.Payment
{
    public class CreatePaymentRequestDto
    {
        [Required]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Description { get; set; } = string.Empty;

        [Range(0.01, double.MaxValue, ErrorMessage = "Amount must be greater than zero.")]
        public decimal Amount { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "VAT amount cannot be negative.")]
        public decimal VatAmount { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "WHT amount cannot be negative.")]
        public decimal WhtAmount { get; set; }

        [Required]
        public string Currency { get; set; } = "GHS";

        [Required]
        public DateTime Deadline { get; set; }

        [Required]
        public string PaymentType { get; set; } = string.Empty;
    }
}
