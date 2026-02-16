using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RateOple.Core.Contracts;
using RateOple.Core.Contracts.DTOs.Auth;
using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Models;
using RateOple.Infrastructure.Security;

namespace RateOple.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<User> _userManager;
        private readonly IJwtService _jwtService;
        private readonly ApplicationDbContext _db;

        public AuthController(
            UserManager<User> userManager,
            IJwtService jwtService,
            ApplicationDbContext db)
        {
            _userManager = userManager;
            _jwtService = jwtService;
            _db = db;
        }

        [HttpPost("register")]
        [IgnoreAntiforgeryToken]
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
        
            return Ok();
        }

        [HttpPost("login")]
        [IgnoreAntiforgeryToken]
        public async Task<IActionResult> Login(LoginDto dto)
        {
            var user = await _userManager.FindByNameAsync(dto.Username);
            if (user == null)
                return Unauthorized();
        
            if (!await _userManager.CheckPasswordAsync(user, dto.Password))
                return Unauthorized();
        
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
            Response.Cookies.Append("accessToken", accessToken, new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.Strict,
                Expires = DateTime.UtcNow.AddMinutes(15)
            });
        
            Response.Cookies.Append("refreshToken", refreshToken, new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.Strict,
                Expires = DateTime.UtcNow.AddDays(7)
            });
        }
        [HttpPost("refresh")]
        [IgnoreAntiforgeryToken]
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
        
            return Ok();
        }

        [HttpPost("logout")]
        [IgnoreAntiforgeryToken]
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
        
            Response.Cookies.Delete("accessToken");
            Response.Cookies.Delete("refreshToken");
        
            return Ok();
        }
        
        
    }
}