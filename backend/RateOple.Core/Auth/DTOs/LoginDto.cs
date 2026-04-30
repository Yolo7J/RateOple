using System.ComponentModel.DataAnnotations;

namespace RateOple.Core.Auth.DTOs
{
    public class LoginDto
    {
        [Required]
        [EmailAddress]
        [MaxLength(256)]
        public string Email { get; set; } = null!;

        [Required]
        [MinLength(8)]
        [MaxLength(128)]
        public string Password { get; set; } = null!;
    }
}
