using System.ComponentModel.DataAnnotations;
using RateOple.Constants.Enums;

namespace RateOple.Core.Users.DTOs;

public class CreateSuspensionAppealDto
{
    [Required]
    [MinLength(20)]
    [MaxLength(2000)]
    public string Text { get; set; } = string.Empty;
}

public class ResolveSuspensionAppealDto
{
    [Required]
    [EnumDataType(typeof(SuspensionAppealStatus))]
    public SuspensionAppealStatus Status { get; set; }

    [MaxLength(1000)]
    public string? ResolutionNote { get; set; }
}

public class SuspensionAppealDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Text { get; set; } = string.Empty;
    public SuspensionAppealStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public Guid? ResolvedByUserId { get; set; }
    public string? ResolutionNote { get; set; }
}
