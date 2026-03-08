using System.ComponentModel.DataAnnotations;

namespace RateOple.Core.Social.DTOs;

public class RatingUpsertDto
{
    [Range(1, 10)]
    public int Value { get; set; }
}
