using RateOple.Core.Contracts.DTOs.Media;

namespace RateOple.Core.Contracts;

public interface IOpenLibraryService
{
    Task<List<OlSearchResultDto>> SearchAsync(string query);
    Task<OlDetailsDto?> GetDetailsAsync(string olId);
}