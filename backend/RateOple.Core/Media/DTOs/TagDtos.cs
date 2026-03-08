namespace RateOple.Core.Media.DTOs;

public class TagDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

public class UpsertMediaTagsDto
{
    public List<string> TagNames { get; set; } = [];
}
