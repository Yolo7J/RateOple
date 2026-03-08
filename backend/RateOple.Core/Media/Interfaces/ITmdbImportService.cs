using System;
using System.Threading.Tasks;

namespace RateOple.Core.Contracts
{
    public interface ITmdbImportService
    {
        Task<Guid> ImportSeriesAsync(int tmdbId);
    }
}
