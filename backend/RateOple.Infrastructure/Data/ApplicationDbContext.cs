using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using RateOple.Infrastructure.Data.Models;

namespace RateOple.Infrastructure.Data;

public class ApplicationDbContext : IdentityDbContext<User, IdentityRole<Guid>, Guid>
{
    // Media
    public DbSet<Media> Media { get; set; }
    public DbSet<Movie> Movies { get; set; }
    public DbSet<Book> Books { get; set; }
    public DbSet<TvSeries> TvSeries { get; set; }
    public DbSet<Season> Seasons { get; set; }
    public DbSet<Episode> Episodes { get; set; }

    // Genres
    public DbSet<Genre> Genres { get; set; }
    public DbSet<MediaGenre> MediaGenres { get; set; }

    // User interactions
    public DbSet<Follow> Follows { get; set; }
    public DbSet<Rating> Ratings { get; set; }
    public DbSet<Review> Reviews { get; set; }
    public DbSet<Comment> Comments { get; set; }

    // Groups
    public DbSet<Group> Groups { get; set; }
    public DbSet<GroupMembership> GroupMemberships { get; set; }
    public DbSet<GroupPost> GroupPosts { get; set; }
    public DbSet<GroupMedia> GroupMediaLinks { get; set; }

    // Collections
    public DbSet<Collection> Collections { get; set; }
    public DbSet<CollectionItem> CollectionItems { get; set; }

    // JWT
    public DbSet<RefreshToken> RefreshTokens { get; set; }

    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
    }
}