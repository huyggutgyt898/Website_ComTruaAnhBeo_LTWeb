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
    private const int BankPaymentTimeoutMinutes = 10;

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

    [HttpGet("api/orders")]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public async Task<IActionResult> OrderData(CancellationToken cancellationToken)
    {
        var orders = await _db.DonHangs
            .AsNoTracking()
            .OrderByDescending(order => order.NgayDat)
            .Select(order => new
            {
                id = order.MaDon,
                trackingCode = order.MaTraCuu,
                customerName = order.TenNguoiNhan,
                customerPhone = order.Sdt,
                deliveryAddress = order.DiaChiGiao,
                customerNote = order.GhiChu,
                status = order.TrangThai,
                subtotal = order.TienMon,
                discount = order.TienGiam,
                shippingFee = order.PhiGiaoKhach,
                grandTotal = order.TongTien,
                createdAt = order.NgayDat,
                paymentMethod = order.ThanhToan == null ? null : order.ThanhToan.PhuongThuc,
                paymentStatus = order.ThanhToan == null ? null : order.ThanhToan.TrangThai,
                driverName = order.VanChuyen == null ? null : order.VanChuyen.TenTaiXe,
                driverPhone = order.VanChuyen == null ? null : order.VanChuyen.SdttaiXe,
                items = order.CtDonHangs
                    .Where(item => item.MaCtcha == null)
                    .Select(item => new
                    {
                        name = item.MaMonNavigation.TenMon,
                        qty = item.SoLuong,
                        price = item.DonGia,
                        size = item.TenSize,
                        toppings = item.InverseMaCtchaNavigation
                            .Select(child => child.MaMonNavigation.TenMon)
                            .ToList()
                    })
                    .ToList()
            })
            .ToListAsync(cancellationToken);

        return Ok(orders.Select(order => new
        {
            order.id,
            order.trackingCode,
            order.customerName,
            order.customerPhone,
            order.deliveryAddress,
            order.customerNote,
            status = MapOrderStatus(order.status),
            statusLabel = GetOrderStatusLabel(order.status),
            order.subtotal,
            order.discount,
            order.shippingFee,
            order.grandTotal,
            order.createdAt,
            paymentMethod = MapPaymentMethod(order.paymentMethod),
            isBankPayment = order.paymentMethod == "BANK",
            isPaid = order.paymentStatus == "DaTT",
            driver = string.IsNullOrWhiteSpace(order.driverName) && string.IsNullOrWhiteSpace(order.driverPhone)
                ? null
                : new
                {
                    name = order.driverName ?? "",
                    phone = order.driverPhone ?? "",
                    licensePlate = ""
                },
            order.items
        }));
    }

    [HttpPost("api/orders/{orderId:int}/confirm")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> ConfirmOrder(int orderId, CancellationToken cancellationToken)
    {
        var order = await _db.DonHangs
            .FirstOrDefaultAsync(item => item.MaDon == orderId, cancellationToken);
        if (order is null)
        {
            return NotFound(new { message = "Không tìm thấy đơn hàng." });
        }

        if (order.TrangThai != "ChoXacNhan")
        {
            return Conflict(new { message = "Đơn hàng không còn ở trạng thái chờ xác nhận. Vui lòng tải lại danh sách." });
        }

        var payment = await _db.ThanhToans
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.MaDon == orderId, cancellationToken);
        if (payment is not null &&
            payment.PhuongThuc != "COD" &&
            payment.TrangThai != "DaTT")
        {
            return Conflict(new { message = "Chưa thể tiếp nhận đơn thanh toán online trước khi xác nhận đã thanh toán." });
        }

        order.TrangThai = "DaXacNhan";
        await _db.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            status = MapOrderStatus(order.TrangThai),
            statusLabel = GetOrderStatusLabel(order.TrangThai)
        });
    }

    [HttpPost("api/orders/{orderId:int}/payment/confirm")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> ConfirmPayment(int orderId, CancellationToken cancellationToken)
    {
        var payment = await _db.ThanhToans
            .Include(item => item.MaDonNavigation)
            .FirstOrDefaultAsync(item => item.MaDon == orderId, cancellationToken);
        if (payment is null)
        {
            return NotFound(new { message = "Không tìm thấy thông tin thanh toán của đơn hàng." });
        }

        if (payment.PhuongThuc is not ("COD" or "BANK"))
        {
            return BadRequest(new { message = "Phương thức thanh toán của đơn hàng không được hỗ trợ." });
        }

        if (payment.TrangThai == "DaTT")
        {
            return Ok(new { isPaid = true });
        }

        if (payment.TrangThai != "ChuaTT")
        {
            return Conflict(new { message = "Trạng thái thanh toán đã thay đổi. Vui lòng tải lại danh sách." });
        }

        if (payment.PhuongThuc == "BANK" && payment.MaDonNavigation.TrangThai != "ChoXacNhan")
        {
            return Conflict(new { message = "Đơn chuyển khoản không còn chờ xác nhận. Vui lòng tải lại danh sách." });
        }

        if (payment.PhuongThuc == "BANK" &&
            payment.MaDonNavigation.NgayDat.AddMinutes(BankPaymentTimeoutMinutes) <= DateTime.Now)
        {
            return Conflict(new { message = "Đơn chuyển khoản đã hết hạn thanh toán và không thể xác nhận." });
        }

        payment.TrangThai = "DaTT";
        payment.ThoiGianTt = DateTime.Now;
        if (payment.PhuongThuc == "BANK" && string.IsNullOrWhiteSpace(payment.MaGiaoDich))
        {
            payment.MaGiaoDich = $"ADMIN-MANUAL-{payment.MaDon}";
        }

        await _db.SaveChangesAsync(cancellationToken);

        return Ok(new { isPaid = true });
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

    private static string MapOrderStatus(string? status) => status switch
    {
        "ChoXacNhan" => "PENDING",
        "DaXacNhan" => "CONFIRMED",
        "DangChuanBi" or "DangNau" => "PREPARING",
        "TimTaiXe" or "DangTimTaiXe" => "FINDING_DRIVER",
        "DaCoTaiXe" => "DRIVER_ASSIGNED",
        "DangGiao" => "DELIVERING",
        "HoanThanh" => "COMPLETED",
        "Huy" or "DaHuy" => "CANCELED",
        "ThatBai" or "GiaoThatBai" => "FAILED",
        _ => "UNKNOWN"
    };

    private static string GetOrderStatusLabel(string? status) => status switch
    {
        "ChoXacNhan" => "Chờ xác nhận",
        "DaXacNhan" => "Đã xác nhận",
        "DangChuanBi" or "DangNau" => "Đang chuẩn bị",
        "TimTaiXe" or "DangTimTaiXe" => "Đang tìm tài xế",
        "DaCoTaiXe" => "Đã có tài xế",
        "DangGiao" => "Đang giao hàng",
        "HoanThanh" => "Hoàn thành",
        "Huy" or "DaHuy" => "Đã hủy",
        "ThatBai" or "GiaoThatBai" => "Giao thất bại",
        _ => string.IsNullOrWhiteSpace(status) ? "Không rõ trạng thái" : status
    };

    private static string MapPaymentMethod(string? paymentMethod) => paymentMethod switch
    {
        "BANK" => "Chuyển khoản ngân hàng",
        "COD" => "Tiền mặt khi nhận (COD)",
        _ => string.IsNullOrWhiteSpace(paymentMethod) ? "Chưa xác định" : paymentMethod
    };
}
