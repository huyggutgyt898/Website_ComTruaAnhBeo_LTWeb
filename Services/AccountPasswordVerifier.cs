using System.Security.Cryptography;
using System.Text;
using ComTruaAnhBeo.Models;
using Microsoft.AspNetCore.Identity;

namespace ComTruaAnhBeo.Services;

public static class AccountPasswordVerifier
{
    public static bool VerifyAndUpgrade(
        TaiKhoan account,
        string password,
        IPasswordHasher<TaiKhoan> passwordHasher)
    {
        var storedHash = account.MatKhauHash;
        if (string.IsNullOrEmpty(storedHash))
        {
            return false;
        }

        if (IsLegacySha256Hash(storedHash))
        {
            var actualHash = SHA256.HashData(Encoding.UTF8.GetBytes(password));
            var expectedHash = Convert.FromHexString(storedHash);
            if (!CryptographicOperations.FixedTimeEquals(actualHash, expectedHash))
            {
                return false;
            }

            account.MatKhauHash = passwordHasher.HashPassword(account, password);
            return true;
        }

        var verification = passwordHasher.VerifyHashedPassword(account, storedHash, password);
        if (verification == PasswordVerificationResult.Failed)
        {
            return false;
        }

        if (verification == PasswordVerificationResult.SuccessRehashNeeded)
        {
            account.MatKhauHash = passwordHasher.HashPassword(account, password);
        }

        return true;
    }

    private static bool IsLegacySha256Hash(string value) =>
        value.Length == 64 && value.All(Uri.IsHexDigit);
}
