using RateOple.Core.Common;

namespace RateOple.Core.Tests.Validation;

public class PaginationTests
{
    [Theory]
    [InlineData(-1, -1, 1, 20)]
    [InlineData(0, 0, 1, 20)]
    [InlineData(2, 500, 2, 100)]
    [InlineData(3, 25, 3, 25)]
    public void Normalize_ReturnsBoundedValues(int page, int pageSize, int expectedPage, int expectedPageSize)
    {
        var normalized = Pagination.Normalize(page, pageSize);

        Assert.Equal(expectedPage, normalized.Page);
        Assert.Equal(expectedPageSize, normalized.PageSize);
    }
}
