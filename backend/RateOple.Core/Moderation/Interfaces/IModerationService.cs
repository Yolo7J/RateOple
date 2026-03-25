using RateOple.Constants.Enums;
using RateOple.Core.Moderation.DTOs;

namespace RateOple.Core.Contracts;

public interface IModerationService
{
    Task<ReportDto> CreateReportAsync(Guid reporterId, CreateReportDto dto);
    Task<PagedReportsDto> GetReportsAsync(ReportQueryDto query);
    Task<ReportDto> UpdateReportStatusAsync(Guid reviewerId, Guid reportId, UpdateReportStatusDto dto);

    Task<ModeratorAssignmentDto> AssignModeratorAsync(Guid assignedById, CreateModeratorAssignmentDto dto);
    Task<IReadOnlyList<ModeratorAssignmentDto>> GetAssignmentsAsync(ModeratorScopeType? scopeType, Guid? scopeId);
    Task RemoveAssignmentAsync(Guid actorId, Guid userId, ModeratorScopeType scopeType, Guid? scopeId);
}
