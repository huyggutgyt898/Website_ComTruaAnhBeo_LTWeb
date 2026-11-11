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

    private readonly ComTruaAnhBeoContext _db;
    private readonly IPasswordHasher<TaiKhoan> _passwordHasher;

    public AdminController(
        ComTruaAnhBeoContext db,
        IPasswordHasher<TaiKhoan> passwordHasher)
    {
        _db = db;
        _passwordHasher = passwordHasher;
    }

    [HttpGet("")]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
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

    [HttpGet("{page}.html")]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Page(string page)
    {
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
    }

    [HttpGet("login")]
    [AllowAnonymous]
    public IActionResult Login(string? returnUrl = null)
    {
        ViewBag.ReturnUrl = GetSafeReturnUrl(returnUrl);
        return View("~/Views/Admin/Login.cshtml", new LoginRequest());
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
            return View("~/Views/Admin/Login.cshtml", request);
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
            return View("~/Views/Admin/Login.cshtml", request);
        }

        var account = accounts[0];
        var previousHash = account.MatKhauHash;
        if (!AccountPasswordVerifier.VerifyAndUpgrade(account, request.Password, _passwordHasher))
        {
            ModelState.AddModelError(string.Empty, "Email/SĐT hoặc mật khẩu không chính xác.");
            return View("~/Views/Admin/Login.cshtml", request);
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

    [HttpPost("logout")]
    [AllowAnonymous]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return RedirectToAction("Index", "Home");
    }

    [HttpGet("forbidden")]
    [AllowAnonymous]
    public IActionResult Forbidden() =>
        StatusCode(StatusCodes.Status403Forbidden, "Tài khoản này không có quyền truy cập trang quản trị.");

    private string GetSafeReturnUrl(string? returnUrl) =>
        Url.IsLocalUrl(returnUrl) ? returnUrl! : "/admin";


    // DTO hứng dữ liệu từ giao diện gửi lên
    public class DishDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public double Price { get; set; }
        public string? Desc { get; set; }
        public string? Image { get; set; }
        public bool Available { get; set; }
    }

    // 1. API lấy toàn bộ danh sách món từ SQL Server cho Admin
    [HttpGet("api/products")]
    public async Task<IActionResult> GetProductsApi()
    {
        var list = await _db.MonAns
            .OrderBy(m => m.MaMon)
            .Select(m => new
            {
                id = "MON-" + m.MaMon.ToString("D3"),
                rawId = m.MaMon,
                name = m.TenMon,
                category = m.DanhMuc,
                price = (double)m.Gia,
                desc = m.MoTa ?? "",
                image = string.IsNullOrEmpty(m.HinhAnh) ? "/images/thumb_suon.jpg" : m.HinhAnh,
                available = m.ConMon,
                visible = true
            })
            .ToListAsync();

        return Json(list);
    }

    // 2. API Thêm hoặc Cập nhật món ăn
    [HttpPost("api/products/save")]
    public async Task<IActionResult> SaveProductApi([FromBody] DishDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name) || dto.Price < 0)
        {
            return BadRequest(new { message = "Tên món và giá bán không hợp lệ." });
        }

        if (dto.Id <= 0)
        {
            // Thêm món mới vào DB
            var newDish = new MonAn
            {
                TenMon = dto.Name.Trim(),
                DanhMuc = dto.Category,
                Gia = (decimal)dto.Price,
                MoTa = dto.Desc?.Trim(),
                HinhAnh = string.IsNullOrEmpty(dto.Image) ? "/images/thumb_suon.jpg" : dto.Image,
                LoaiMon = dto.Category.Contains("Canh") || dto.Category.Contains("Nước") ? "Phu" : "Chinh",
                ConMon = dto.Available,
                PhuThuSizeLon = 10000
            };
            _db.MonAns.Add(newDish);
            await _db.SaveChangesAsync();
            return Ok(new { success = true, message = "Thêm món ăn mới thành công!", newId = newDish.MaMon });
        }
        else
        {
            // Sửa món đã có
            var dish = await _db.MonAns.FindAsync(dto.Id);
            if (dish == null)
            {
                return NotFound(new { message = "Không tìm thấy món ăn này trong cơ sở dữ liệu." });
            }

            dish.TenMon = dto.Name.Trim();
            dish.DanhMuc = dto.Category;
            dish.Gia = (decimal)dto.Price;
            dish.MoTa = dto.Desc?.Trim();
            if (!string.IsNullOrEmpty(dto.Image)) dish.HinhAnh = dto.Image;
            dish.ConMon = dto.Available;

            await _db.SaveChangesAsync();
            return Ok(new { success = true, message = "Cập nhật món ăn thành công!" });
        }
    }

    // 3. API Đổi nhanh trạng thái Còn món / Hết món
    [HttpPost("api/products/toggle-status/{id}")]
    public async Task<IActionResult> ToggleStatusApi(int id)
    {
        var dish = await _db.MonAns.FindAsync(id);
        if (dish == null) return NotFound(new { message = "Món ăn không tồn tại." });

        dish.ConMon = !dish.ConMon;
        await _db.SaveChangesAsync();
        return Ok(new { success = true, available = dish.ConMon });
    }


    // API Đổi trạng thái Ẩn / Hiện trên Website
    [HttpPost("api/products/toggle-visibility/{id}")]
    public async Task<IActionResult> ToggleVisibilityApi(int id)
    {
        var dish = await _db.MonAns.FindAsync(id);
        if (dish == null) return NotFound(new { message = "Món ăn không tồn tại." });

        // Sử dụng cờ ConMon hoặc trường logic ẩn hiện
        // Nếu ConMon = false thì bên User sẽ không hiện hoặc khóa đặt món
        dish.ConMon = !dish.ConMon;
        await _db.SaveChangesAsync();

        return Ok(new { success = true, visible = dish.ConMon });
    }

    // 4. API Xóa món ăn
    [HttpPost("api/products/delete/{id}")]
    public async Task<IActionResult> DeleteProductApi(int id)
    {
        var dish = await _db.MonAns.FindAsync(id);
        if (dish == null) return NotFound(new { message = "Món ăn không tồn tại." });

        try
        {
            _db.MonAns.Remove(dish);
            await _db.SaveChangesAsync();
            return Ok(new { success = true, message = "Đã xóa món ăn thành công!" });
        }
        catch (Exception)
        {
            // Nếu món ăn đã dính khóa ngoại với hóa đơn cũ
            dish.ConMon = false;
            await _db.SaveChangesAsync();
            return Ok(new { success = true, message = "Món ăn đã có trong đơn hàng cũ, hệ thống đã tự động chuyển sang trạng thái Hết món." });
        }
    }
}
