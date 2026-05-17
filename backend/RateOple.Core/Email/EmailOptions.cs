namespace RateOple.Core.Email;

public class EmailOptions
{
    public string Provider { get; set; } = "Fake";
    public string? From { get; set; }
    public string? FrontendBaseUrl { get; set; }
}

public class ResendOptions
{
    public string? ApiKey { get; set; }
}

public class SmtpOptions
{
    public string? Host { get; set; }
    public int Port { get; set; } = 587;
    public bool UseStartTls { get; set; } = true;
    public string? Username { get; set; }
    public string? Password { get; set; }
    public string? FromEmail { get; set; }
    public string? FromName { get; set; }
}
