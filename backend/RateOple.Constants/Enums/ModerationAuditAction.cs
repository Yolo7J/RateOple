namespace RateOple.Constants.Enums;

public enum ModerationAuditAction
{
    ReportMarkedPending = 1,
    ReportMarkedInReview = 2,
    ReportResolved = 3,
    ReportRejected = 4,
    ModeratorAssigned = 5,
    ModeratorUnassigned = 6,
    GroupUserBanned = 7,
    GroupUserUnbanned = 8,
    GlobalRoleGranted = 9,
    GlobalRoleRevoked = 10,
    ReportEscalatedToAdmin = 11,
    ReportTargetRemoved = 12,
    UserSuspended = 13,
    UserSuspensionLifted = 14
}
