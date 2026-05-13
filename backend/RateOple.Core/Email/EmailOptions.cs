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
