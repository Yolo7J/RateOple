using RateOple.Infrastructure.Data.Models;

namespace RateOple.Core.Contracts
{
    public interface IJwtService
{
    string GenerateAccessToken(User user, IList<string> roles);
    string GenerateRefreshToken();
}
}
