namespace Xds.Approval.Api.DTOs.Payment
{
    public class FinanceProcessRequestDto
    {
        public string? CompanyName { get; set; }
        public string? RecipientName { get; set; }
        public string? RecipientAddress { get; set; }
        public string? RecipientTelephone { get; set; }
    }
}
