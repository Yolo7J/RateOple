using Microsoft.AspNetCore.Identity;
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

        public AuthController(
            UserManager<User> userManager,
            IJwtService jwtService,
            ApplicationDbContext db,
            IWebHostEnvironment environment)
        {
            _userManager = userManager;
            _jwtService = jwtService;
            _db = db;
            _environment = environment;
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
            var roles = await _userManager.GetRolesAsync(user);
        
            var accessToken = _jwtService.GenerateAccessToken(user, roles);
            var refreshToken = _jwtService.GenerateRefreshToken();
        
            var hashedRefresh = TokenHasher.Hash(refreshToken);
        
            _db.RefreshTokens.Add(new RefreshToken
            {
                UserId = user.Id,
                TokenHash = hashedRefresh,
                ExpiresAt = DateTime.UtcNow.AddDays(7)
            });
        
            await _db.SaveChangesAsync();
        
            SetAuthCookies(accessToken, refreshToken);
        
            return Ok(new { user.Id, user.UserName, roles });
        }
        
        private void SetAuthCookies(string accessToken, string refreshToken)
        {
            Response.Cookies.Append("accessToken", accessToken, BuildAccessCookieOptions());
            Response.Cookies.Append("refreshToken", refreshToken, BuildRefreshCookieOptions());
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
        
            var roles = await _userManager.GetRolesAsync(stored.User);
            var newAccess = _jwtService.GenerateAccessToken(stored.User, roles);
            var newRefresh = _jwtService.GenerateRefreshToken();
        
            _db.RefreshTokens.Add(new RefreshToken
            {
                UserId = stored.UserId,
                TokenHash = TokenHasher.Hash(newRefresh),
                ExpiresAt = DateTime.UtcNow.AddDays(7)
            });
        
            await _db.SaveChangesAsync();
        
            SetAuthCookies(newAccess, newRefresh);
        
            return Ok(new { stored.User.Id, stored.User.UserName, roles });
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
        
        
    }
}
