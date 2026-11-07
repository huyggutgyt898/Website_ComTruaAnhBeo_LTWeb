using System.Security.Claims;
using ComTruaAnhBeo.Models;
using ComTruaAnhBeo.Models.Auth;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace ComTruaAnhBeo.Controllers;

[Route("auth")]
public sealed class AuthController : Controller
{
    private const string CustomerRole = "KhachHang";
    private readonly ComTruaAnhBeoContext _db;
    private readonly IPasswordHasher<TaiKhoan> _passwordHasher;
    private readonly IAntiforgery _antiforgery;

    public AuthController(
        ComTruaAnhBeoContext db,
        IPasswordHasher<TaiKhoan> passwordHasher,
        IAntiforgery antiforgery)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _antiforgery = antiforgery;
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

    [HttpPost("register")]
    [AllowAnonymous]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Register([FromForm] RegisterRequest request)
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

        var account = new TaiKhoan
        {
            HoTen = request.FullName.Trim(),
            Sdt = request.Phone.Trim(),
            Email = email,
            DiaChi = request.Address.Trim(),
            VaiTro = CustomerRole,
            HoatDong = true
        };
        account.MatKhauHash = _passwordHasher.HashPassword(account, request.Password);

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
            return InvalidCredentials();
        }

        var account = accounts[0];
        var verification = _passwordHasher.VerifyHashedPassword(account, account.MatKhauHash, request.Password);
        if (verification == PasswordVerificationResult.Failed)
        {
            return InvalidCredentials();
        }

        if (verification == PasswordVerificationResult.SuccessRehashNeeded)
        {
            account.MatKhauHash = _passwordHasher.HashPassword(account, request.Password);
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
}
