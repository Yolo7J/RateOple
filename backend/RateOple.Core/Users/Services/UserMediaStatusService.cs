using Microsoft.EntityFrameworkCore;
using RateOple.Constants.Enums;
using RateOple.Core.Contracts;
using RateOple.Core.Users.DTOs;
using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Entities;
using MediaEntity = RateOple.Infrastructure.Data.Entities.Media;

namespace RateOple.Core.Users.Services;

public class UserMediaStatusService : IUserMediaStatusService
{
    private readonly ApplicationDbContext _context;

    public UserMediaStatusService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<UserMediaStatusDto> SetStatusAsync(Guid userId, Guid mediaId, SetUserMediaStatusDto dto)
    {
        var media = await _context.Media
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == mediaId && !m.IsDeleted)
            ?? throw new KeyNotFoundException("Media not found.");

        var parsedStatus = ParseStatus(dto.Status);

        var status = await _context.UserMediaStatuses
            .FirstOrDefaultAsync(x => x.UserId == userId && x.MediaId == mediaId);

        if (status == null)
        {
            status = new UserMediaStatus
            {
                UserId = userId,
                MediaId = mediaId
            };
            _context.UserMediaStatuses.Add(status);
        }

        status.Status = parsedStatus;
        status.UpdatedAt = DateTime.UtcNow;

        switch (media.Type)
        {
            case MediaType.Book:
                status.ProgressPages = NormalizeProgress(dto.ProgressPages);
                status.ProgressSeason = null;
                status.ProgressEpisode = null;
                break;
            case MediaType.TvSeries:
                status.ProgressPages = null;
                status.ProgressSeason = NormalizeProgress(dto.ProgressSeason);
                status.ProgressEpisode = NormalizeProgress(dto.ProgressEpisode);
                break;
            default:
                status.ProgressPages = null;
                status.ProgressSeason = null;
                status.ProgressEpisode = null;
                break;
        }

        await _context.SaveChangesAsync();
        return Map(status, media);
    }

    public async Task<IReadOnlyList<UserMediaStatusDto>> GetUserStatusesAsync(Guid userId, MediaStatusQueryDto query)
    {
        var page = query.Page <= 0 ? 1 : query.Page;
        var pageSize = query.PageSize <= 0 ? 50 : Math.Min(query.PageSize, 200);

        var q = _context.UserMediaStatuses
            .AsNoTracking()
            .Where(x => x.UserId == userId && !x.Media.IsDeleted)
            .Include(x => x.Media)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Status))
        {
            var parsedStatus = ParseStatus(query.Status);
            q = q.Where(x => x.Status == parsedStatus);
        }

        var statuses = await q
            .OrderByDescending(x => x.UpdatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return statuses.Select(x => Map(x, x.Media)).ToList();
    }

    private static int? NormalizeProgress(int? value)
    {
        if (!value.HasValue) return null;
        return value.Value < 0 ? 0 : value.Value;
    }

    private static MediaProgressStatus ParseStatus(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return MediaProgressStatus.Plan;

        var normalized = value
            .Trim()
            .Replace(" ", string.Empty)
            .Replace("-", string.Empty)
            .Replace("_", string.Empty)
            .ToLowerInvariant();

        return normalized switch
        {
            "plan" => MediaProgressStatus.Plan,
            "onit" => MediaProgressStatus.OnIt,
            "done" => MediaProgressStatus.Done,
            "dropped" => MediaProgressStatus.Dropped,
            _ => throw new ArgumentException("Invalid status.")
        };
    }

    private static UserMediaStatusDto Map(UserMediaStatus status, MediaEntity media) => new()
    {
        MediaId = status.MediaId,
        MediaType = media.Type.ToString(),
        Title = media.Title,
        CoverUrl = media.CoverUrl,
        Status = status.Status switch
        {
            MediaProgressStatus.OnIt => "On it",
            _ => status.Status.ToString()
        },
        ProgressPages = status.ProgressPages,
        ProgressSeason = status.ProgressSeason,
        ProgressEpisode = status.ProgressEpisode,
        UpdatedAt = status.UpdatedAt
    };
}
