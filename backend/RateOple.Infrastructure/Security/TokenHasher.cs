using System.Security.Cryptography;
using System.Text;

namespace RateOple.Infrastructure.Security;

public static class TokenHasher
{
    public static string Hash(string token)
    {
        using var sha256 = SHA256.Create();
        var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(bytes);
    }
}
