using System.Security.Claims;
using ComTruaAnhBeo.Models;
using ComTruaAnhBeo.Models.Auth;
using ComTruaAnhBeo.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ComTruaAnhBeo.Controllers;

[Route("admin")]
[Authorize(Roles = AdminController.AdminRole)]
public sealed class AdminController : Controller
{
    internal const string AdminRole = "Admin";

<<<<<<< HEAD
    private static readonly IReadOnlyDictionary<string, string> AdminPageFiles =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["adminpage"] = "adminpage.cshtml",
            ["accounts"] = "accounts.cshtml",
            ["delivery"] = "delivery.cshtml",
            ["orders"] = "orders.cshtml",
            ["Promotions"] = "Promotions.cshtml",
            ["statistics"] = "statistics.cshtml",
            ["_shared-header"] = "_shared-header.cshtml"
        };

    private readonly ComTruaAnhBeoContext _db;
    private readonly IPasswordHasher<TaiKhoan> _passwordHasher;

    public AdminController(
        ComTruaAnhBeoContext db,
        IPasswordHasher<TaiKhoan> passwordHasher)
    {
        _db = db;
        _passwordHasher = passwordHasher;
=======
    private readonly ComTruaAnhBeoContext _db;
    private readonly IPasswordHasher<TaiKhoan> _passwordHasher;
    private readonly IWebHostEnvironment _environment;

    public AdminController(
        ComTruaAnhBeoContext db,
        IPasswordHasher<TaiKhoan> passwordHasher,
        IWebHostEnvironment environment)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _environment = environment;
>>>>>>> 645e0e89fd537b30660a43f39ecf022914d59563
    }

    [HttpGet("")]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
<<<<<<< HEAD
    public IActionResult Index() => Redirect("/admin/orders.html");
=======
    public IActionResult Index() => RedirectToAction(nameof(Orders));

    [HttpGet("products")]
    public IActionResult Products()
    {
        return View();
    }

    [HttpGet("orders")]
    public IActionResult Orders()
    {
        return View();
    }

    [HttpGet("promotions")]
    public IActionResult Promotions()
    {
        return View();
    }

    [HttpGet("accounts")]
    public IActionResult Accounts()
    {
        return View();
    }

    [HttpGet("statistics")]
    public IActionResult Statistics()
    {
        return View();
    }

    [HttpGet("delivery")]
    public IActionResult Delivery()
    {
        return View();
    }
>>>>>>> 645e0e89fd537b30660a43f39ecf022914d59563

    [HttpGet("{page}.html")]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Page(string page)
    {
<<<<<<< HEAD
        if (!AdminPageFiles.TryGetValue(page, out var fileName))
        {
            return NotFound();
        }

        return PartialView($"~/Views/Home/{fileName}");
=======
        return page.ToLowerInvariant() switch
        {
            "orders" => RedirectToActionPermanent(nameof(Orders)),
            "adminpage" or "products" => RedirectToActionPermanent(nameof(Products)),
            "promotions" => RedirectToActionPermanent(nameof(Promotions)),
            "accounts" => RedirectToActionPermanent(nameof(Accounts)),
            "statistics" => RedirectToActionPermanent(nameof(Statistics)),
            "delivery" => RedirectToActionPermanent(nameof(Delivery)),
            _ => NotFound()
        };
>>>>>>> 645e0e89fd537b30660a43f39ecf022914d59563
    }

    [HttpGet("login")]
    [AllowAnonymous]
    public IActionResult Login(string? returnUrl = null)
    {
        ViewBag.ReturnUrl = GetSafeReturnUrl(returnUrl);
<<<<<<< HEAD
        return View("~/Views/Auth/Login.cshtml", new LoginRequest());
=======
        return View("~/Views/Admin/Login.cshtml", new LoginRequest());
>>>>>>> 645e0e89fd537b30660a43f39ecf022914d59563
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Login(
        [FromForm] LoginRequest request,
        [FromForm] string? returnUrl = null)
    {
        ViewBag.ReturnUrl = GetSafeReturnUrl(returnUrl);
        if (!ModelState.IsValid)
        {
<<<<<<< HEAD
            return View("~/Views/Auth/Login.cshtml", request);
=======
            return View("~/Views/Admin/Login.cshtml", request);
>>>>>>> 645e0e89fd537b30660a43f39ecf022914d59563
        }

        var identifier = request.Identifier.Trim();
        var accounts = await _db.TaiKhoans
            .Where(account =>
                account.HoatDong &&
                account.VaiTro == AdminRole &&
                (account.Email == identifier || account.Sdt == identifier))
            .OrderBy(account => account.MaTk)
            .Take(2)
            .ToListAsync();

        if (accounts.Count != 1 || string.IsNullOrEmpty(accounts[0].MatKhauHash))
        {
            ModelState.AddModelError(string.Empty, "Email/SĐT hoặc mật khẩu không chính xác.");
<<<<<<< HEAD
            return View("~/Views/Auth/Login.cshtml", request);
=======
            return View("~/Views/Admin/Login.cshtml", request);
>>>>>>> 645e0e89fd537b30660a43f39ecf022914d59563
        }

        var account = accounts[0];
        var previousHash = account.MatKhauHash;
        if (!AccountPasswordVerifier.VerifyAndUpgrade(account, request.Password, _passwordHasher))
        {
            ModelState.AddModelError(string.Empty, "Email/SĐT hoặc mật khẩu không chính xác.");
<<<<<<< HEAD
            return View("~/Views/Auth/Login.cshtml", request);
=======
            return View("~/Views/Admin/Login.cshtml", request);
>>>>>>> 645e0e89fd537b30660a43f39ecf022914d59563
        }

        if (!string.Equals(account.MatKhauHash, previousHash, StringComparison.Ordinal))
        {
            await _db.SaveChangesAsync();
        }

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, account.MaTk.ToString()),
            new(ClaimTypes.Name, account.HoTen),
            new(ClaimTypes.Email, account.Email),
            new(ClaimTypes.MobilePhone, account.Sdt),
            new(ClaimTypes.Role, account.VaiTro)
        };

        var identity = new ClaimsIdentity(
            claims,
            CookieAuthenticationDefaults.AuthenticationScheme,
            ClaimTypes.Name,
            ClaimTypes.Role);

        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(identity));

        return LocalRedirect(GetSafeReturnUrl(returnUrl));
    }

<<<<<<< HEAD
=======
    [HttpGet("logout")]
    [HttpPost("logout")]
    [AllowAnonymous]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return RedirectToAction("Index", "Home");
    }

>>>>>>> 645e0e89fd537b30660a43f39ecf022914d59563
    [HttpGet("forbidden")]
    [AllowAnonymous]
    public IActionResult Forbidden() =>
        StatusCode(StatusCodes.Status403Forbidden, "Tài khoản này không có quyền truy cập trang quản trị.");

    private string GetSafeReturnUrl(string? returnUrl) =>
        Url.IsLocalUrl(returnUrl) ? returnUrl! : "/admin";
}
