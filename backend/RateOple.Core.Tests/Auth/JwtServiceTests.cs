using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Primitives;
using RateOple.Core.Auth.Services;
using RateOple.Infrastructure.Data.Entities;
using RateOple.Infrastructure.Security;

namespace RateOple.Core.Tests.Auth;

public class JwtServiceTests
{
    [Fact]
    public void GenerateAccessToken_IncludesUserAndRoleClaims()
    {
        var service = CreateService();
        var user = new User
        {
            Id = Guid.NewGuid(),
            UserName = "jwt-user"
        };

        var token = service.GenerateAccessToken(user, ["User", "Moderator"]);

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        Assert.Equal("RateOple.Tests", jwt.Issuer);
        Assert.Contains(jwt.Audiences, audience => audience == "RateOple.Tests");
        Assert.Contains(jwt.Claims, c => c.Type == JwtRegisteredClaimNames.Sub && c.Value == user.Id.ToString());
        Assert.Contains(jwt.Claims, c => c.Type == ClaimTypes.NameIdentifier && c.Value == user.Id.ToString());
        Assert.Contains(jwt.Claims, c => c.Type == ClaimTypes.Name && c.Value == "jwt-user");
        Assert.Contains(jwt.Claims, c => c.Type == JwtRegisteredClaimNames.UniqueName && c.Value == "jwt-user");
        Assert.Contains(jwt.Claims, c => c.Type == ClaimTypes.Role && c.Value == "User");
        Assert.Contains(jwt.Claims, c => c.Type == ClaimTypes.Role && c.Value == "Moderator");
    }

    [Fact]
    public void GenerateAccessToken_RequiresSigningKey()
    {
        var config = new DictionaryConfiguration();
        var service = new JwtService(config);

        Assert.Throws<InvalidOperationException>(() => service.GenerateAccessToken(new User
        {
            Id = Guid.NewGuid(),
            UserName = "missing-key"
        }, []));
    }

    [Fact]
    public void GenerateRefreshToken_ReturnsHighEntropyToken()
    {
        var service = CreateService();

        var first = service.GenerateRefreshToken();
        var second = service.GenerateRefreshToken();

        Assert.NotEqual(first, second);
        Assert.True(Convert.FromBase64String(first).Length >= 64);
        Assert.True(Convert.FromBase64String(second).Length >= 64);
    }

    [Fact]
    public void TokenHasher_HashesRefreshTokenBeforeStorage()
    {
        var token = "refresh-token-value";

        var hash = TokenHasher.Hash(token);

        Assert.NotEqual(token, hash);
        Assert.Equal(hash, TokenHasher.Hash(token));
    }

    private static JwtService CreateService()
    {
        var config = new DictionaryConfiguration(new Dictionary<string, string?>
        {
            ["Jwt:Key"] = "TestingOnlyJwtSigningKey-AtLeastThirtyTwoBytes",
            ["Jwt:Issuer"] = "RateOple.Tests",
            ["Jwt:Audience"] = "RateOple.Tests"
        });

        return new JwtService(config);
    }

    private sealed class DictionaryConfiguration : IConfiguration
    {
        private readonly Dictionary<string, string?> _values;

        public DictionaryConfiguration(Dictionary<string, string?>? values = null)
        {
            _values = values ?? [];
        }

        public string? this[string key]
        {
            get => _values.GetValueOrDefault(key);
            set => _values[key] = value;
        }

        public IEnumerable<IConfigurationSection> GetChildren() => [];

        public IChangeToken GetReloadToken() => new NoopChangeToken();

        public IConfigurationSection GetSection(string key) => new DictionaryConfigurationSection(key, this[key]);
    }

    private sealed class DictionaryConfigurationSection : IConfigurationSection
    {
        public DictionaryConfigurationSection(string key, string? value)
        {
            Key = key;
            Path = key;
            Value = value;
        }

        public string? this[string key]
        {
            get => null;
            set { }
        }

        public string Key { get; }
        public string Path { get; }
        public string? Value { get; set; }
        public IEnumerable<IConfigurationSection> GetChildren() => [];
        public IChangeToken GetReloadToken() => new NoopChangeToken();
        public IConfigurationSection GetSection(string key) => new DictionaryConfigurationSection(key, null);
    }

    private sealed class NoopChangeToken : IChangeToken
    {
        public bool ActiveChangeCallbacks => false;
        public bool HasChanged => false;
        public IDisposable RegisterChangeCallback(Action<object?> callback, object? state) => new NoopDisposable();
    }

    private sealed class NoopDisposable : IDisposable
    {
        public void Dispose()
        {
        }
    }
}
