using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using RateOple.Constants.Constants;
using RateOple.Core.Contracts;
using RateOple.Core.Auth.DTOs;
using RateOple.Constants.Enums;
using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Entities;
using RateOple.Infrastructure.Security;
using Microsoft.AspNetCore.Authorization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using RateOple.Auth;
using RateOple.Extensions;
using System.Text;

namespace RateOple.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<User> _userManager;
        private readonly RoleManager<IdentityRole<Guid>> _roleManager;
        private readonly IJwtService _jwtService;
        private readonly IAccountEmailService _accountEmailService;
        private readonly ApplicationDbContext _db;
        private readonly IWebHostEnvironment _environment;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AuthController> _logger;

        public AuthController(
            UserManager<User> userManager,
            RoleManager<IdentityRole<Guid>> roleManager,
            IJwtService jwtService,
            IAccountEmailService accountEmailService,
            ApplicationDbContext db,
            IWebHostEnvironment environment,
            IConfiguration configuration,
            ILogger<AuthController> logger)
        {
            _userManager = userManager;
            _roleManager = roleManager;
            _jwtService = jwtService;
            _accountEmailService = accountEmailService;
            _db = db;
            _environment = environment;
            _configuration = configuration;
            _logger = logger;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterDto dto)
        {
            var user = new User
            {
                UserName = dto.Username.Trim(),
                Email = dto.Email.Trim(),
                EmailConfirmed = false
            };
        
            var result = await _userManager.CreateAsync(user, dto.Password);
        
            if (!result.Succeeded)
                return BadRequest(result.Errors);
        
            await EnsureUserRoleExistsAsync();
            await _userManager.AddToRoleAsync(user, RoleConstants.User);

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
            await _accountEmailService.SendConfirmationAsync(user);
        
            return Ok();
        }

        [HttpPost("confirm-email")]
        public async Task<IActionResult> ConfirmEmail(ConfirmEmailDto dto)
        {
            var user = await _userManager.FindByEmailAsync(dto.Email.Trim());
            if (user == null)
                return BadRequestProblem("Invalid confirmation token.");

            var token = DecodeToken(dto.Token);
            if (token == null)
                return BadRequestProblem("Invalid confirmation token.");

            var result = await _userManager.ConfirmEmailAsync(user, token);
            if (!result.Succeeded)
                return BadRequestProblem("Invalid confirmation token.");

            return Ok(new { message = "Email confirmed." });
        }

        [HttpPost("resend-confirmation")]
        public async Task<IActionResult> ResendConfirmation(ResendConfirmationDto dto)
        {
            var user = await _userManager.FindByEmailAsync(dto.Email.Trim());
            if (user != null && !user.EmailConfirmed && !IsDeletedUser(user))
            {
                try
                {
                    await _accountEmailService.SendConfirmationAsync(user);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to resend confirmation email.");
                }
            }

            return Ok(new { message = "If the account exists and needs confirmation, a confirmation email has been sent." });
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword(ForgotPasswordDto dto)
        {
            var user = await _userManager.FindByEmailAsync(dto.Email.Trim());
            if (user != null && !IsDeletedUser(user))
            {
                try
                {
                    await _accountEmailService.SendPasswordResetAsync(user);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send password reset email.");
                }
            }

            return Ok(new { message = "If an account exists, a reset email has been sent." });
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword(ResetPasswordDto dto)
        {
            var user = await _userManager.FindByEmailAsync(dto.Email.Trim());
            var token = DecodeToken(dto.Token);
            if (user == null || token == null || IsDeletedUser(user))
                return BadRequestProblem("Invalid password reset token.");

            var result = await _userManager.ResetPasswordAsync(user, token, dto.NewPassword);
            if (!result.Succeeded)
                return BadRequestProblem("Invalid password reset token.");

            await _db.RefreshTokens
                .Where(refreshToken => refreshToken.UserId == user.Id && !refreshToken.Revoked)
                .ExecuteUpdateAsync(setters => setters.SetProperty(refreshToken => refreshToken.Revoked, true));

            Response.Cookies.Delete("accessToken", BuildAccessCookieOptions());
            Response.Cookies.Delete("refreshToken", BuildRefreshCookieOptions());
            return Ok(new { message = "Password reset." });
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
        
            return Ok(await BuildSessionResponseAsync(user));
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginDto dto)
        {
            var user = await _userManager.FindByEmailAsync(dto.Email);
            if (user == null || IsDeletedUser(user) || !await _userManager.CheckPasswordAsync(user, dto.Password))
            {
                return Unauthorized("Incorrect Email or Password");
            }

            return Ok(await IssueAppSignInAsync(user));
        }

        [HttpGet("google/login")]
        public IActionResult GoogleLogin([FromQuery] string? returnUrl = "/")
        {
            if (!IsGoogleConfigured())
                return Redirect(BuildExternalLoginRedirect(returnUrl, success: false, error: "not_configured"));

            var redirectUri = Url.Action(nameof(GoogleComplete), "Auth", new { returnUrl });
            var properties = new AuthenticationProperties
            {
                RedirectUri = redirectUri
            };

            return Challenge(properties, GoogleDefaults.AuthenticationScheme);
        }

        [HttpGet("google/complete")]
        public async Task<IActionResult> GoogleComplete([FromQuery] string? returnUrl = "/")
        {
            if (!IsGoogleConfigured())
                return Redirect(BuildExternalLoginRedirect(returnUrl, success: false, error: "not_configured"));

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

                    await EnsureUserRoleExistsAsync();
                    await _userManager.AddToRoleAsync(user, RoleConstants.User);
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

            return BuildSessionResponse(user, roles);
        }

        private CookieOptions BuildAccessCookieOptions()
        {
            return AuthCookieOptionsFactory.BuildAccessCookieOptions(_environment.IsDevelopment());
        }

        private CookieOptions BuildRefreshCookieOptions()
        {
            return AuthCookieOptionsFactory.BuildRefreshCookieOptions(_environment.IsDevelopment());
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

            if (IsDeletedUser(stored.User))
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

        private async Task EnsureUserRoleExistsAsync()
        {
            if (!await _roleManager.RoleExistsAsync(RoleConstants.User))
                await _roleManager.CreateAsync(new IdentityRole<Guid>(RoleConstants.User));
        }

        private async Task<object> BuildSessionResponseAsync(User user)
        {
            var roles = await _userManager.GetRolesAsync(user);
            return BuildSessionResponse(user, roles);
        }

        private static object BuildSessionResponse(User user, IList<string> roles)
        {
            var isReadOnly = !user.EmailConfirmed || user.IsSuspended;
            var accountState = user.IsSuspended
                ? "suspended"
                : user.EmailConfirmed
                    ? "confirmed"
                    : "unconfirmed";

            return new
            {
                user.Id,
                user.UserName,
                user.Email,
                user.EmailConfirmed,
                user.IsSuspended,
                isReadOnly,
                accountState,
                roles
            };
        }

        private IActionResult BadRequestProblem(string detail)
        {
            return Problem(
                detail: detail,
                statusCode: StatusCodes.Status400BadRequest,
                title: "Bad Request");
        }

        private static string? DecodeToken(string token)
        {
            try
            {
                return Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(token));
            }
            catch (FormatException)
            {
                return null;
            }
        }

        private static bool IsDeletedUser(User user)
        {
            return user.UserName?.StartsWith("deleted_", StringComparison.OrdinalIgnoreCase) == true
                || (user.PasswordHash == null && user.LockoutEnd.HasValue && user.LockoutEnd.Value > DateTimeOffset.UtcNow);
        }

        private string BuildExternalLoginRedirect(string? returnUrl, bool success, string? error = null)
        {
            var path = ResolveAllowedExternalLoginReturnUrl(returnUrl);
            var separator = path.Contains('?') ? "&" : "?";
            var errorPart = !string.IsNullOrWhiteSpace(error)
                ? $"&error={Uri.EscapeDataString(error)}"
                : string.Empty;
            return $"{path}{separator}externalLogin={(success ? "success" : "failed")}{errorPart}";
        }

        private string ResolveAllowedExternalLoginReturnUrl(string? returnUrl)
        {
            if (Url.IsLocalUrl(returnUrl))
                return returnUrl!;

            if (string.IsNullOrWhiteSpace(returnUrl))
                return "/";

            if (!Uri.TryCreate(returnUrl, UriKind.Absolute, out var absoluteUri))
                return "/";

            if (!string.Equals(absoluteUri.AbsolutePath, "/auth/callback", StringComparison.Ordinal))
                return "/";

            if (IsAllowedFrontendOrigin(absoluteUri))
                return absoluteUri.GetLeftPart(UriPartial.Path) + absoluteUri.Query;

            return "/";
        }

        private bool IsAllowedFrontendOrigin(Uri absoluteUri)
        {
            var requestOrigin = $"{Request.Scheme}://{Request.Host}";
            if (string.Equals(absoluteUri.GetLeftPart(UriPartial.Authority), requestOrigin, StringComparison.OrdinalIgnoreCase))
                return true;

            return CorsExtensions.DevelopmentFrontendOrigins.Contains(
                absoluteUri.GetLeftPart(UriPartial.Authority),
                StringComparer.OrdinalIgnoreCase);
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
