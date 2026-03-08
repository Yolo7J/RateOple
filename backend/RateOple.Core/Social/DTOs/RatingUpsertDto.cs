using System.ComponentModel.DataAnnotations;

namespace RateOple.Core.Contracts.DTOs;

public class RatingUpsertDto
{
    [Range(1, 10)]
    public int Value { get; set; }
}
