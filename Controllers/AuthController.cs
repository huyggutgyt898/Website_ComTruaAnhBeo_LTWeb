using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using ComTruaAnhBeo.Models;
using ComTruaAnhBeo.Models.Auth;
using ComTruaAnhBeo.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using System.Net.Mail;

namespace ComTruaAnhBeo.Controllers;

[Route("auth")]
public sealed class AuthController : Controller
{
    private const string CustomerRole = "KhachHang";
    private static readonly TimeSpan VerificationCodeLifetime = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan VerificationResendInterval = TimeSpan.FromMinutes(1);
    private const int MaxVerificationAttempts = 5;
    private readonly ComTruaAnhBeoContext _db;
    private readonly IPasswordHasher<TaiKhoan> _passwordHasher;
    private readonly IAntiforgery _antiforgery;
    private readonly IMemoryCache _cache;
    private readonly IEmailSender _emailSender;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        ComTruaAnhBeoContext db,
        IPasswordHasher<TaiKhoan> passwordHasher,
        IAntiforgery antiforgery,
        IMemoryCache cache,
        IEmailSender emailSender,
        ILogger<AuthController> logger)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _antiforgery = antiforgery;
        _cache = cache;
        _emailSender = emailSender;
        _logger = logger;
    }

    [HttpGet("current")]
    [AllowAnonymous]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Current()
    {
        if (User.Identity?.IsAuthenticated != true)
        {
            return Ok(new { user = (object?)null });
        }

        return Ok(new
        {
            user = new
            {
                name = User.FindFirstValue(ClaimTypes.Name),
                email = User.FindFirstValue(ClaimTypes.Email),
                phone = User.FindFirstValue(ClaimTypes.MobilePhone),
                role = User.FindFirstValue(ClaimTypes.Role),
                address = User.FindFirstValue(ClaimTypes.StreetAddress)
            }
        });
    }

    [HttpPost("register/send-code")]
    [AllowAnonymous]
    [ValidateAntiForgeryToken]
    [EnableRateLimiting("registration-email-send")]
    public async Task<IActionResult> SendRegistrationCode([FromForm] RegisterRequest request)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var email = request.Email.Trim().ToLowerInvariant();
        if (await _db.TaiKhoans.AnyAsync(account => account.Email == email))
        {
            return Conflict(new { message = "Email này đã được đăng ký." });
        }

        var emailKey = GetEmailKey(email);
        var cooldownKey = GetCooldownKey(emailKey);
        if (_cache.TryGetValue(cooldownKey, out _))
        {
            return StatusCode(StatusCodes.Status429TooManyRequests, new
            {
                message = "Vui lòng đợi 1 phút trước khi gửi lại mã."
            });
        }

        if (_cache.TryGetValue<string>(GetActiveChallengeKey(emailKey), out var oldChallengeId) &&
            oldChallengeId is not null)
        {
            _cache.Remove(GetChallengeKey(oldChallengeId));
        }

        var challengeId = Microsoft.AspNetCore.WebUtilities.WebEncoders.Base64UrlEncode(
            RandomNumberGenerator.GetBytes(32));
        var code = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
        var accountForHash = new TaiKhoan
        {
            HoTen = request.FullName.Trim(),
            Sdt = request.Phone.Trim(),
            Email = email,
            DiaChi = request.Address.Trim(),
            VaiTro = CustomerRole,
            HoatDong = true
        };
        var pendingRegistration = new PendingRegistration(
            accountForHash.HoTen,
            accountForHash.Sdt,
            accountForHash.Email,
            accountForHash.DiaChi,
            _passwordHasher.HashPassword(accountForHash, request.Password),
            HashCode(challengeId, code),
            DateTimeOffset.UtcNow.Add(VerificationCodeLifetime));

        _cache.Set(GetChallengeKey(challengeId), pendingRegistration, VerificationCodeLifetime);
        _cache.Set(GetActiveChallengeKey(emailKey), challengeId, VerificationCodeLifetime);
        _cache.Set(cooldownKey, true, VerificationResendInterval);

        try
        {
            await _emailSender.SendRegistrationCodeAsync(
                email,
                accountForHash.HoTen,
                code,
                HttpContext.RequestAborted);
        }
        catch (EmailSenderConfigurationException exception)
        {
            RemovePendingRegistration(challengeId, emailKey);
            _cache.Remove(cooldownKey);
            _logger.LogError(exception, "Email verification is not configured.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Ứng dụng chưa nạp đủ cấu hình SMTP. Hãy chạy scripts/Configure-EmailSecrets.ps1 rồi khởi động lại ứng dụng."
            });
        }
        catch (SmtpException exception)
        {
            RemovePendingRegistration(challengeId, emailKey);
            _cache.Remove(cooldownKey);
            _logger.LogError(exception, "Failed to send a registration verification email.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Gmail SMTP từ chối gửi email. Kiểm tra Gmail và App Password; xem log ứng dụng để biết lỗi kết nối."
            });
        }

        return Ok(new
        {
            message = "Mã xác nhận đã được gửi qua email.",
            challengeId,
            email,
            expiresInSeconds = (int)VerificationCodeLifetime.TotalSeconds,
            resendAfterSeconds = (int)VerificationResendInterval.TotalSeconds
        });
    }

    [HttpPost("register/verify")]
    [AllowAnonymous]
    [ValidateAntiForgeryToken]
    [EnableRateLimiting("registration-email-verify")]
    public async Task<IActionResult> VerifyRegistration([FromForm] VerifyRegistrationRequest request)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        if (!_cache.TryGetValue<PendingRegistration>(GetChallengeKey(request.ChallengeId), out var pending) ||
            pending is null ||
            pending.ExpiresAtUtc <= DateTimeOffset.UtcNow)
        {
            return BadRequest(new { message = "Mã xác nhận đã hết hạn. Vui lòng gửi mã mới." });
        }

        var emailKey = GetEmailKey(pending.Email);
        if (!_cache.TryGetValue<string>(GetActiveChallengeKey(emailKey), out var activeChallengeId) ||
            !string.Equals(activeChallengeId, request.ChallengeId, StringComparison.Ordinal))
        {
            return BadRequest(new { message = "Mã xác nhận không còn hiệu lực. Vui lòng gửi mã mới." });
        }

        if (pending.FailedAttempts >= MaxVerificationAttempts)
        {
            RemovePendingRegistration(request.ChallengeId, emailKey);
            return StatusCode(StatusCodes.Status429TooManyRequests, new
            {
                message = "Bạn đã nhập sai mã quá nhiều lần. Vui lòng gửi mã mới."
            });
        }

        var submittedCodeHash = HashCode(request.ChallengeId, request.Code);
        if (!CryptographicOperations.FixedTimeEquals(pending.CodeHash, submittedCodeHash))
        {
            pending.FailedAttempts++;
            if (pending.FailedAttempts >= MaxVerificationAttempts)
            {
                RemovePendingRegistration(request.ChallengeId, emailKey);
                return StatusCode(StatusCodes.Status429TooManyRequests, new
                {
                    message = "Bạn đã nhập sai mã quá nhiều lần. Vui lòng gửi mã mới."
                });
            }

            return BadRequest(new { message = "Mã xác nhận chưa đúng. Vui lòng kiểm tra email." });
        }

        RemovePendingRegistration(request.ChallengeId, emailKey);
        var account = new TaiKhoan
        {
            HoTen = pending.FullName,
            Sdt = pending.Phone,
            Email = pending.Email,
            DiaChi = pending.Address,
            MatKhauHash = pending.PasswordHash,
            VaiTro = CustomerRole,
            HoatDong = true
        };

        try
        {
            _db.TaiKhoans.Add(account);
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException exception) when (IsDuplicateKeyViolation(exception))
        {
            return Conflict(new { message = "Email này đã được đăng ký." });
        }

        await SignInCustomerAsync(account);
        return Ok(new { message = "Đăng ký tài khoản thành công.", user = ToClientUser(account) });
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Login([FromForm] LoginRequest request)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var identifier = request.Identifier.Trim();
        var accounts = await _db.TaiKhoans
            .Where(account =>
                account.HoatDong &&
                account.VaiTro == CustomerRole &&
                (account.Email == identifier || account.Sdt == identifier))
            .OrderBy(account => account.MaTk)
            .Take(2)
            .ToListAsync();

        if (accounts.Count != 1 || string.IsNullOrEmpty(accounts[0].MatKhauHash))
        {
            var adminAccountExists = await _db.TaiKhoans.AnyAsync(account =>
                account.HoatDong &&
                account.VaiTro == AdminController.AdminRole &&
                (account.Email == identifier || account.Sdt == identifier));
            if (adminAccountExists)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Đây là tài khoản quản trị. Vui lòng đăng nhập tại trang quản trị /admin/login."
                });
            }

            return InvalidCredentials();
        }

        var account = accounts[0];
        var previousHash = account.MatKhauHash;
        if (!AccountPasswordVerifier.VerifyAndUpgrade(account, request.Password, _passwordHasher))
        {
            return InvalidCredentials();
        }

        if (!string.Equals(account.MatKhauHash, previousHash, StringComparison.Ordinal))
        {
            await _db.SaveChangesAsync();
        }

        await SignInCustomerAsync(account);
        return Ok(new { message = "Đăng nhập thành công.", user = ToClientUser(account) });
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return Ok(new { message = "Đã đăng xuất." });
    }

    [HttpGet("antiforgery")]
    [AllowAnonymous]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult AntiforgeryToken()
    {
        var tokens = _antiforgery.GetAndStoreTokens(HttpContext);
        return Ok(new { token = tokens.RequestToken });
    }

    private IActionResult InvalidCredentials() =>
        Unauthorized(new { message = "Email/SĐT hoặc mật khẩu không chính xác." });

    private async Task SignInCustomerAsync(TaiKhoan account)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, account.MaTk.ToString()),
            new(ClaimTypes.Name, account.HoTen),
            new(ClaimTypes.Email, account.Email),
            new(ClaimTypes.MobilePhone, account.Sdt),
            new(ClaimTypes.Role, account.VaiTro)
        };

        if (!string.IsNullOrWhiteSpace(account.DiaChi))
        {
            claims.Add(new Claim(ClaimTypes.StreetAddress, account.DiaChi));
        }

        var identity = new ClaimsIdentity(
            claims,
            CookieAuthenticationDefaults.AuthenticationScheme,
            ClaimTypes.Name,
            ClaimTypes.Role);

        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(identity));
    }

    private static object ToClientUser(TaiKhoan account) => new
    {
        name = account.HoTen,
        email = account.Email,
        phone = account.Sdt,
        role = account.VaiTro,
        address = account.DiaChi
    };

    private static bool IsDuplicateKeyViolation(DbUpdateException exception)
    {
        for (var innerException = exception.InnerException;
             innerException is not null;
             innerException = innerException.InnerException)
        {
            if (innerException is SqlException { Number: 2601 or 2627 })
            {
                return true;
            }
        }

        return false;
    }

    private void RemovePendingRegistration(string challengeId, string emailKey)
    {
        _cache.Remove(GetChallengeKey(challengeId));
        var activeChallengeKey = GetActiveChallengeKey(emailKey);
        if (_cache.TryGetValue<string>(activeChallengeKey, out var activeChallengeId) &&
            string.Equals(activeChallengeId, challengeId, StringComparison.Ordinal))
        {
            _cache.Remove(activeChallengeKey);
        }
    }

    private static string GetEmailKey(string email) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(email)));

    private static string GetChallengeKey(string challengeId) => $"registration:challenge:{challengeId}";

    private static string GetActiveChallengeKey(string emailKey) => $"registration:active:{emailKey}";

    private static string GetCooldownKey(string emailKey) => $"registration:cooldown:{emailKey}";

    private static byte[] HashCode(string challengeId, string code) =>
        SHA256.HashData(Encoding.UTF8.GetBytes($"{challengeId}:{code}"));

    private sealed class PendingRegistration(
        string fullName,
        string phone,
        string email,
        string address,
        string passwordHash,
        byte[] codeHash,
        DateTimeOffset expiresAtUtc)
    {
        public string FullName { get; } = fullName;
        public string Phone { get; } = phone;
        public string Email { get; } = email;
        public string Address { get; } = address;
        public string PasswordHash { get; } = passwordHash;
        public byte[] CodeHash { get; } = codeHash;
        public DateTimeOffset ExpiresAtUtc { get; } = expiresAtUtc;
        public int FailedAttempts { get; set; }
    }
}
