using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using RateOple.Core.Contracts;
using RateOple.Core.Contracts.DTOs.Media;

namespace RateOple.Infrastructure.Services;

public class TmdbService : ITmdbService
{
    private readonly HttpClient _http;
    private const string BaseUrl = "https://api.themoviedb.org/3";
    private const string ImageBase = "https://image.tmdb.org/t/p/w500";

    public TmdbService(HttpClient http, IConfiguration config)
    {
        _http = http;
        var token = config["Tmdb:ReadAccessToken"]
            ?? throw new InvalidOperationException("Tmdb:ReadAccessToken is not configured.");

        _http.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);
        _http.DefaultRequestHeaders.Accept.Add(
            new MediaTypeWithQualityHeaderValue("application/json"));
    }

    public async Task<List<TmdbSearchResultDto>> SearchAsync(string query, string type)
    {
        // type should be "movie" or "tv"
        var endpoint = type == "tv" ? "search/tv" : "search/movie";
        var url = $"{BaseUrl}/{endpoint}?query={Uri.EscapeDataString(query)}&page=1";

        var response = await _http.GetAsync(url);
        response.EnsureSuccessStatusCode();

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var results = doc.RootElement.GetProperty("results");

        return results.EnumerateArray()
            .Take(8)
            .Select(item =>
            {
                var titleProp = type == "tv" ? "name" : "title";
                var dateProp = type == "tv" ? "first_air_date" : "release_date";

                var dateStr = item.TryGetProperty(dateProp, out var d) ? d.GetString() : null;
                int? year = null;
                if (dateStr != null && dateStr.Length >= 4 && int.TryParse(dateStr[..4], out var y))
                    year = y;

                var poster = item.TryGetProperty("poster_path", out var p) ? p.GetString() : null;

                return new TmdbSearchResultDto
                {
                    TmdbId = item.GetProperty("id").GetInt32(),
                    Title = item.TryGetProperty(titleProp, out var t) ? t.GetString()! : "Unknown",
                    ReleaseYear = year,
                    CoverUrl = poster != null ? $"{ImageBase}{poster}" : null,
                    Description = item.TryGetProperty("overview", out var o) ? o.GetString() : null,
                };
            })
            .ToList();
    }

    public async Task<TmdbDetailsDto?> GetDetailsAsync(int tmdbId, string type)
    {
        var endpoint = type == "tv" ? $"tv/{tmdbId}" : $"movie/{tmdbId}";
        var url = $"{BaseUrl}/{endpoint}?append_to_response=credits";

        var response = await _http.GetAsync(url);
        if (!response.IsSuccessStatusCode) return null;

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var root = doc.RootElement;

        var titleProp = type == "tv" ? "name" : "title";
        var dateProp = type == "tv" ? "first_air_date" : "release_date";

        var dateStr = root.TryGetProperty(dateProp, out var d) ? d.GetString() : null;
        int? year = null;
        if (dateStr != null && dateStr.Length >= 4 && int.TryParse(dateStr[..4], out var y))
            year = y;

        var poster = root.TryGetProperty("poster_path", out var p) ? p.GetString() : null;

        var genres = root.TryGetProperty("genres", out var g)
            ? g.EnumerateArray().Select(x => x.GetProperty("name").GetString()!).ToList()
            : new List<string>();

        // Director from credits (movies only)
        string? director = null;
        int? duration = null;
        if (type == "movie")
        {
            if (root.TryGetProperty("credits", out var credits) &&
                credits.TryGetProperty("crew", out var crew))
            {
                director = crew.EnumerateArray()
                    .FirstOrDefault(x =>
                        x.TryGetProperty("job", out var job) &&
                        job.GetString() == "Director")
                    .TryGetProperty("name", out var name) ? name.GetString() : null;
            }

            if (root.TryGetProperty("runtime", out var rt))
                duration = rt.GetInt32();
        }

        return new TmdbDetailsDto
        {
            TmdbId = tmdbId,
            Title = root.TryGetProperty(titleProp, out var t) ? t.GetString()! : "Unknown",
            ReleaseYear = year,
            CoverUrl = poster != null ? $"{ImageBase}{poster}" : null,
            Description = root.TryGetProperty("overview", out var o) ? o.GetString() : null,
            Genres = genres,
            Director = director,
            Duration = duration,
        };
    }
}