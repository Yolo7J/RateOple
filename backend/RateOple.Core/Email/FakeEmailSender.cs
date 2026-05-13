namespace RateOple.Core.Email;

public sealed class FakeEmailSender : IAppEmailSender
{
    public List<SentEmail> Sent { get; } = [];

    public Task SendAsync(string to, string subject, string htmlBody, CancellationToken cancellationToken = default)
    {
        Sent.Add(new SentEmail(to, subject, htmlBody));
        return Task.CompletedTask;
    }
}

public sealed record SentEmail(string To, string Subject, string HtmlBody);
