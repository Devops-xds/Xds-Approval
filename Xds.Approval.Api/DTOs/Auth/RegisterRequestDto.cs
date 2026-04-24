using System.ComponentModel.DataAnnotations;

namespace Xds.Approval.Api.DTOs.Auth
{
    public class RegisterRequestDto
    {
        [Required]
        public string FullName { get; set; } = string.Empty;

        [Required]
        public string Department { get; set; } = string.Empty;

        [Required]
        public string Username { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MinLength(6, ErrorMessage = "Please enter 6 characters or more.")]
        public string Password { get; set; } = string.Empty;

        [Required]
        public string Role { get; set; } = string.Empty;
    }
}
