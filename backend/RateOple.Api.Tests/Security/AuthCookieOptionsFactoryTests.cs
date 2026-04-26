using Microsoft.AspNetCore.Http;
using RateOple.Auth;

namespace RateOple.Api.Tests.Security;

public class AuthCookieOptionsFactoryTests
{
    [Fact]
    public void AccessCookie_IsHttpOnlyAndSecureOutsideDevelopment()
    {
        var options = AuthCookieOptionsFactory.BuildAccessCookieOptions(isDevelopment: false);

        Assert.True(options.HttpOnly);
        Assert.True(options.Secure);
        Assert.Equal(SameSiteMode.Lax, options.SameSite);
        Assert.Equal("/", options.Path);
    }

    [Fact]
    public void RefreshCookie_IsHttpOnlySecureAndScopedOutsideDevelopment()
    {
        var options = AuthCookieOptionsFactory.BuildRefreshCookieOptions(isDevelopment: false);

        Assert.True(options.HttpOnly);
        Assert.True(options.Secure);
        Assert.Equal(SameSiteMode.Lax, options.SameSite);
        Assert.Equal("/api/auth", options.Path);
    }
}
