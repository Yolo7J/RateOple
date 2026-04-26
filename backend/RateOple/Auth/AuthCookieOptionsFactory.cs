namespace RateOple.Auth;

public static class AuthCookieOptionsFactory
{
    public static CookieOptions BuildAccessCookieOptions(bool isDevelopment)
    {
        return new CookieOptions
        {
            HttpOnly = true,
            Secure = !isDevelopment,
            SameSite = SameSiteMode.Lax,
            Path = "/",
            Expires = DateTime.UtcNow.AddMinutes(15)
        };
    }

    public static CookieOptions BuildRefreshCookieOptions(bool isDevelopment)
    {
        return new CookieOptions
        {
            HttpOnly = true,
            Secure = !isDevelopment,
            SameSite = SameSiteMode.Lax,
            Path = "/api/auth",
            Expires = DateTime.UtcNow.AddDays(7)
        };
    }
}
