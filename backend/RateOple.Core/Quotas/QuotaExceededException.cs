namespace RateOple.Core.Quotas;

public sealed class QuotaExceededException : Exception
{
    public QuotaExceededException(string message, int statusCode = 403, string code = "quota_exceeded")
        : base(message)
    {
        StatusCode = statusCode;
        Code = code;
    }

    public int StatusCode { get; }

    public string Code { get; }
}
