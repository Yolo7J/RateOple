namespace RateOple.Core.Common;

public readonly record struct Pagination(int Page, int PageSize)
{
    public const int DefaultPage = 1;
    public const int DefaultPageSize = 20;
    public const int MaxPageSize = 100;

    public static Pagination Normalize(
        int page,
        int pageSize,
        int defaultPageSize = DefaultPageSize,
        int maxPageSize = MaxPageSize)
    {
        var normalizedMax = Math.Max(1, maxPageSize);
        var normalizedDefault = Math.Clamp(defaultPageSize, 1, normalizedMax);

        return new Pagination(
            page < 1 ? DefaultPage : page,
            pageSize < 1 ? normalizedDefault : Math.Min(pageSize, normalizedMax));
    }
}
