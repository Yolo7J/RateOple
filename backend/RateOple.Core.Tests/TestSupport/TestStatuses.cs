using RateOple.Constants.Enums;
using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Entities;
using MediaEntity = RateOple.Infrastructure.Data.Entities.Media;

namespace RateOple.Core.Tests.TestSupport;

public sealed class TestStatuses
{
    private readonly ApplicationDbContext _context;

    public TestStatuses(ApplicationDbContext context)
    {
        _context = context;
    }

    public UserMediaStatus MediaStatus(
        User user,
        MediaEntity media,
        MediaProgressStatus status = MediaProgressStatus.Plan,
        int? progressPages = null,
        int? progressSeason = null,
        int? progressEpisode = null,
        DateTime? updatedAt = null)
    {
        var mediaStatus = new UserMediaStatus
        {
            UserId = user.Id,
            MediaId = media.Id,
            Status = status,
            ProgressPages = progressPages,
            ProgressSeason = progressSeason,
            ProgressEpisode = progressEpisode,
            UpdatedAt = updatedAt ?? DateTime.UtcNow
        };

        _context.UserMediaStatuses.Add(mediaStatus);
        return mediaStatus;
    }

    public async Task<UserMediaStatus> CreateMediaStatusAsync(
        User user,
        MediaEntity media,
        MediaProgressStatus status = MediaProgressStatus.Plan,
        int? progressPages = null,
        int? progressSeason = null,
        int? progressEpisode = null,
        DateTime? updatedAt = null)
    {
        var mediaStatus = MediaStatus(user, media, status, progressPages, progressSeason, progressEpisode, updatedAt);
        await _context.SaveChangesAsync();
        return mediaStatus;
    }
}
