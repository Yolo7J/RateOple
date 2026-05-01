using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RateOple.Constants.Constants;
using RateOple.Constants.Enums;
using RateOple.Core.Common;
using RateOple.Extensions;
using RateOple.Infrastructure.Data;

namespace RateOple.Controllers;

[ApiController]
[Route("api")]
public class LookupController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public LookupController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("media/lookup")]
    public async Task<ActionResult<PagedLookupDto<MediaLookupItemDto>>> LookupMedia(
        [FromQuery] string? search,
        [FromQuery] MediaType? type,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var pagination = Pagination.Normalize(page, pageSize);
        var normalizedSearch = Normalize(search);

        var query = _context.Media
            .AsNoTracking()
            .Where(m => !m.IsDeleted);

        if (type.HasValue)
            query = query.Where(m => m.Type == type.Value);

        if (normalizedSearch.Length > 0)
            query = query.Where(m => m.Title.Contains(normalizedSearch));

        var total = await query.CountAsync();
        var items = await query
            .OrderBy(m => m.Title)
            .ThenBy(m => m.Id)
            .Skip((pagination.Page - 1) * pagination.PageSize)
            .Take(pagination.PageSize)
            .Select(m => new
            {
                m.Id,
                m.Title,
                m.Type,
                m.CoverUrl,
                m.ReleaseDate,
                m.AverageRating,
                m.RatingsCount
            })
            .ToListAsync();

        return Ok(new PagedLookupDto<MediaLookupItemDto>
        {
            Items = items.Select(m => new MediaLookupItemDto
            {
                Id = m.Id,
                Title = m.Title,
                Type = m.Type.ToString(),
                CoverUrl = m.CoverUrl,
                ReleaseYear = m.ReleaseDate?.Year,
                Subtitle = m.ReleaseDate.HasValue ? $"{m.Type} · {m.ReleaseDate.Value.Year}" : m.Type.ToString(),
                AverageRating = m.AverageRating,
                RatingsCount = m.RatingsCount
            }).ToList(),
            TotalCount = total,
            Page = pagination.Page,
            PageSize = pagination.PageSize
        });
    }

    [HttpGet("users/lookup")]
    public async Task<ActionResult<PagedLookupDto<UserLookupItemDto>>> LookupUsers(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var pagination = Pagination.Normalize(page, pageSize);
        var normalizedSearch = Normalize(search);

        var query = _context.Users
            .AsNoTracking()
            .Where(u => u.Visibility == UserVisibility.Public);

        if (normalizedSearch.Length > 0)
        {
            query = query.Where(u =>
                (u.UserName != null && u.UserName.Contains(normalizedSearch)) ||
                (u.Profile != null && u.Profile.DisplayName.Contains(normalizedSearch)));
        }

        return Ok(await ProjectUsersAsync(query, pagination));
    }

    [HttpGet("admin/users/lookup")]
    [Authorize(Policy = PolicyConstants.RequireModerator)]
    public async Task<ActionResult<PagedLookupDto<UserLookupItemDto>>> LookupUsersForModeration(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var pagination = Pagination.Normalize(page, pageSize);
        var normalizedSearch = Normalize(search);

        var query = _context.Users.AsNoTracking();

        if (normalizedSearch.Length > 0)
        {
            query = query.Where(u =>
                (u.UserName != null && u.UserName.Contains(normalizedSearch)) ||
                (u.Email != null && u.Email.Contains(normalizedSearch)) ||
                (u.Profile != null && u.Profile.DisplayName.Contains(normalizedSearch)));
        }

        return Ok(await ProjectUsersAsync(query, pagination));
    }

    [HttpGet("groups/lookup")]
    public async Task<ActionResult<PagedLookupDto<GroupLookupItemDto>>> LookupGroups(
        [FromQuery] string? search,
        [FromQuery] GroupVisibility? visibility,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var pagination = Pagination.Normalize(page, pageSize);
        var normalizedSearch = Normalize(search);
        var userId = User.GetUserIdOrNull();

        var query = _context.Groups
            .AsNoTracking()
            .Where(g =>
                g.Visibility == GroupVisibility.Public ||
                (userId.HasValue && g.Members.Any(m => m.UserId == userId.Value)));

        if (visibility.HasValue)
            query = query.Where(g => g.Visibility == visibility.Value);

        if (normalizedSearch.Length > 0)
            query = query.Where(g => g.Name.Contains(normalizedSearch) || (g.Description != null && g.Description.Contains(normalizedSearch)));

        var total = await query.CountAsync();
        var items = await query
            .OrderBy(g => g.Name)
            .ThenBy(g => g.Id)
            .Skip((pagination.Page - 1) * pagination.PageSize)
            .Take(pagination.PageSize)
            .Select(g => new GroupLookupItemDto
            {
                Id = g.Id,
                Name = g.Name,
                Visibility = g.Visibility.ToString(),
                AvatarUrl = null,
                Subtitle = g.Visibility + " group"
            })
            .ToListAsync();

        return Ok(new PagedLookupDto<GroupLookupItemDto>
        {
            Items = items,
            TotalCount = total,
            Page = pagination.Page,
            PageSize = pagination.PageSize
        });
    }

    [HttpGet("collections/lookup")]
    public async Task<ActionResult<PagedLookupDto<CollectionLookupItemDto>>> LookupCollections(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var pagination = Pagination.Normalize(page, pageSize);
        var normalizedSearch = Normalize(search);
        var userId = User.GetUserIdOrNull();

        var query = _context.Collections
            .AsNoTracking()
            .Where(c =>
                c.Visibility == CollectionVisibility.Public ||
                (userId.HasValue && c.OwnerId == userId.Value) ||
                (userId.HasValue && c.Followers.Any(f => f.UserId == userId.Value)));

        if (normalizedSearch.Length > 0)
            query = query.Where(c => c.Name.Contains(normalizedSearch) || (c.Description != null && c.Description.Contains(normalizedSearch)));

        var total = await query.CountAsync();
        var items = await query
            .OrderBy(c => c.Name)
            .ThenBy(c => c.Id)
            .Skip((pagination.Page - 1) * pagination.PageSize)
            .Take(pagination.PageSize)
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.Visibility,
                c.CoverImageUrl,
                OwnerDisplayName = c.Owner != null
                    ? c.Owner.Profile != null ? c.Owner.Profile.DisplayName : c.Owner.UserName
                    : null
            })
            .ToListAsync();

        return Ok(new PagedLookupDto<CollectionLookupItemDto>
        {
            Items = items.Select(c => new CollectionLookupItemDto
            {
                Id = c.Id,
                Name = c.Name,
                OwnerDisplayName = c.OwnerDisplayName ?? "Unknown owner",
                Visibility = c.Visibility.ToString(),
                ImageUrl = c.CoverImageUrl,
                Subtitle = c.OwnerDisplayName == null ? c.Visibility.ToString() : $"{c.Visibility} collection by {c.OwnerDisplayName}"
            }).ToList(),
            TotalCount = total,
            Page = pagination.Page,
            PageSize = pagination.PageSize
        });
    }

    [HttpGet("moderation/scopes/lookup")]
    [Authorize(Policy = PolicyConstants.RequireAdmin)]
    public async Task<ActionResult<PagedLookupDto<ScopeLookupItemDto>>> LookupModerationScopes(
        [FromQuery] ModeratorScopeType scopeType,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var pagination = Pagination.Normalize(page, pageSize);
        var normalizedSearch = Normalize(search);

        if (scopeType == ModeratorScopeType.Global)
        {
            return Ok(new PagedLookupDto<ScopeLookupItemDto>
            {
                Items =
                [
                    new ScopeLookupItemDto
                    {
                        Id = Guid.Empty,
                        Type = ModeratorScopeType.Global,
                        Label = "Global",
                        Subtitle = "All moderation scopes"
                    }
                ],
                TotalCount = 1,
                Page = pagination.Page,
                PageSize = pagination.PageSize
            });
        }

        if (scopeType == ModeratorScopeType.Group)
            return Ok(await LookupGroupScopesAsync(normalizedSearch, pagination));

        if (scopeType == ModeratorScopeType.Collection)
            return Ok(await LookupCollectionScopesAsync(normalizedSearch, pagination));

        if (scopeType == ModeratorScopeType.Media)
            return Ok(await LookupMediaScopesAsync(normalizedSearch, pagination));

        return BadRequest("Unsupported scope type.");
    }

    private async Task<PagedLookupDto<UserLookupItemDto>> ProjectUsersAsync(IQueryable<Infrastructure.Data.Entities.User> query, Pagination pagination)
    {
        var total = await query.CountAsync();
        var items = await query
            .OrderBy(u => u.Profile != null ? u.Profile.DisplayName : u.UserName)
            .ThenBy(u => u.Id)
            .Skip((pagination.Page - 1) * pagination.PageSize)
            .Take(pagination.PageSize)
            .Select(u => new UserLookupItemDto
            {
                Id = u.Id,
                Username = u.UserName ?? string.Empty,
                DisplayName = u.Profile != null ? u.Profile.DisplayName : (u.UserName ?? string.Empty),
                AvatarUrl = u.Profile != null ? u.Profile.AvatarUrl : u.AvatarUrl,
                Subtitle = "@" + (u.UserName ?? "unknown")
            })
            .ToListAsync();

        return new PagedLookupDto<UserLookupItemDto>
        {
            Items = items,
            TotalCount = total,
            Page = pagination.Page,
            PageSize = pagination.PageSize
        };
    }

    private async Task<PagedLookupDto<ScopeLookupItemDto>> LookupGroupScopesAsync(string search, Pagination pagination)
    {
        var query = _context.Groups.AsNoTracking();
        if (search.Length > 0)
            query = query.Where(g => g.Name.Contains(search) || (g.Description != null && g.Description.Contains(search)));

        var total = await query.CountAsync();
        var items = await query
            .OrderBy(g => g.Name)
            .ThenBy(g => g.Id)
            .Skip((pagination.Page - 1) * pagination.PageSize)
            .Take(pagination.PageSize)
            .Select(g => new ScopeLookupItemDto
            {
                Id = g.Id,
                Type = ModeratorScopeType.Group,
                Label = g.Name,
                Subtitle = g.Visibility + " group",
                ImageUrl = null
            })
            .ToListAsync();

        return new PagedLookupDto<ScopeLookupItemDto> { Items = items, TotalCount = total, Page = pagination.Page, PageSize = pagination.PageSize };
    }

    private async Task<PagedLookupDto<ScopeLookupItemDto>> LookupCollectionScopesAsync(string search, Pagination pagination)
    {
        var query = _context.Collections.AsNoTracking();
        if (search.Length > 0)
            query = query.Where(c => c.Name.Contains(search) || (c.Description != null && c.Description.Contains(search)));

        var total = await query.CountAsync();
        var items = await query
            .OrderBy(c => c.Name)
            .ThenBy(c => c.Id)
            .Skip((pagination.Page - 1) * pagination.PageSize)
            .Take(pagination.PageSize)
            .Select(c => new ScopeLookupItemDto
            {
                Id = c.Id,
                Type = ModeratorScopeType.Collection,
                Label = c.Name,
                Subtitle = c.Visibility + " collection",
                ImageUrl = c.CoverImageUrl
            })
            .ToListAsync();

        return new PagedLookupDto<ScopeLookupItemDto> { Items = items, TotalCount = total, Page = pagination.Page, PageSize = pagination.PageSize };
    }

    private async Task<PagedLookupDto<ScopeLookupItemDto>> LookupMediaScopesAsync(string search, Pagination pagination)
    {
        var query = _context.Media.AsNoTracking().Where(m => !m.IsDeleted);
        if (search.Length > 0)
            query = query.Where(m => m.Title.Contains(search));

        var total = await query.CountAsync();
        var items = await query
            .OrderBy(m => m.Title)
            .ThenBy(m => m.Id)
            .Skip((pagination.Page - 1) * pagination.PageSize)
            .Take(pagination.PageSize)
            .Select(m => new ScopeLookupItemDto
            {
                Id = m.Id,
                Type = ModeratorScopeType.Media,
                Label = m.Title,
                Subtitle = m.Type.ToString(),
                ImageUrl = m.CoverUrl
            })
            .ToListAsync();

        return new PagedLookupDto<ScopeLookupItemDto> { Items = items, TotalCount = total, Page = pagination.Page, PageSize = pagination.PageSize };
    }

    private static string Normalize(string? value) => value?.Trim() ?? string.Empty;
}
