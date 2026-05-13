using System.Net.Http.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace RateOple.Core.Email;

public sealed class ResendEmailSender : IAppEmailSender
{
    private readonly HttpClient _httpClient;
    private readonly EmailOptions _emailOptions;
    private readonly ResendOptions _resendOptions;
    private readonly ILogger<ResendEmailSender> _logger;

    public ResendEmailSender(
        HttpClient httpClient,
        IOptions<EmailOptions> emailOptions,
        IOptions<ResendOptions> resendOptions,
        ILogger<ResendEmailSender> logger)
    {
        _httpClient = httpClient;
        _emailOptions = emailOptions.Value;
        _resendOptions = resendOptions.Value;
        _logger = logger;
    }

    public async Task SendAsync(string to, string subject, string htmlBody, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_emailOptions.From) || string.IsNullOrWhiteSpace(_resendOptions.ApiKey))
            throw new InvalidOperationException("Resend email configuration is incomplete.");

        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails");
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _resendOptions.ApiKey);
        request.Content = JsonContent.Create(new
        {
            from = _emailOptions.From,
            to = new[] { to },
            subject,
            html = htmlBody
        });

        try
        {
            using var response = await _httpClient.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError("Resend email failed with status {StatusCode}: {Body}", response.StatusCode, body);
                throw new InvalidOperationException("Email delivery failed.");
            }
        }
        catch (Exception ex) when (ex is not InvalidOperationException)
        {
            _logger.LogError(ex, "Resend email delivery failed.");
            throw new InvalidOperationException("Email delivery failed.", ex);
        }
    }
}
