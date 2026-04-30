using System.ComponentModel.DataAnnotations;
using RateOple.Core.Collections.DTOs;
using RateOple.Core.Groups.DTOs;
using RateOple.Core.Moderation.DTOs;

namespace RateOple.Core.Tests.Validation;

public class DtoValidationTests
{
    [Fact]
    public void ReorderCollectionItemsDto_RejectsDuplicateIds()
    {
        var mediaId = Guid.NewGuid();
        var dto = new ReorderCollectionItemsDto { MediaIds = [mediaId, mediaId] };

        var results = Validate(dto);

        Assert.Contains(results, r => r.ErrorMessage!.Contains("duplicates"));
    }

    [Fact]
    public void CreateGroupPostDto_RejectsEmptyMediaId()
    {
        var dto = new CreateGroupPostDto
        {
            Title = "Post",
            Content = "Content",
            MediaIds = [Guid.Empty]
        };

        var results = Validate(dto);

        Assert.Contains(results, r => r.ErrorMessage!.Contains("empty GUID"));
    }

    [Fact]
    public void CreateModeratorAssignmentDto_RequiresScopeIdForNonGlobalScope()
    {
        var dto = new CreateModeratorAssignmentDto
        {
            UserIdentifier = "moderator@example.com",
            ScopeType = Constants.Enums.ModeratorScopeType.Group
        };

        var results = Validate(dto);

        Assert.Contains(results, r => r.ErrorMessage!.Contains("ScopeId is required"));
    }

    private static List<ValidationResult> Validate(object model)
    {
        var results = new List<ValidationResult>();
        Validator.TryValidateObject(model, new ValidationContext(model), results, validateAllProperties: true);
        return results;
    }
}
