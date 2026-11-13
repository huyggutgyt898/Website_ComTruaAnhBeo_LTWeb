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
using System.Security.Cryptography;
using System.ComponentModel.DataAnnotations;
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
    private readonly IWebHostEnvironment _environment;

    public AdminController(
        ComTruaAnhBeoContext db,
        IPasswordHasher<TaiKhoan> passwordHasher,
        DeliveryPricingService deliveryPricing,
        ILogger<AdminController> logger,
        IWebHostEnvironment environment)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _deliveryPricing = deliveryPricing;
        _logger = logger;
        _environment = environment;
    }

    [HttpGet("")]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Index() => RedirectToAction(nameof(Orders));

    [HttpGet("products")]
    public IActionResult Products()
    {
        return View();
    }

    [HttpGet("api/products")]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public async Task<IActionResult> GetProductsApi(CancellationToken cancellationToken)
    {
        var products = await _db.MonAns
            .AsNoTracking()
            .OrderBy(dish => dish.MaMon)
            .Select(dish => new
            {
                rawId = dish.MaMon,
                name = dish.TenMon,
                category = dish.DanhMuc,
                price = dish.Gia,
                desc = dish.MoTa ?? "",
                image = dish.HinhAnh,
                available = dish.ConMon
            })
            .ToListAsync(cancellationToken);

        return Ok(products.Select(dish => new
        {
            id = $"MON-{dish.rawId:D3}",
            dish.rawId,
            dish.name,
            dish.category,
            dish.price,
            dish.desc,
            image = string.IsNullOrWhiteSpace(dish.image) ? "/images/thumb_suon.jpg" : dish.image,
            dish.available,
            visible = true
        }));
    }

    [HttpPost("api/products/save")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> SaveProductApi(
        [FromBody] DishUpsertRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null || !TryValidateModel(request))
        {
            return BadRequest(new { message = "Vui lòng kiểm tra lại thông tin món ăn." });
        }

        var name = request.Name.Trim();
        var category = request.Category.Trim();
        var duplicateName = await _db.MonAns.AnyAsync(
            dish => dish.TenMon == name && dish.MaMon != request.Id,
            cancellationToken);
        if (duplicateName)
        {
            return Conflict(new { message = "Tên món ăn này đã tồn tại." });
        }

        MonAn? dish;
        if (request.Id == 0)
        {
            dish = new MonAn();
            _db.MonAns.Add(dish);
        }
        else
        {
            dish = await _db.MonAns.FirstOrDefaultAsync(
                item => item.MaMon == request.Id,
                cancellationToken);
            if (dish is null)
            {
                return NotFound(new { message = "Không tìm thấy món ăn cần cập nhật." });
            }
        }

        dish.TenMon = name;
        dish.DanhMuc = category;
        dish.LoaiMon = category.StartsWith("Canh", StringComparison.OrdinalIgnoreCase) ? "Phu" : "Chinh";
        dish.Gia = request.Price;
        dish.MoTa = request.Desc?.Trim() ?? "";
        dish.HinhAnh = string.IsNullOrWhiteSpace(request.Image)
            ? "/images/thumb_suon.jpg"
            : request.Image.Trim();
        dish.ConMon = request.Available;

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception)
        {
            _logger.LogError(exception, "Unable to save product {ProductId}.", request.Id);
            return Conflict(new { message = "Không thể lưu món ăn. Vui lòng kiểm tra tên món và thử lại." });
        }

        return Ok(new
        {
            success = true,
            message = request.Id == 0 ? "Đã thêm món ăn." : "Đã cập nhật món ăn.",
            newId = dish.MaMon
        });
    }

    [HttpPost("api/products/images")]
    [ValidateAntiForgeryToken]
    [RequestSizeLimit(3_200_000)]
    public async Task<IActionResult> UploadProductImage(
        [FromForm] IFormFile? image,
        CancellationToken cancellationToken)
    {
        if (image is null || image.Length == 0 || image.Length > 3_000_000)
        {
            return BadRequest(new { message = "Ảnh phải có dung lượng từ 1 byte đến 3 MB." });
        }

        var extension = image.ContentType.ToLowerInvariant() switch
        {
            "image/jpeg" => ".jpg",
            "image/png" => ".png",
            "image/webp" => ".webp",
            _ => null
        };
        if (extension is null)
        {
            return BadRequest(new { message = "Chỉ chấp nhận ảnh JPG, PNG hoặc WebP." });
        }

        await using var source = image.OpenReadStream();
        var header = new byte[12];
        var headerLength = await source.ReadAsync(header, cancellationToken);
        var isValidImage = extension switch
        {
            ".jpg" => headerLength >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF,
            ".png" => headerLength >= 8 &&
                header.AsSpan(0, 8).SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }),
            ".webp" => headerLength >= 12 &&
                header.AsSpan(0, 4).SequenceEqual("RIFF"u8) &&
                header.AsSpan(8, 4).SequenceEqual("WEBP"u8),
            _ => false
        };
        if (!isValidImage)
        {
            return BadRequest(new { message = "Tệp không phải ảnh hợp lệ hoặc phần mở rộng không khớp." });
        }

        source.Position = 0;
        var webRoot = _environment.WebRootPath ?? Path.Combine(_environment.ContentRootPath, "wwwroot");
        var uploadDirectory = Path.Combine(webRoot, "uploads", "dishes");
        Directory.CreateDirectory(uploadDirectory);
        var fileName = $"{Convert.ToHexStringLower(RandomNumberGenerator.GetBytes(16))}{extension}";
        var filePath = Path.Combine(uploadDirectory, fileName);

        await using (var destination = new FileStream(
            filePath,
            FileMode.CreateNew,
            FileAccess.Write,
            FileShare.None,
            bufferSize: 81920,
            useAsync: true))
        {
            await source.CopyToAsync(destination, cancellationToken);
        }

        return Ok(new { imageUrl = $"/uploads/dishes/{fileName}" });
    }

    [HttpPost("api/products/toggle-status/{id:int}")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> ToggleProductStatus(int id, CancellationToken cancellationToken)
    {
        var dish = await _db.MonAns.FirstOrDefaultAsync(item => item.MaMon == id, cancellationToken);
        if (dish is null)
        {
            return NotFound(new { message = "Không tìm thấy món ăn." });
        }

        dish.ConMon = !dish.ConMon;
        await _db.SaveChangesAsync(cancellationToken);
        return Ok(new { success = true, available = dish.ConMon });
    }

    [HttpPost("api/products/delete/{id:int}")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteProduct(int id, CancellationToken cancellationToken)
    {
        var dish = await _db.MonAns.FirstOrDefaultAsync(item => item.MaMon == id, cancellationToken);
        if (dish is null)
        {
            return NotFound(new { message = "Không tìm thấy món ăn." });
        }

        var hasOrderHistory = await _db.CtDonHangs.AnyAsync(
            detail => detail.MaMon == id,
            cancellationToken);
        if (hasOrderHistory)
        {
            dish.ConMon = false;
            await _db.SaveChangesAsync(cancellationToken);
            return Ok(new
            {
                success = true,
                message = "Món đã có trong đơn hàng cũ nên được chuyển sang trạng thái hết món."
            });
        }

        _db.MonAns.Remove(dish);
        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception)
        {
            _logger.LogError(exception, "Unable to delete product {ProductId}.", id);
            return Conflict(new { message = "Không thể xóa món ăn đang được dữ liệu khác sử dụng." });
        }

        return Ok(new { success = true, message = "Đã xóa món ăn." });
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
    public async Task<IActionResult> ConfirmOrder(
        int orderId,
        CancellationToken cancellationToken,
        [FromQuery] bool simulateDelivery = false)
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
        if (!simulateDelivery)
        {
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
        }

        return Ok(new
        {
            status = MapOrderStatus(order.TrangThai),
            statusLabel = GetOrderStatusLabel(order.TrangThai),
            dispatchError,
            deliveryOrderId = simulateDelivery ? null : order.VanChuyen?.LalamoveOrderId,
            deliveryStatus = simulateDelivery || order.VanChuyen is null
                ? null
                : GetDeliveryStatusLabel(order.VanChuyen.TrangThai)
        });
    }

    [HttpPost("api/orders/{orderId:int}/cancel")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> CancelOrder(
        int orderId,
        [FromBody] CancelOrderRequest? request,
        CancellationToken cancellationToken)
    {
        var reason = request?.Reason?.Trim();
        var details = request?.Details?.Trim();
        if (string.IsNullOrWhiteSpace(reason))
        {
            return BadRequest(new { message = "Vui lòng chọn lý do hủy đơn hàng." });
        }

        var cancellationReason = string.IsNullOrWhiteSpace(details)
            ? reason
            : $"{reason}: {details}";
        if (cancellationReason.Length > 255)
        {
            return BadRequest(new { message = "Lý do hủy đơn không được vượt quá 255 ký tự." });
        }

        var updatedCount = await _db.DonHangs
            .Where(order => order.MaDon == orderId && order.TrangThai == "ChoXacNhan")
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(order => order.TrangThai, "DaHuy")
                    .SetProperty(order => order.LyDoHuy, cancellationReason),
                cancellationToken);
        if (updatedCount == 0)
        {
            var orderExists = await _db.DonHangs
                .AnyAsync(order => order.MaDon == orderId, cancellationToken);
            return orderExists
                ? Conflict(new { message = "Chỉ có thể hủy đơn trước khi quán xác nhận. Vui lòng tải lại danh sách." })
                : NotFound(new { message = "Không tìm thấy đơn hàng." });
        }

        return Ok(new { status = "CANCELED" });
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

    [HttpPost("api/orders/{orderId:int}/delivery/simulate-complete")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> CompleteSimulatedDelivery(int orderId, CancellationToken cancellationToken)
    {
        var updatedCount = await _db.DonHangs
            .Where(order =>
                order.MaDon == orderId &&
                (order.TrangThai == "DangGiao" ||
                 order.TrangThai == "DangChuanBi" ||
                 order.TrangThai == "ThatBai"))
            .ExecuteUpdateAsync(
                setters => setters.SetProperty(order => order.TrangThai, "HoanThanh"),
                cancellationToken);

        if (updatedCount == 0)
        {
            var currentStatus = await _db.DonHangs
                .Where(order => order.MaDon == orderId)
                .Select(order => order.TrangThai)
                .FirstOrDefaultAsync(cancellationToken);
            if (currentStatus is null)
            {
                return NotFound(new { message = "Không tìm thấy đơn hàng." });
            }

            if (currentStatus != "HoanThanh")
            {
                return Conflict(new { message = "Đơn hàng không còn ở trạng thái có thể hoàn tất mô phỏng." });
            }
        }

        return Ok(new { status = "COMPLETED", statusLabel = "Giao thành công" });
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

    [HttpGet("api/promotions")]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public async Task<IActionResult> PromotionData(CancellationToken cancellationToken)
    {
        var promotions = await _db.KhuyenMais
            .AsNoTracking()
            .OrderBy(promotion => promotion.MaCode)
            .Select(promotion => new
            {
                promotion.MaCode,
                promotion.ApDungCho,
                promotion.LoaiGiam,
                promotion.GiaTri,
                promotion.GiamToiDa,
                promotion.DonToiThieu,
                promotion.NgayBatDau,
                promotion.NgayKetThuc,
                promotion.TongLuotToiDa,
                promotion.LuotToiDaMoiSdt,
                UsageCount = _db.DonHangs.Count(order =>
                    order.MaCode == promotion.MaCode &&
                    order.TrangThai != "Huy" &&
                    order.TrangThai != "DaHuy")
            })
            .ToListAsync(cancellationToken);

        return Ok(promotions.Select(promotion => new
        {
            id = promotion.MaCode,
            code = promotion.MaCode,
            discountType = MapPromotionType(promotion.LoaiGiam, promotion.ApDungCho),
            discountValue = promotion.GiaTri,
            maxDiscount = promotion.GiamToiDa,
            minOrderValue = promotion.DonToiThieu,
            startDate = promotion.NgayBatDau,
            endDate = promotion.NgayKetThuc,
            usageCount = promotion.UsageCount,
            maxUsage = promotion.TongLuotToiDa,
            perCustomerLimit = promotion.LuotToiDaMoiSdt
        }));
    }

    [HttpPost("api/promotions")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> CreatePromotion(
        [FromBody] PromotionUpsertRequest? request,
        CancellationToken cancellationToken)
    {
        var validationError = ValidatePromotionRequest(request);
        if (validationError is not null)
        {
            return BadRequest(new { message = validationError });
        }

        var code = request!.Code.Trim().ToUpperInvariant();
        if (await _db.KhuyenMais.AnyAsync(promotion => promotion.MaCode == code, cancellationToken))
        {
            return Conflict(new { message = $"Mã voucher {code} đã tồn tại." });
        }

        var promotion = new KhuyenMai
        {
            MaCode = code,
            LoaiGiam = ToStoredPromotionType(request.DiscountType),
            GiaTri = request.DiscountValue,
            GiamToiDa = request.MaxDiscount,
            DonToiThieu = request.MinOrderValue,
            ApDungCho = ToStoredPromotionScope(request.DiscountType),
            NgayBatDau = request.StartDate!.Value,
            NgayKetThuc = request.EndDate!.Value,
            TongLuotToiDa = request.MaxUsage,
            LuotToiDaMoiSdt = request.PerCustomerLimit
        };

        _db.KhuyenMais.Add(promotion);
        await _db.SaveChangesAsync(cancellationToken);

        return StatusCode(StatusCodes.Status201Created, new { code });
    }

    [HttpPut("api/promotions/{code}")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> UpdatePromotion(
        string code,
        [FromBody] PromotionUpsertRequest? request,
        CancellationToken cancellationToken)
    {
        var validationError = ValidatePromotionRequest(request);
        if (validationError is not null)
        {
            return BadRequest(new { message = validationError });
        }

        var normalizedCode = code.Trim().ToUpperInvariant();
        if (!string.Equals(request!.Code.Trim(), normalizedCode, StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Không thể đổi mã voucher sau khi tạo." });
        }

        var promotion = await _db.KhuyenMais
            .FirstOrDefaultAsync(item => item.MaCode == normalizedCode, cancellationToken);
        if (promotion is null)
        {
            return NotFound(new { message = "Không tìm thấy mã khuyến mãi." });
        }

        promotion.LoaiGiam = ToStoredPromotionType(request.DiscountType);
        promotion.GiaTri = request.DiscountValue;
        promotion.GiamToiDa = request.MaxDiscount;
        promotion.DonToiThieu = request.MinOrderValue;
        promotion.ApDungCho = ToStoredPromotionScope(request.DiscountType);
        promotion.NgayBatDau = request.StartDate!.Value;
        promotion.NgayKetThuc = request.EndDate!.Value;
        promotion.TongLuotToiDa = request.MaxUsage;
        promotion.LuotToiDaMoiSdt = request.PerCustomerLimit;

        await _db.SaveChangesAsync(cancellationToken);
        return Ok(new { code = normalizedCode });
    }

    private string? ValidatePromotionRequest(PromotionUpsertRequest? request)
    {
        if (request is null)
        {
            return "Dữ liệu khuyến mãi không hợp lệ.";
        }

        if (!TryValidateModel(request))
        {
            return ModelState.Values
                .SelectMany(value => value.Errors)
                .Select(error => error.ErrorMessage)
                .FirstOrDefault(message => !string.IsNullOrWhiteSpace(message))
                ?? "Vui lòng kiểm tra lại thông tin khuyến mãi.";
        }

        if (request.DiscountValue != decimal.Truncate(request.DiscountValue) ||
            request.MinOrderValue != decimal.Truncate(request.MinOrderValue) ||
            (request.MaxDiscount is decimal maxDiscountValue &&
                maxDiscountValue != decimal.Truncate(maxDiscountValue)))
        {
            return "Các mức tiền và phần trăm phải là số nguyên.";
        }

        if (request.DiscountType == "PERCENT" &&
            request.DiscountValue > 100)
        {
            return "Mức giảm theo phần trăm không được vượt quá 100%.";
        }

        if (request.MaxDiscount is <= 0)
        {
            return "Mức giảm tối đa phải lớn hơn 0 hoặc để trống nếu không giới hạn.";
        }

        if (request.StartDate >= request.EndDate)
        {
            return "Thời điểm kết thúc phải sau thời điểm bắt đầu.";
        }

        return null;
    }

    private static string ToStoredPromotionType(string type) => type switch
    {
        "PERCENT" => "PhanTram",
        "FIXED_AMOUNT" or "SHIPPING" => "SoTien",
        _ => throw new ArgumentOutOfRangeException(nameof(type), type, "Unsupported promotion type.")
    };

    private static string ToStoredPromotionScope(string type) =>
        type == "SHIPPING" ? "PhiGiao" : "TienMon";

    private static string MapPromotionType(string type, string appliesTo)
    {
        if (type.Trim().Equals("SHIPPING", StringComparison.OrdinalIgnoreCase) ||
            appliesTo.Trim().Equals("PHISHIP", StringComparison.OrdinalIgnoreCase) ||
            appliesTo.Trim().Equals("PHIGIAO", StringComparison.OrdinalIgnoreCase))
        {
            return "SHIPPING";
        }

        return type.Trim().Equals("PERCENT", StringComparison.OrdinalIgnoreCase) ||
            type.Trim().Equals("PHANTRAM", StringComparison.OrdinalIgnoreCase)
            ? "PERCENT"
            : "FIXED_AMOUNT";
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

        var delivery = order.VanChuyen;
        if (delivery is null)
        {
            delivery = new VanChuyen
            {
                MaDon = order.MaDon,
                PhiThucTe = 0
            };
            _db.VanChuyens.Add(delivery);
            order.VanChuyen = delivery;
        }

        delivery.LalamoveOrderId = dispatch.OrderId;
        delivery.LinkTheoDoi = dispatch.TrackingUrl ?? "";
        delivery.TenTaiXe = dispatch.DriverName ?? "";
        delivery.SdttaiXe = NormalizeDriverPhone(dispatch.DriverPhone);
        delivery.TrangThai = "TimTaiXe";
        ApplyDeliveryStatus(order, delivery, dispatch.Status);
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

public sealed record CancelOrderRequest(string? Reason, string? Details);

public sealed class PromotionUpsertRequest
{
    [Required, StringLength(30), RegularExpression(@"^[A-Za-z0-9_-]+$")]
    public string Code { get; init; } = "";

    [Required, RegularExpression("^(PERCENT|FIXED_AMOUNT|SHIPPING)$")]
    public string DiscountType { get; init; } = "";

    [Range(typeof(decimal), "1", "999999999999")]
    public decimal DiscountValue { get; init; }

    [Range(typeof(decimal), "1", "999999999999")]
    public decimal? MaxDiscount { get; init; }

    [Range(typeof(decimal), "0", "999999999999")]
    public decimal MinOrderValue { get; init; }

    [Required]
    public DateTime? StartDate { get; init; }

    [Required]
    public DateTime? EndDate { get; init; }

    [Range(1, int.MaxValue)]
    public int? MaxUsage { get; init; }

    [Range(1, int.MaxValue)]
    public int? PerCustomerLimit { get; init; }

}

public sealed class DishUpsertRequest
{
    [Range(0, int.MaxValue)]
    public int Id { get; init; }

    [Required, StringLength(100)]
    public string Name { get; init; } = "";

    [Required, StringLength(50)]
    public string Category { get; init; } = "";

    [Range(typeof(decimal), "0", "999999999999")]
    public decimal Price { get; init; }

    [StringLength(500)]
    public string? Desc { get; init; }

    [StringLength(255)]
    public string? Image { get; init; }

    public bool Available { get; init; }
}
