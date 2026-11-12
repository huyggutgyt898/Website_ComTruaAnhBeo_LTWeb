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

        await SignInAccountAsync(account);
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
                (account.VaiTro == CustomerRole || account.VaiTro == AdminController.AdminRole) &&
                (account.Email == identifier || account.Sdt == identifier))
            .OrderBy(account => account.MaTk)
            .Take(2)
            .ToListAsync();

        if (accounts.Count != 1 || string.IsNullOrEmpty(accounts[0].MatKhauHash))
        {
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

        await SignInAccountAsync(account);
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
    // GET /auth/profile: đọc hồ sơ mới nhất từ DB của khách đang đăng nhập
    [HttpGet("profile")]
    [Authorize(Roles = CustomerRole)]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public async Task<IActionResult> GetProfile()
    {
        var account = await FindCurrentCustomerAsync();
        if (account is null)
        {
            return await RejectInactiveSessionAsync();
        }

        return Ok(new { user = ToClientUser(account) });
    }

    // POST /auth/profile: khách tự cập nhật họ tên, số điện thoại, địa chỉ (email không đổi được)
    [HttpPost("profile")]
    [Authorize(Roles = CustomerRole)]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var account = await FindCurrentCustomerAsync();
        if (account is null)
        {
            return await RejectInactiveSessionAsync();
        }

        var phone = request.Phone.Trim();
        if (await _db.TaiKhoans.AnyAsync(a => a.Sdt == phone && a.MaTk != account.MaTk))
        {
            return Conflict(new { message = "Số điện thoại này đã được dùng cho tài khoản khác." });
        }

        account.HoTen = request.FullName.Trim();
        account.Sdt = phone;
        account.DiaChi = request.Address.Trim();

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException exception) when (IsDuplicateKeyViolation(exception))
        {
            return Conflict(new { message = "Số điện thoại này đã được dùng cho tài khoản khác." });
        }

        // Đăng nhập lại để cookie chứa thông tin mới (tên, SĐT, địa chỉ)
        await SignInAccountAsync(account);
        return Ok(new { message = "Đã cập nhật thông tin tài khoản.", user = ToClientUser(account) });
    }

    private async Task<TaiKhoan?> FindCurrentCustomerAsync()
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var accountId))
        {
            return null;
        }

        return await _db.TaiKhoans.FirstOrDefaultAsync(account =>
            account.MaTk == accountId &&
            account.VaiTro == CustomerRole &&
            account.HoatDong);
    }

    // Tài khoản đã bị admin khóa/xóa trong lúc đang đăng nhập: đăng xuất khỏi phiên hiện tại
    private async Task<IActionResult> RejectInactiveSessionAsync()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return Unauthorized(new { message = "Tài khoản không còn hoạt động. Vui lòng đăng nhập lại." });
    }
    // ========================================================================
    // QUÊN MẬT KHẨU & ĐỔI MẬT KHẨU QUA EMAIL
    // Luồng: gửi mã 6 số qua email -> nhập mã + mật khẩu mới.
    //  - Quên mật khẩu (chưa đăng nhập): forgot/send-code -> forgot/reset
    //  - Đổi mật khẩu (đã đăng nhập):    change/send-code -> change
    // ========================================================================
    private const string PurposeForgot = "forgot";
    private const string PurposeChange = "change";

    // POST /auth/password/forgot/send-code  { "email": "..." }
    [HttpPost("password/forgot/send-code")]
    [AllowAnonymous]
    [ValidateAntiForgeryToken]
    [EnableRateLimiting("password-reset-send")]
    public async Task<IActionResult> SendForgotPasswordCode([FromBody] ForgotPasswordRequest request)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var email = request.Email.Trim().ToLowerInvariant();
        var account = await _db.TaiKhoans.FirstOrDefaultAsync(a =>
            a.Email == email &&
            a.VaiTro == CustomerRole &&
            a.HoatDong);

        // Luôn trả lời giống nhau dù email có tồn tại hay không (tránh dò email)
        return await IssuePasswordCodeAsync(PurposeForgot, email, account);
    }

    // POST /auth/password/forgot/reset  { "challengeId", "code", "newPassword" }
    [HttpPost("password/forgot/reset")]
    [AllowAnonymous]
    [ValidateAntiForgeryToken]
    [EnableRateLimiting("password-reset-verify")]
    public async Task<IActionResult> ResetForgottenPassword([FromBody] ResetPasswordRequest request)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var (pending, error) = ConsumePasswordCode(PurposeForgot, request);
        if (error is not null)
        {
            return error;
        }

        var account = await _db.TaiKhoans.FirstOrDefaultAsync(a =>
            a.MaTk == pending!.AccountId &&
            a.VaiTro == CustomerRole &&
            a.HoatDong);

        if (account is null)
        {
            return BadRequest(new { message = "Không thể đặt lại mật khẩu cho tài khoản này." });
        }

        account.MatKhauHash = _passwordHasher.HashPassword(account, request.NewPassword);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = "Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.",
            email = account.Email
        });
    }

    // POST /auth/password/change/send-code  (khách đã đăng nhập, mã gửi tới email của chính tài khoản)
    [HttpPost("password/change/send-code")]
    [Authorize(Roles = CustomerRole)]
    [ValidateAntiForgeryToken]
    [EnableRateLimiting("password-reset-send")]
    public async Task<IActionResult> SendChangePasswordCode()
    {
        var account = await FindCurrentCustomerAsync();
        if (account is null)
        {
            return await RejectInactiveSessionAsync();
        }

        return await IssuePasswordCodeAsync(PurposeChange, account.Email.Trim().ToLowerInvariant(), account);
    }

    // POST /auth/password/change  { "challengeId", "code", "newPassword" }
    [HttpPost("password/change")]
    [Authorize(Roles = CustomerRole)]
    [ValidateAntiForgeryToken]
    [EnableRateLimiting("password-reset-verify")]
    public async Task<IActionResult> ChangePassword([FromBody] ResetPasswordRequest request)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var account = await FindCurrentCustomerAsync();
        if (account is null)
        {
            return await RejectInactiveSessionAsync();
        }

        var (_, error) = ConsumePasswordCode(PurposeChange, request, account.MaTk);
        if (error is not null)
        {
            return error;
        }

        account.MatKhauHash = _passwordHasher.HashPassword(account, request.NewPassword);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Đổi mật khẩu thành công." });
    }

    private async Task<IActionResult> IssuePasswordCodeAsync(string purpose, string email, TaiKhoan? account)
    {
        var emailKey = GetEmailKey(email);
        var cooldownKey = GetPasswordCooldownKey(purpose, emailKey);
        if (_cache.TryGetValue(cooldownKey, out _))
        {
            return StatusCode(StatusCodes.Status429TooManyRequests, new
            {
                message = "Vui lòng đợi 1 phút trước khi gửi lại mã."
            });
        }

        var activeKey = GetPasswordActiveKey(purpose, emailKey);
        if (_cache.TryGetValue<string>(activeKey, out var oldChallengeId) && oldChallengeId is not null)
        {
            _cache.Remove(GetPasswordChallengeKey(oldChallengeId));
        }

        var challengeId = Microsoft.AspNetCore.WebUtilities.WebEncoders.Base64UrlEncode(
            RandomNumberGenerator.GetBytes(32));
        var code = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");

        // account == null (email không tồn tại / bị khóa): vẫn tạo phiên giả để phản hồi giống hệt,
        // nhưng không gửi email và phiên này không bao giờ xác nhận thành công (AccountId = 0)
        var pending = new PendingPasswordCode(
            purpose,
            account?.MaTk ?? 0,
            emailKey,
            HashCode(challengeId, code),
            DateTimeOffset.UtcNow.Add(VerificationCodeLifetime));

        _cache.Set(GetPasswordChallengeKey(challengeId), pending, VerificationCodeLifetime);
        _cache.Set(activeKey, challengeId, VerificationCodeLifetime);
        _cache.Set(cooldownKey, true, VerificationResendInterval);

        if (account is not null)
        {
            try
            {
                await _emailSender.SendPasswordResetCodeAsync(
                    email,
                    account.HoTen,
                    code,
                    HttpContext.RequestAborted);
            }
            catch (EmailSenderConfigurationException exception)
            {
                RemovePendingPasswordCode(challengeId, purpose, emailKey);
                _cache.Remove(cooldownKey);
                _logger.LogError(exception, "Email sending is not configured.");
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                {
                    message = "Ứng dụng chưa nạp đủ cấu hình SMTP. Hãy chạy scripts/Configure-EmailSecrets.ps1 rồi khởi động lại ứng dụng."
                });
            }
            catch (SmtpException exception)
            {
                RemovePendingPasswordCode(challengeId, purpose, emailKey);
                _cache.Remove(cooldownKey);
                _logger.LogError(exception, "Failed to send a password reset email.");
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                {
                    message = "Gmail SMTP từ chối gửi email. Kiểm tra Gmail và App Password; xem log ứng dụng để biết lỗi kết nối."
                });
            }
        }

        return Ok(new
        {
            message = "Nếu thông tin hợp lệ, mã xác nhận đã được gửi qua email.",
            challengeId,
            expiresInSeconds = (int)VerificationCodeLifetime.TotalSeconds,
            resendAfterSeconds = (int)VerificationResendInterval.TotalSeconds
        });
    }

    // Kiểm tra mã. Thành công thì xóa phiên (mã chỉ dùng được 1 lần) và trả về phiên đó.
    private (PendingPasswordCode? Pending, IActionResult? Error) ConsumePasswordCode(
        string purpose,
        ResetPasswordRequest request,
        int? requiredAccountId = null)
    {
        if (!_cache.TryGetValue<PendingPasswordCode>(GetPasswordChallengeKey(request.ChallengeId), out var pending) ||
            pending is null ||
            pending.Purpose != purpose ||
            pending.ExpiresAtUtc <= DateTimeOffset.UtcNow)
        {
            return (null, BadRequest(new { message = "Mã xác nhận đã hết hạn. Vui lòng gửi mã mới." }));
        }

        if (requiredAccountId is not null && pending.AccountId != requiredAccountId)
        {
            return (null, BadRequest(new { message = "Mã xác nhận không hợp lệ. Vui lòng gửi mã mới." }));
        }

        if (pending.FailedAttempts >= MaxVerificationAttempts)
        {
            RemovePendingPasswordCode(request.ChallengeId, purpose, pending.EmailKey);
            return (null, StatusCode(StatusCodes.Status429TooManyRequests, new
            {
                message = "Bạn đã nhập sai mã quá nhiều lần. Vui lòng gửi mã mới."
            }));
        }

        var codeMatches = CryptographicOperations.FixedTimeEquals(
            pending.CodeHash,
            HashCode(request.ChallengeId, request.Code));

        // AccountId == 0 là phiên giả (email không tồn tại): không bao giờ được chấp nhận
        if (!codeMatches || pending.AccountId == 0)
        {
            pending.FailedAttempts++;
            if (pending.FailedAttempts >= MaxVerificationAttempts)
            {
                RemovePendingPasswordCode(request.ChallengeId, purpose, pending.EmailKey);
                return (null, StatusCode(StatusCodes.Status429TooManyRequests, new
                {
                    message = "Bạn đã nhập sai mã quá nhiều lần. Vui lòng gửi mã mới."
                }));
            }

            return (null, BadRequest(new { message = "Mã xác nhận chưa đúng. Vui lòng kiểm tra email." }));
        }

        RemovePendingPasswordCode(request.ChallengeId, purpose, pending.EmailKey);
        return (pending, null);
    }

    private void RemovePendingPasswordCode(string challengeId, string purpose, string emailKey)
    {
        _cache.Remove(GetPasswordChallengeKey(challengeId));
        var activeKey = GetPasswordActiveKey(purpose, emailKey);
        if (_cache.TryGetValue<string>(activeKey, out var activeChallengeId) &&
            string.Equals(activeChallengeId, challengeId, StringComparison.Ordinal))
        {
            _cache.Remove(activeKey);
        }
    }

    private static string GetPasswordChallengeKey(string challengeId) => $"password:challenge:{challengeId}";

    private static string GetPasswordActiveKey(string purpose, string emailKey) => $"password:active:{purpose}:{emailKey}";

    private static string GetPasswordCooldownKey(string purpose, string emailKey) => $"password:cooldown:{purpose}:{emailKey}";

    private sealed class PendingPasswordCode(
        string purpose,
        int accountId,
        string emailKey,
        byte[] codeHash,
        DateTimeOffset expiresAtUtc)
    {
        public string Purpose { get; } = purpose;
        public int AccountId { get; } = accountId;
        public string EmailKey { get; } = emailKey;
        public byte[] CodeHash { get; } = codeHash;
        public DateTimeOffset ExpiresAtUtc { get; } = expiresAtUtc;
        public int FailedAttempts { get; set; }
    }
    private IActionResult InvalidCredentials() =>
        Unauthorized(new { message = "Email/SĐT hoặc mật khẩu không chính xác." });

    private async Task SignInAccountAsync(TaiKhoan account)
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
