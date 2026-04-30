using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Core.Tests.TestSupport;

public sealed class TestDataFactory
{
    private readonly ApplicationDbContext _context;

    public TestDataFactory(ApplicationDbContext context)
    {
        _context = context;
        Users = new TestUsers(context);
        Media = new TestMedia(context);
        Groups = new TestGroups(context);
        Collections = new TestCollections(context);
        Moderation = new TestModeration(context);
    }

    public TestUsers Users { get; }
    public TestMedia Media { get; }
    public TestGroups Groups { get; }
    public TestCollections Collections { get; }
    public TestModeration Moderation { get; }

    public async Task SaveAsync()
    {
        await _context.SaveChangesAsync();
    }

    public Rating Rating(Guid userId, Guid mediaId, int value = 8)
    {
        var rating = new Rating
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            MediaId = mediaId,
            Value = value,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Ratings.Add(rating);
        return rating;
    }

    public Comment GroupPostComment(Guid userId, Guid postId, string content = "Test comment")
    {
        var comment = new Comment
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            GroupPostId = postId,
            ParentType = RateOple.Constants.Enums.CommentParentType.GroupPost,
            Content = content,
            CreatedAt = DateTime.UtcNow
        };

        _context.Comments.Add(comment);
        return comment;
    }
}
