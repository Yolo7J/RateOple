using Microsoft.EntityFrameworkCore;
using RateOple.Core.Contracts;
using RateOple.Core.Contracts.DTOs;
using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Models;

namespace RateOple.Core.Services;

public class RatingService : IRatingService
{
    private readonly ApplicationDbContext _context;

    public RatingService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<RatingDto> RateMediaAsync(Guid userId, Guid mediaId, int value)
    {
        if (value < 1 || value > 10)
        {
            throw new ArgumentOutOfRangeException(nameof(value), "Rating must be between 1 and 10.");
        }

        var existingRating = await _context.Ratings
            .FirstOrDefaultAsync(r => r.UserId == userId && r.MediaId == mediaId);

        if (existingRating != null)
        {
            existingRating.Value = value;
            // Ideally we'd have UpdatedAt
        }
        else
        {
            existingRating = new Rating
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                MediaId = mediaId,
                Value = value,
                CreatedAt = DateTime.UtcNow
            };
            _context.Ratings.Add(existingRating);
        }

        // Update Aggregates on Media
        // We need to fetch all ratings to calculate accurate average, or simpler:
        // Since we haven't saved yet, the new rating is in the tracker but not in DB for SQL AVG calculation if we use SQL.
        // Let's save the rating first to ensure consistency for aggregation query.
        await _context.SaveChangesAsync();

        // Now calculate aggregates
        // Note: For high scale, this should be eventually consistent or done via stored proc/trigger, 
        // but for v1 this is fine.
        var ratings = await _context.Ratings
            .Where(r => r.MediaId == mediaId)
            .Select(r => r.Value)
            .ToListAsync();

        var count = ratings.Count;
        var average = count > 0 ? ratings.Average() : 0;

        // Update Media entity
        // We verify media exists implicitly because of FK, but let's fetch to update
        var media = await _context.Media.FindAsync(mediaId);
        if (media != null)
        {
            media.RatingsCount = count;
            media.AverageRating = average;
            await _context.SaveChangesAsync();
        }

        return MapToDto(existingRating);
    }

    public async Task DeleteRatingAsync(Guid userId, Guid mediaId)
    {
        var rating = await _context.Ratings
            .FirstOrDefaultAsync(r => r.UserId == userId && r.MediaId == mediaId);

        if (rating == null) return;

        _context.Ratings.Remove(rating);
        await _context.SaveChangesAsync();

        // Update Aggregates
        var ratings = await _context.Ratings
            .Where(r => r.MediaId == mediaId)
            .Select(r => r.Value)
            .ToListAsync();

        var count = ratings.Count;
        var average = count > 0 ? ratings.Average() : 0;

        var media = await _context.Media.FindAsync(mediaId);
        if (media != null)
        {
            media.RatingsCount = count;
            media.AverageRating = average;
            await _context.SaveChangesAsync();
        }
    }

    public async Task<MediaRatingSummaryDto> GetMediaRatingSummaryAsync(Guid mediaId, Guid? userId = null)
    {
        // We can read aggregates directly from Media table now!
        var media = await _context.Media
            .AsNoTracking()
            .Select(m => new { m.AverageRating, m.RatingsCount })
            .FirstOrDefaultAsync(); // Wait, we need to filter by ID

        // Correct query
        var mediaStats = await _context.Media
            .Where(m => m.Id == mediaId)
            .Select(m => new { m.AverageRating, m.RatingsCount })
            .FirstOrDefaultAsync();

        if (mediaStats == null) return new MediaRatingSummaryDto { MediaId = mediaId };

        int? userRating = null;
        if (userId.HasValue)
        {
            var rating = await _context.Ratings
                .AsNoTracking()
                .Where(r => r.MediaId == mediaId && r.UserId == userId.Value)
                .Select(r => r.Value)
                .FirstOrDefaultAsync();
            
            if (rating != 0) userRating = rating; // Assuming database returns 0 for not found int? No, FirstOrDefaultAsync on int returns 0.
            
            // To be safe with int vs int?
            var ratingEntity = await _context.Ratings
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.MediaId == mediaId && r.UserId == userId.Value);
            userRating = ratingEntity?.Value;
        }

        return new MediaRatingSummaryDto
        {
            MediaId = mediaId,
            AverageRating = mediaStats.AverageRating,
            RatingsCount = mediaStats.RatingsCount,
            UserRating = userRating
        };
    }

    public async Task<IEnumerable<RatingDto>> GetUserRatingsAsync(Guid userId)
    {
        var ratings = await _context.Ratings
            .AsNoTracking()
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        return ratings.Select(MapToDto);
    }

    private static RatingDto MapToDto(Rating rating)
    {
        return new RatingDto
        {
            Id = rating.Id,
            Value = rating.Value,
            UserId = rating.UserId,
            MediaId = rating.MediaId,
            CreatedAt = rating.CreatedAt
        };
    }
}
