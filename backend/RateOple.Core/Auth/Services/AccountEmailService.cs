using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RateOple.Core.Contracts;
using RateOple.Core.Email;
using RateOple.Infrastructure.Data.Entities;
using System.Text;

namespace RateOple.Core.Auth.Services;

public sealed class AccountEmailService : IAccountEmailService
{
    private readonly UserManager<User> _userManager;
    private readonly IAppEmailSender _emailSender;
    private readonly EmailOptions _options;
    private readonly ILogger<AccountEmailService> _logger;

    public AccountEmailService(
        UserManager<User> userManager,
        IAppEmailSender emailSender,
        IOptions<EmailOptions> options,
        ILogger<AccountEmailService> logger)
    {
        _userManager = userManager;
        _emailSender = emailSender;
        _options = options.Value;
        _logger = logger;
    }

    public async Task SendConfirmationAsync(User user, CancellationToken cancellationToken = default)
    {
        var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
        var link = BuildFrontendUrl("/confirm-email", user.Email!, token);
        await SendSafelyAsync(
            user.Email!,
            "Confirm your RateOple email",
            $"""
            <p>Confirm your RateOple email address to start creating ratings, reviews, groups, and collections.</p>
            <p><a href="{System.Net.WebUtility.HtmlEncode(link)}">Confirm email</a></p>
            """,
            cancellationToken);
    }

    public async Task SendPasswordResetAsync(User user, CancellationToken cancellationToken = default)
    {
        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var link = BuildFrontendUrl("/reset-password", user.Email!, token);
        await SendSafelyAsync(
            user.Email!,
            "Reset your RateOple password",
            $"""
            <p>Use this link to reset your RateOple password.</p>
            <p><a href="{System.Net.WebUtility.HtmlEncode(link)}">Reset password</a></p>
            """,
            cancellationToken);
    }

    private async Task SendSafelyAsync(string to, string subject, string htmlBody, CancellationToken cancellationToken)
    {
        try
        {
            await _emailSender.SendAsync(to, subject, htmlBody, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Account lifecycle email failed for {EmailSubject}.", subject);
            throw new InvalidOperationException("Account email delivery failed.");
        }
    }

    private string BuildFrontendUrl(string path, string email, string token)
    {
        var origin = _options.FrontendBaseUrl;
        if (string.IsNullOrWhiteSpace(origin))
            throw new InvalidOperationException("Email frontend base URL is not configured.");

        var encodedToken = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token));
        return QueryHelpers.AddQueryString(
            $"{origin.TrimEnd('/')}{path}",
            new Dictionary<string, string?>
            {
                ["email"] = email,
                ["token"] = encodedToken
            });
    }
}
