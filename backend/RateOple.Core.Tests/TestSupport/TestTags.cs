using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Core.Tests.TestSupport;

public sealed class TestTags
{
    private readonly ApplicationDbContext _context;

    public TestTags(ApplicationDbContext context)
    {
        _context = context;
    }

    public Tag CreateTag(string name = "classic")
    {
        var tag = new Tag { Name = name };
        _context.Tags.Add(tag);
        return tag;
    }

    public async Task<Tag> CreateTagAsync(string name = "classic")
    {
        var tag = CreateTag(name);
        await _context.SaveChangesAsync();
        return tag;
    }
}
