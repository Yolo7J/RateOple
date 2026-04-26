using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RateOple.Core.Contracts;
using RateOple.Core.Auth.DTOs;
using RateOple.Constants.Enums;
using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Entities;
using RateOple.Infrastructure.Security;
using Microsoft.AspNetCore.Authorization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace RateOple.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<User> _userManager;
        private readonly IJwtService _jwtService;
        private readonly ApplicationDbContext _db;
        private readonly IWebHostEnvironment _environment;
        private readonly IConfiguration _configuration;

        public AuthController(
            UserManager<User> userManager,
            IJwtService jwtService,
            ApplicationDbContext db,
            IWebHostEnvironment environment,
            IConfiguration configuration)
        {
            _userManager = userManager;
            _jwtService = jwtService;
            _db = db;
            _environment = environment;
            _configuration = configuration;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterDto dto)
        {
            var user = new User
            {
                UserName = dto.Username,
                Email = dto.Email
            };
        
            var result = await _userManager.CreateAsync(user, dto.Password);
        
            if (!result.Succeeded)
                return BadRequest(result.Errors);
        
            await _userManager.AddToRoleAsync(user, "User");

            _db.UserProfiles.Add(new UserProfile
            {
                UserId = user.Id,
                DisplayName = dto.Username,
                AvatarUrl = user.AvatarUrl,
                Bio = user.Bio,
                PrivacySetting = user.Visibility == UserVisibility.Private
                    ? PrivacySetting.Private
                    : PrivacySetting.Public
            });
            await _db.SaveChangesAsync();
        
            return Ok();
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> Me()
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);

            if (string.IsNullOrWhiteSpace(userIdClaim))
                return Unauthorized();

            var user = await _userManager.FindByIdAsync(userIdClaim);
            if (user == null)
                return Unauthorized();
        
            var roles = await _userManager.GetRolesAsync(user);
            return Ok(new { user.Id, user.UserName, roles });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginDto dto)
        {
            var user = await _userManager.FindByEmailAsync(dto.Email);
            if (user == null || !await _userManager.CheckPasswordAsync(user, dto.Password))
            {
                return Unauthorized("Incorrect Email or Password");
            }

            return Ok(await IssueAppSignInAsync(user));
        }

        [HttpGet("google/login")]
        public IActionResult GoogleLogin([FromQuery] string? returnUrl = "/")
        {
            if (!IsGoogleConfigured())
                return NotFound("Google authentication is not configured.");

            var redirectUri = Url.Action(nameof(GoogleCallback), "Auth", new { returnUrl });
            var properties = new AuthenticationProperties
            {
                RedirectUri = redirectUri
            };

            return Challenge(properties, GoogleDefaults.AuthenticationScheme);
        }

        [HttpGet("google/callback")]
        public async Task<IActionResult> GoogleCallback([FromQuery] string? returnUrl = "/")
        {
            if (!IsGoogleConfigured())
                return NotFound("Google authentication is not configured.");

            var external = await HttpContext.AuthenticateAsync(IdentityConstants.ExternalScheme);
            if (!external.Succeeded || external.Principal == null)
                return Redirect(BuildExternalLoginRedirect(returnUrl, success: false));

            var providerKey = external.Principal.FindFirstValue(ClaimTypes.NameIdentifier);
            var email = external.Principal.FindFirstValue(ClaimTypes.Email);
            var name = external.Principal.FindFirstValue(ClaimTypes.Name)
                ?? email?.Split('@')[0];

            if (string.IsNullOrWhiteSpace(providerKey) || string.IsNullOrWhiteSpace(email))
            {
                await HttpContext.SignOutAsync(IdentityConstants.ExternalScheme);
                return Redirect(BuildExternalLoginRedirect(returnUrl, success: false));
            }

            var user = await _userManager.FindByLoginAsync(GoogleDefaults.AuthenticationScheme, providerKey);
            if (user == null)
            {
                user = await _userManager.FindByEmailAsync(email);
                if (user == null)
                {
                    user = new User
                    {
                        UserName = await BuildUniqueUsernameAsync(name ?? email.Split('@')[0]),
                        Email = email,
                        EmailConfirmed = true
                    };

                    var createResult = await _userManager.CreateAsync(user);
                    if (!createResult.Succeeded)
                    {
                        await HttpContext.SignOutAsync(IdentityConstants.ExternalScheme);
                        return Redirect(BuildExternalLoginRedirect(returnUrl, success: false));
                    }

                    await _userManager.AddToRoleAsync(user, "User");
                    _db.UserProfiles.Add(new UserProfile
                    {
                        UserId = user.Id,
                        DisplayName = user.UserName ?? email,
                        AvatarUrl = user.AvatarUrl,
                        Bio = user.Bio,
                        PrivacySetting = user.Visibility == UserVisibility.Private
                            ? PrivacySetting.Private
                            : PrivacySetting.Public
                    });
                }

                var loginResult = await _userManager.AddLoginAsync(
                    user,
                    new UserLoginInfo(GoogleDefaults.AuthenticationScheme, providerKey, "Google"));
                if (!loginResult.Succeeded)
                {
                    await HttpContext.SignOutAsync(IdentityConstants.ExternalScheme);
                    return Redirect(BuildExternalLoginRedirect(returnUrl, success: false));
                }
            }

            await IssueAppSignInAsync(user);
            await HttpContext.SignOutAsync(IdentityConstants.ExternalScheme);

            return Redirect(BuildExternalLoginRedirect(returnUrl, success: true));
        }
        
        private void SetAuthCookies(string accessToken, string refreshToken)
        {
            Response.Cookies.Append("accessToken", accessToken, BuildAccessCookieOptions());
            Response.Cookies.Append("refreshToken", refreshToken, BuildRefreshCookieOptions());
        }

        private async Task<object> IssueAppSignInAsync(User user)
        {
            var roles = await _userManager.GetRolesAsync(user);
            var accessToken = _jwtService.GenerateAccessToken(user, roles);
            var refreshToken = _jwtService.GenerateRefreshToken();

            _db.RefreshTokens.Add(new RefreshToken
            {
                UserId = user.Id,
                TokenHash = TokenHasher.Hash(refreshToken),
                ExpiresAt = DateTime.UtcNow.AddDays(7)
            });

            await _db.SaveChangesAsync();
            SetAuthCookies(accessToken, refreshToken);

            return new { user.Id, user.UserName, roles };
        }

        private CookieOptions BuildAccessCookieOptions()
        {
            return new CookieOptions
            {
                HttpOnly = true,
                Secure = !_environment.IsDevelopment(),
                SameSite = SameSiteMode.Lax,
                Path = "/",
                Expires = DateTime.UtcNow.AddMinutes(15)
            };
        }

        private CookieOptions BuildRefreshCookieOptions()
        {
            return new CookieOptions
            {
                HttpOnly = true,
                Secure = !_environment.IsDevelopment(),
                SameSite = SameSiteMode.Lax,
                Path = "/api/auth",
                Expires = DateTime.UtcNow.AddDays(7)
            };
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh()
        {
            var refreshToken = Request.Cookies["refreshToken"];
            if (refreshToken == null)
                return Unauthorized();
        
            var hashed = TokenHasher.Hash(refreshToken);
        
            var stored = await _db.RefreshTokens
                .Include(x => x.User)
                .FirstOrDefaultAsync(x =>
                    x.TokenHash == hashed &&
                    !x.Revoked &&
                    x.ExpiresAt > DateTime.UtcNow);
        
            if (stored == null)
                return Unauthorized();
        
            stored.Revoked = true;

            return Ok(await IssueAppSignInAsync(stored.User));
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            var refreshToken = Request.Cookies["refreshToken"];
            if (refreshToken != null)
            {
                var hashed = TokenHasher.Hash(refreshToken);
                var stored = await _db.RefreshTokens
                    .FirstOrDefaultAsync(x => x.TokenHash == hashed);
        
                if (stored != null)
                {
                    stored.Revoked = true;
                    await _db.SaveChangesAsync();
                }
            }
        
            Response.Cookies.Delete("accessToken", BuildAccessCookieOptions());
            Response.Cookies.Delete("refreshToken", BuildRefreshCookieOptions());
        
            return Ok();
        }

        private bool IsGoogleConfigured()
        {
            return !string.IsNullOrWhiteSpace(_configuration["Authentication:Google:ClientId"])
                && !string.IsNullOrWhiteSpace(_configuration["Authentication:Google:ClientSecret"]);
        }

        private string BuildExternalLoginRedirect(string? returnUrl, bool success)
        {
            var path = Url.IsLocalUrl(returnUrl) ? returnUrl! : "/";
            var separator = path.Contains('?') ? "&" : "?";
            return $"{path}{separator}externalLogin={(success ? "success" : "failed")}";
        }

        private async Task<string> BuildUniqueUsernameAsync(string baseName)
        {
            var candidate = new string(baseName
                .Where(char.IsLetterOrDigit)
                .ToArray());

            if (string.IsNullOrWhiteSpace(candidate))
                candidate = "googleuser";

            candidate = candidate.Length > 24 ? candidate[..24] : candidate;

            if (await _userManager.FindByNameAsync(candidate) == null)
                return candidate;

            for (var i = 1; i <= 1000; i++)
            {
                var next = $"{candidate}{i}";
                if (await _userManager.FindByNameAsync(next) == null)
                    return next;
            }

            return $"google{Guid.NewGuid():N}"[..30];
        }
        
        
    }
}
