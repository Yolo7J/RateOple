using System.Text.Json;
using RateOple.Core.Contracts;
using RateOple.Core.Media.DTOs;

namespace RateOple.Core.Media.Services;

public class OpenLibraryService : IOpenLibraryService
{
    private readonly HttpClient _http;
    private const string BaseUrl = "https://openlibrary.org";
    private const string CoverBase = "https://covers.openlibrary.org/b/id";

    public OpenLibraryService(HttpClient http)
    {
        _http = http;
        _http.DefaultRequestHeaders.Add("User-Agent", "RateOple/1.0 (contact@rateople.com)");
    }

    // GET /search.json?q=...&fields=key,title,author_name,first_publish_year,cover_i,description&limit=8
    public async Task<List<OlSearchResultDto>> SearchAsync(string query)
    {
        var url = $"{BaseUrl}/search.json?q={Uri.EscapeDataString(query)}" +
                  "&fields=key,title,author_name,first_publish_year,cover_i,description&limit=8";

        var response = await _http.GetAsync(url);
        response.EnsureSuccessStatusCode();

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

        if (!doc.RootElement.TryGetProperty("docs", out var docs))
            return [];

        return docs.EnumerateArray()
            .Take(8)
            .Select(item =>
            {
                var olId = item.TryGetProperty("key", out var k) ? k.GetString() : null;

                // cover_i is the numeric cover ID
                string? coverUrl = null;
                if (item.TryGetProperty("cover_i", out var cov) && cov.ValueKind == JsonValueKind.Number)
                    coverUrl = $"{CoverBase}/{cov.GetInt32()}-L.jpg";

                int? year = null;
                if (item.TryGetProperty("first_publish_year", out var fpy) &&
                    fpy.ValueKind == JsonValueKind.Number)
                    year = fpy.GetInt32();

                string? author = null;
                if (item.TryGetProperty("author_name", out var authors) &&
                    authors.ValueKind == JsonValueKind.Array)
                    author = authors.EnumerateArray().FirstOrDefault().GetString();

                string? description = null;
                if (item.TryGetProperty("description", out var desc))
                    description = desc.ValueKind == JsonValueKind.String
                        ? desc.GetString()
                        : desc.TryGetProperty("value", out var dv) ? dv.GetString() : null;

                return new OlSearchResultDto
                {
                    OlId = olId ?? string.Empty,
                    Title = item.TryGetProperty("title", out var t) ? t.GetString()! : "Unknown",
                    ReleaseYear = year,
                    CoverUrl = coverUrl,
                    Description = description,
                    Author = author,
                };
            })
            .Where(r => !string.IsNullOrEmpty(r.OlId))
            .ToList();
    }

    // GET /works/{olId}.json  — olId may arrive as "/works/OL45804W" or just "OL45804W"
    public async Task<OlDetailsDto?> GetDetailsAsync(string olId)
    {
        // Normalise: strip leading slash, ensure "works/" prefix
        olId = olId.TrimStart('/');
        if (!olId.StartsWith("works/"))
            olId = $"works/{olId}";

        var url = $"{BaseUrl}/{olId}.json";
        var response = await _http.GetAsync(url);
        if (!response.IsSuccessStatusCode) return null;

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var root = doc.RootElement;

        // Description can be a string or { "type": "...", "value": "..." }
        string? description = null;
        if (root.TryGetProperty("description", out var desc))
            description = desc.ValueKind == JsonValueKind.String
                ? desc.GetString()
                : desc.TryGetProperty("value", out var dv) ? dv.GetString() : null;

        // Cover: use first entry in covers[] array (numeric ID)
        string? coverUrl = null;
        if (root.TryGetProperty("covers", out var covers) &&
            covers.ValueKind == JsonValueKind.Array)
        {
            var firstCover = covers.EnumerateArray()
                .FirstOrDefault(c => c.ValueKind == JsonValueKind.Number && c.GetInt32() > 0);
            if (firstCover.ValueKind == JsonValueKind.Number)
                coverUrl = $"{CoverBase}/{firstCover.GetInt32()}-L.jpg";
        }

        // Subjects → genres
        var genres = new List<string>();
        if (root.TryGetProperty("subjects", out var subjects) &&
            subjects.ValueKind == JsonValueKind.Array)
            genres = subjects.EnumerateArray()
                .Take(5)
                .Select(s => s.GetString())
                .Where(s => s != null)
                .Select(s => s!)
                .ToList();

        // Release year from first_publish_date (string like "1937" or "April 1937")
        int? year = null;
        if (root.TryGetProperty("first_publish_date", out var fpd))
        {
            var raw = fpd.GetString() ?? "";
            var yearToken = raw.Split(' ', StringSplitOptions.RemoveEmptyEntries)
                .FirstOrDefault(p => p.Length == 4 && int.TryParse(p, out _));
            if (yearToken != null) year = int.Parse(yearToken);
        }

        // Authors: the works endpoint returns { "authors": [ { "author": { "key": "/authors/OLxxx" } } ] }
        // We'd need a second call to get the name — skip for now, caller can fill from search result
        var key = root.TryGetProperty("key", out var k) ? k.GetString() ?? olId : olId;

        return new OlDetailsDto
        {
            OlId = key,
            Title = root.TryGetProperty("title", out var title) ? title.GetString()! : "Unknown",
            ReleaseYear = year,
            CoverUrl = coverUrl,
            Description = description,
            Genres = genres,
            // Author, Isbn, Pages — not available from /works endpoint alone;
            // frontend should carry these over from the search result it already has.
        };
    }
}
