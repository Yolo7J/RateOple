using System.ComponentModel.DataAnnotations;

namespace RateOple.Core.Media.DTOs;

public class TagDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

public class UpsertMediaTagsDto
{
    [MaxLength(25)]
    public List<string> TagNames { get; set; } = [];
}
