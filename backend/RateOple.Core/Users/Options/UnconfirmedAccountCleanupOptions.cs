namespace RateOple.Core.Users.Options;

public sealed class UnconfirmedAccountCleanupOptions
{
    public bool Enabled { get; set; }
    public int MaxAgeHours { get; set; } = 24;
    public int IntervalMinutes { get; set; } = 60;
}
