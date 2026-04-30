using RateOple.Core.Contracts;
using RateOple.Core.Media.DTOs;

namespace RateOple.Core.Tests.TestSupport;

public sealed class NoopOpenLibraryService : IOpenLibraryService
{
    public Task<List<OlSearchResultDto>> SearchAsync(string query) => Task.FromResult(new List<OlSearchResultDto>());

    public Task<OlDetailsDto?> GetDetailsAsync(string olId) => Task.FromResult<OlDetailsDto?>(null);
}
