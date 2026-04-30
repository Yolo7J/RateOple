using System.ComponentModel.DataAnnotations;

namespace RateOple.Core.Auth.DTOs;

public class RegisterDto
{
    [Required]
    [MinLength(3)]
    [MaxLength(30)]
    public string Username { get; set; } = null!;

    [Required]
    [EmailAddress]
    [MaxLength(256)]
    public string Email { get; set; } = null!;

    [Required]
    [MinLength(8)]
    [MaxLength(128)]
    public string Password { get; set; } = null!;
}
