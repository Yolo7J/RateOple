using RateOple.Constants.Enums;

namespace RateOple.Core.Moderation.DTOs;

public class ModeratorAssignmentUpdateDto
{
    public string Action { get; set; } = "Added";
    public ModeratorAssignmentDto? Assignment { get; set; }
    public Guid UserId { get; set; }
    public ModeratorScopeType ScopeType { get; set; }
    public Guid? ScopeId { get; set; }
}
