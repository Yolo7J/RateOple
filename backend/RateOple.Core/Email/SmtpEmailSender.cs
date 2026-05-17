using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace RateOple.Core.Email;

public sealed class SmtpEmailSender : IAppEmailSender
{
    private readonly EmailOptions _emailOptions;
    private readonly SmtpOptions _smtpOptions;
    private readonly ILogger<SmtpEmailSender> _logger;

    public SmtpEmailSender(
        IOptions<EmailOptions> emailOptions,
        IOptions<SmtpOptions> smtpOptions,
        ILogger<SmtpEmailSender> logger)
    {
        _emailOptions = emailOptions.Value;
        _smtpOptions = smtpOptions.Value;
        _logger = logger;
    }

    public async Task SendAsync(string to, string subject, string htmlBody, CancellationToken cancellationToken = default)
    {
        var host = Require(_smtpOptions.Host, "SMTP host is not configured.");
        var username = Require(_smtpOptions.Username, "SMTP username is not configured.");
        var password = Require(_smtpOptions.Password, "SMTP password is not configured.");

        if (_smtpOptions.Port is < 1 or > 65535)
            throw new InvalidOperationException("SMTP port is invalid.");

        using var message = new MailMessage
        {
            From = BuildFromAddress(),
            Subject = subject,
            Body = htmlBody,
            IsBodyHtml = true
        };
        message.To.Add(new MailAddress(to));

        using var client = new SmtpClient(host, _smtpOptions.Port)
        {
            DeliveryMethod = SmtpDeliveryMethod.Network,
            EnableSsl = _smtpOptions.UseStartTls,
            UseDefaultCredentials = false,
            Credentials = new NetworkCredential(username, password)
        };

        try
        {
            await client.SendMailAsync(message, cancellationToken);
        }
        catch (Exception ex) when (ex is not InvalidOperationException)
        {
            _logger.LogError(
                ex,
                "SMTP email delivery failed through {SmtpHost}:{SmtpPort}.",
                host,
                _smtpOptions.Port);
            throw new InvalidOperationException("Email delivery failed.", ex);
        }
    }

    private MailAddress BuildFromAddress()
    {
        if (!string.IsNullOrWhiteSpace(_smtpOptions.FromEmail))
            return new MailAddress(_smtpOptions.FromEmail.Trim(), _smtpOptions.FromName?.Trim());

        if (!string.IsNullOrWhiteSpace(_emailOptions.From))
            return new MailAddress(_emailOptions.From.Trim());

        throw new InvalidOperationException("SMTP from address is not configured.");
    }

    private static string Require(string? value, string message)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new InvalidOperationException(message);

        return value.Trim();
    }
}
