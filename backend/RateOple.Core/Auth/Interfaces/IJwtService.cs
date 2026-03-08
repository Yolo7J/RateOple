using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Core.Contracts
{
    public interface IJwtService
{
    string GenerateAccessToken(User user, IList<string> roles);
    string GenerateRefreshToken();
}
}
