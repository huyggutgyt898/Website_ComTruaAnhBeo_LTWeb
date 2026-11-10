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
using System.Text.Json;

namespace ComTruaAnhBeo.Controllers;

[Route("admin")]
[Authorize(Roles = AdminController.AdminRole)]
public sealed class AdminController : Controller
{
    internal const string AdminRole = "Admin";
    private const int BankPaymentTimeoutMinutes = 10;

    private readonly ComTruaAnhBeoContext _db;
    private readonly IPasswordHasher<TaiKhoan> _passwordHasher;
    private readonly DeliveryPricingService _deliveryPricing;
    private readonly ILogger<AdminController> _logger;

    public AdminController(
        ComTruaAnhBeoContext db,
        IPasswordHasher<TaiKhoan> passwordHasher,
        DeliveryPricingService deliveryPricing,
        ILogger<AdminController> logger)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _deliveryPricing = deliveryPricing;
        _logger = logger;
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
                deliveryOrderId = order.VanChuyen == null ? null : order.VanChuyen.LalamoveOrderId,
                deliveryStatus = order.VanChuyen == null ? null : order.VanChuyen.TrangThai,
                trackingUrl = order.VanChuyen == null ? null : order.VanChuyen.LinkTheoDoi,
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
            isCodPayment = order.paymentMethod == "COD",
            isPaid = order.paymentStatus == "DaTT",
            order.deliveryOrderId,
            deliveryStatus = order.deliveryStatus is null ? null : GetDeliveryStatusLabel(order.deliveryStatus),
            order.trackingUrl,
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
            .Include(item => item.VanChuyen)
            .FirstOrDefaultAsync(item => item.MaDon == orderId, cancellationToken);
        if (order is null)
        {
            return NotFound(new { message = "Không tìm thấy đơn hàng." });
        }

        if (order.TrangThai is not ("ChoXacNhan" or "DaXacNhan"))
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

        order.TrangThai = "DangChuanBi";
        await _db.SaveChangesAsync(cancellationToken);

        string? dispatchError = null;
        try
        {
            if (order.VanChuyen is null || order.VanChuyen.TrangThai == "Huy")
            {
                await CreateDeliveryForOrderAsync(order, cancellationToken);
            }
        }
        catch (DeliveryPricingException exception)
        {
            dispatchError = exception.Message;
        }
        catch (DbUpdateException exception)
        {
            _logger.LogError(exception, "Could not save Lalamove delivery for confirmed order {OrderId}.", orderId);
            dispatchError = "Lalamove có thể đã nhận chuyến nhưng ứng dụng không lưu được. Kiểm tra chuyến trong Lalamove trước khi thử lại để tránh tạo chuyến trùng.";
        }
        catch (HttpRequestException exception)
        {
            _logger.LogError(exception, "Could not connect to a delivery provider for order {OrderId}.", orderId);
            dispatchError = "Không kết nối được với Lalamove hoặc dịch vụ định vị. Kiểm tra kết nối mạng/cấu hình rồi thử lại.";
        }
        catch (JsonException exception)
        {
            _logger.LogError(exception, "Invalid delivery provider response for order {OrderId}.", orderId);
            dispatchError = "Lalamove hoặc dịch vụ định vị trả về dữ liệu không hợp lệ. Kiểm tra log máy chủ trước khi thử lại.";
        }

        return Ok(new
        {
            status = MapOrderStatus(order.TrangThai),
            statusLabel = GetOrderStatusLabel(order.TrangThai),
            dispatchError,
            deliveryOrderId = order.VanChuyen?.LalamoveOrderId,
            deliveryStatus = order.VanChuyen is null
                ? null
                : GetDeliveryStatusLabel(order.VanChuyen.TrangThai)
        });
    }

    [HttpPost("api/orders/{orderId:int}/delivery")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> DispatchDelivery(int orderId, CancellationToken cancellationToken)
    {
        var order = await _db.DonHangs
            .Include(item => item.VanChuyen)
            .FirstOrDefaultAsync(item => item.MaDon == orderId, cancellationToken);
        if (order is null)
        {
            return NotFound(new { message = "Không tìm thấy đơn hàng." });
        }

        if (order.VanChuyen is not null && order.VanChuyen.TrangThai != "Huy")
        {
            return Conflict(new { message = "Đơn hàng đã có chuyến Lalamove đang hoạt động." });
        }

        if (order.TrangThai is not ("DangChuanBi" or "ThatBai"))
        {
            return Conflict(new { message = "Chỉ có thể gọi tài xế sau khi đơn đã được xác nhận và bếp đang chế biến hoặc chuyến trước giao thất bại." });
        }

        try
        {
            await CreateDeliveryForOrderAsync(order, cancellationToken);
        }
        catch (DeliveryPricingException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
        catch (DbUpdateException exception)
        {
            _logger.LogError(exception, "Could not save Lalamove delivery for order {OrderId}.", orderId);
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new
                {
                    message = "Lalamove có thể đã nhận chuyến nhưng ứng dụng không lưu được. Kiểm tra chuyến trong Lalamove trước khi thử lại để tránh tạo chuyến trùng."
                });
        }
        catch (HttpRequestException exception)
        {
            _logger.LogError(exception, "Could not connect to a delivery provider for order {OrderId}.", orderId);
            return StatusCode(
                StatusCodes.Status502BadGateway,
                new { message = "Không kết nối được với Lalamove hoặc dịch vụ định vị. Kiểm tra cấu hình và thử lại." });
        }
        catch (JsonException exception)
        {
            _logger.LogError(exception, "Invalid delivery provider response for order {OrderId}.", orderId);
            return StatusCode(
                StatusCodes.Status502BadGateway,
                new { message = "Lalamove hoặc dịch vụ định vị trả về dữ liệu không hợp lệ. Kiểm tra log máy chủ." });
        }

        var delivery = order.VanChuyen!;

        return Ok(new
        {
            status = MapOrderStatus(order.TrangThai),
            statusLabel = GetOrderStatusLabel(order.TrangThai),
            deliveryOrderId = delivery.LalamoveOrderId,
            deliveryStatus = GetDeliveryStatusLabel(delivery.TrangThai),
            trackingUrl = delivery.LinkTheoDoi
        });
    }

    [HttpPost("api/orders/{orderId:int}/delivery/refresh")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> RefreshDeliveryStatus(int orderId, CancellationToken cancellationToken)
    {
        var order = await _db.DonHangs
            .Include(item => item.VanChuyen)
            .Include(item => item.ThanhToan)
            .FirstOrDefaultAsync(item => item.MaDon == orderId, cancellationToken);
        if (order is null)
        {
            return NotFound(new { message = "Không tìm thấy đơn hàng." });
        }

        var delivery = order.VanChuyen;
        if (delivery is null)
        {
            return NotFound(new { message = "Đơn hàng chưa có chuyến Lalamove." });
        }

        if (delivery.TrangThai is "HoanThanh" or "Huy")
        {
            return Ok(new
            {
                status = MapOrderStatus(order.TrangThai),
                statusLabel = GetOrderStatusLabel(order.TrangThai),
                deliveryStatus = GetDeliveryStatusLabel(delivery.TrangThai)
            });
        }

        LalamoveDeliveryStatusResult currentStatus;
        try
        {
            currentStatus = await _deliveryPricing.GetOrderStatusAsync(
                delivery.LalamoveOrderId,
                cancellationToken);
        }
        catch (DeliveryPricingException exception)
        {
            return BadRequest(new { message = exception.Message });
        }

        try
        {
            ApplyDeliveryStatus(order, delivery, currentStatus.Status);
        }
        catch (DeliveryPricingException exception)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new { message = exception.Message });
        }
        if (!string.IsNullOrWhiteSpace(currentStatus.TrackingUrl))
        {
            delivery.LinkTheoDoi = currentStatus.TrackingUrl;
        }

        if (!string.IsNullOrWhiteSpace(currentStatus.DriverName))
        {
            delivery.TenTaiXe = currentStatus.DriverName;
        }

        if (!string.IsNullOrWhiteSpace(currentStatus.DriverPhone))
        {
            delivery.SdttaiXe = NormalizeDriverPhone(currentStatus.DriverPhone);
        }

        if (currentStatus.Status == "COMPLETED" &&
            order.ThanhToan is { PhuongThuc: "COD", TrangThai: "ChuaTT" } payment)
        {
            payment.TrangThai = "DaTT";
            payment.ThoiGianTt = DateTime.Now;
        }

        await _db.SaveChangesAsync(cancellationToken);
        return Ok(new
        {
            status = MapOrderStatus(order.TrangThai),
            statusLabel = GetOrderStatusLabel(order.TrangThai),
            deliveryStatus = GetDeliveryStatusLabel(delivery.TrangThai)
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

        if (payment.PhuongThuc == "COD" &&
            payment.MaDonNavigation.TrangThai != "HoanThanh")
        {
            return Conflict(new
            {
                message = "Thanh toán COD chỉ được ghi nhận sau khi Lalamove xác nhận giao hàng thành công."
            });
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

    private async Task CreateDeliveryForOrderAsync(
        DonHang order,
        CancellationToken cancellationToken)
    {
        var dispatch = await _deliveryPricing.CreateOrderAsync(
            order.DiaChiGiao,
            order.ViDo,
            order.KinhDo,
            order.TenNguoiNhan,
            order.Sdt,
            order.GhiChu ?? "",
            cancellationToken);
        if (dispatch.OrderId.Length > 50)
        {
            throw new DeliveryPricingException(
                "Mã chuyến Lalamove trả về vượt quá giới hạn lưu trữ.");
        }

        var delivery = new VanChuyen
        {
            MaDon = order.MaDon,
            LalamoveOrderId = dispatch.OrderId,
            PhiThucTe = 0,
            LinkTheoDoi = dispatch.TrackingUrl ?? "",
            TenTaiXe = dispatch.DriverName ?? "",
            SdttaiXe = NormalizeDriverPhone(dispatch.DriverPhone),
            TrangThai = "TimTaiXe"
        };
        ApplyDeliveryStatus(order, delivery, dispatch.Status);
        _db.VanChuyens.Add(delivery);
        order.VanChuyen = delivery;
        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception)
        {
            _logger.LogError(
                exception,
                "Lalamove order {LalamoveOrderId} was created, but saving it for order {OrderId} failed.",
                dispatch.OrderId,
                order.MaDon);
            throw;
        }
    }

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
        "HoanThanh" => "Giao thành công",
        "Huy" or "DaHuy" => "Đã hủy",
        "ThatBai" or "GiaoThatBai" => "Giao thất bại",
        _ => string.IsNullOrWhiteSpace(status) ? "Không rõ trạng thái" : status
    };

    private static void ApplyDeliveryStatus(
        DonHang order,
        VanChuyen delivery,
        string lalamoveStatus)
    {
        switch (lalamoveStatus)
        {
            case "ASSIGNING_DRIVER":
            case "PENDING":
                delivery.TrangThai = "TimTaiXe";
                if (order.TrangThai != "DangChuanBi")
                {
                    order.TrangThai = "TimTaiXe";
                }
                break;
            case "ON_GOING":
                delivery.TrangThai = "DaCoTaiXe";
                if (order.TrangThai != "DangChuanBi")
                {
                    order.TrangThai = "DaCoTaiXe";
                }
                break;
            case "PICKED_UP":
                delivery.TrangThai = "DangGiao";
                order.TrangThai = "DangGiao";
                break;
            case "COMPLETED":
                delivery.TrangThai = "HoanThanh";
                order.TrangThai = "HoanThanh";
                break;
            case "CANCELED":
            case "EXPIRED":
            case "REJECTED":
                delivery.TrangThai = "Huy";
                order.TrangThai = "ThatBai";
                break;
            default:
                throw new DeliveryPricingException(
                    "Lalamove trả về trạng thái chuyến giao hàng không được hỗ trợ.");
        }
    }

    private static string GetDeliveryStatusLabel(string? status) => status switch
    {
        "TimTaiXe" => "Đang tìm tài xế Lalamove",
        "DaCoTaiXe" => "Tài xế đã nhận chuyến",
        "DangGiao" => "Tài xế đang giao hàng",
        "HoanThanh" => "Tài xế xác nhận giao thành công",
        "Huy" => "Chuyến giao thất bại hoặc đã hủy",
        _ => string.IsNullOrWhiteSpace(status) ? "Chưa gọi tài xế" : status
    };

    private static string NormalizeDriverPhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone))
        {
            return "";
        }

        var digits = new string(phone.Where(char.IsDigit).ToArray());
        if (digits.StartsWith("84", StringComparison.Ordinal) && digits.Length == 11)
        {
            return $"0{digits[2..]}";
        }

        return digits.Length == 10 ? digits : "";
    }

    private static string MapPaymentMethod(string? paymentMethod) => paymentMethod switch
    {
        "BANK" => "Chuyển khoản ngân hàng",
        "COD" => "Tiền mặt khi nhận (COD)",
        _ => string.IsNullOrWhiteSpace(paymentMethod) ? "Chưa xác định" : paymentMethod
    };
}
