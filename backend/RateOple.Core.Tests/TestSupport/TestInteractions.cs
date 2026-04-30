using RateOple.Constants.Enums;
using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Entities;
using MediaEntity = RateOple.Infrastructure.Data.Entities.Media;

namespace RateOple.Core.Tests.TestSupport;

public sealed class TestInteractions
{
    private readonly ApplicationDbContext _context;

    public TestInteractions(ApplicationDbContext context)
    {
        _context = context;
    }

    public MediaInteraction CreateInteraction(
        User user,
        MediaEntity media,
        InteractionType interactionType = InteractionType.MediaOpened,
        int points = 1,
        DateTime? createdAt = null)
    {
        var interaction = new MediaInteraction
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            MediaId = media.Id,
            InteractionType = interactionType,
            Points = points,
            CreatedAt = createdAt ?? DateTime.UtcNow
        };

        _context.MediaInteractions.Add(interaction);
        return interaction;
    }

    public MediaInteraction CreateInteraction(
        User user,
        Season season,
        InteractionType interactionType = InteractionType.MediaOpened,
        int points = 1,
        DateTime? createdAt = null)
    {
        var interaction = BaseInteraction(user, interactionType, points, createdAt);
        interaction.SeasonId = season.Id;

        _context.MediaInteractions.Add(interaction);
        return interaction;
    }

    public MediaInteraction CreateInteraction(
        User user,
        Episode episode,
        InteractionType interactionType = InteractionType.MediaOpened,
        int points = 1,
        DateTime? createdAt = null)
    {
        var interaction = BaseInteraction(user, interactionType, points, createdAt);
        interaction.EpisodeId = episode.Id;

        _context.MediaInteractions.Add(interaction);
        return interaction;
    }

    public async Task<MediaInteraction> CreateInteractionAsync(
        User user,
        MediaEntity media,
        InteractionType interactionType = InteractionType.MediaOpened,
        int points = 1,
        DateTime? createdAt = null)
    {
        var interaction = CreateInteraction(user, media, interactionType, points, createdAt);
        await _context.SaveChangesAsync();
        return interaction;
    }

    public Task<MediaInteraction> CreateMediaInteractionAsync(
        User user,
        MediaEntity media,
        InteractionType interactionType = InteractionType.MediaOpened,
        int points = 1,
        DateTime? createdAt = null) =>
        CreateInteractionAsync(user, media, interactionType, points, createdAt);

    public async Task<MediaInteraction> CreateSeasonInteractionAsync(
        User user,
        Season season,
        InteractionType interactionType = InteractionType.MediaOpened,
        int points = 1,
        DateTime? createdAt = null)
    {
        var interaction = CreateInteraction(user, season, interactionType, points, createdAt);
        await _context.SaveChangesAsync();
        return interaction;
    }

    public async Task<MediaInteraction> CreateEpisodeInteractionAsync(
        User user,
        Episode episode,
        InteractionType interactionType = InteractionType.MediaOpened,
        int points = 1,
        DateTime? createdAt = null)
    {
        var interaction = CreateInteraction(user, episode, interactionType, points, createdAt);
        await _context.SaveChangesAsync();
        return interaction;
    }

    private static MediaInteraction BaseInteraction(
        User user,
        InteractionType interactionType,
        int points,
        DateTime? createdAt) => new()
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            InteractionType = interactionType,
            Points = points,
            CreatedAt = createdAt ?? DateTime.UtcNow
        };
}
