using System.ComponentModel.DataAnnotations;

namespace RateOple.Core.Validation;

[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class NotEmptyGuidAttribute : ValidationAttribute
{
    public NotEmptyGuidAttribute()
        : base("The {0} field must not be an empty GUID.")
    {
    }

    public override bool IsValid(object? value)
    {
        return value switch
        {
            null => true,
            Guid guid => guid != Guid.Empty,
            _ => false
        };
    }
}
