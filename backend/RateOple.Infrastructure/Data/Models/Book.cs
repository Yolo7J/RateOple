namespace RateOple.Infrastructure.Data.Models;

public class Book
{
    public Guid MediaId { get; set; }

    public string? Author { get; set; }
    public int? Pages { get; set; }
    public string? Isbn { get; set; }

    public Media Media { get; set; } = null!;
}
