using Microsoft.EntityFrameworkCore;
using RateOple.Core.Contracts;
using RateOple.Core.DTOs;
using RateOple.Infrastructure.Data;

namespace RateOple.Core.Services;

public class MediaService : IMediaService
{
    private readonly ApplicationDbContext _context;

    public MediaService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<MediaListDto>> GetAllAsync()
    {
        return await _context.Media
            .AsNoTracking()
            .Select(m => new MediaListDto
            {
                Id = m.Id,
                Title = m.Title,
                Type = m.Type,
                ReleaseDate = m.ReleaseDate
            })
            .ToListAsync();
    }

    public async Task<MediaDetailsDto?> GetByIdAsync(Guid id)
    {
        return await _context.Media
            .AsNoTracking()
            .Where(m => m.Id == id)
            .Select(m => new MediaDetailsDto
            {
                Id = m.Id,
                Title = m.Title,
                Type = m.Type,
                Description = m.Description,
                ReleaseDate = m.ReleaseDate,

                Duration = m.Movie != null ? m.Movie.Duration : null,
                Director = m.Movie != null ? m.Movie.Director : null,

                Author = m.Book != null ? m.Book.Author : null,
                Pages = m.Book != null ? m.Book.Pages : null,

                SeasonsCount = m.TvSeries != null ? m.TvSeries.SeasonsCount : null
            })
            .FirstOrDefaultAsync();
    }
}
