using ComTruaAnhBeo.Models;
using ComTruaAnhBeo.Helpers;
using ComTruaAnhBeo.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics;
using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Security.Cryptography;
using System.Text.Json;

namespace ComTruaAnhBeo.Controllers
{
    public class HomeController : Controller
    {
        private const int BankPaymentTimeoutMinutes = 10;
        private readonly ComTruaAnhBeoContext _db;
        private readonly DeliveryPricingService _deliveryPricing;

        public HomeController(ComTruaAnhBeoContext db, DeliveryPricingService deliveryPricing)
        {
            _db = db;
            _deliveryPricing = deliveryPricing;
        }

        public IActionResult Index()
        {
            return View();
        }

        [HttpGet("/api/menu")]
        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public async Task<IActionResult> Menu(CancellationToken cancellationToken)
        {
            var orderCounts = _db.CtDonHangs
                .AsNoTracking()
                .Where(detail => detail.MaCtcha == null && detail.MaDonNavigation.TrangThai != "Huy")
                .GroupBy(detail => detail.MaMon)
                .Select(group => new
                {
                    dishId = group.Key,
                    totalOrdered = group.Sum(detail => detail.SoLuong)
                });

            var dishes = await (
                from dish in _db.MonAns.AsNoTracking()
                join orderCount in orderCounts on dish.MaMon equals orderCount.dishId into dishOrderCounts
                from orderCount in dishOrderCounts.DefaultIfEmpty()
                where dish.LoaiMon == "Chinh" && dish.ConMon
                select new
                {
                    id = dish.MaMon,
                    name = dish.TenMon,
                    description = dish.MoTa,
                    imageUrl = dish.HinhAnh,
                    category = dish.DanhMuc,
                    price = dish.Gia,
                    totalOrdered = (int?)orderCount.totalOrdered ?? 0
                })
                .OrderByDescending(dish => dish.totalOrdered)
                .ThenBy(dish => dish.id)
                .ToListAsync(cancellationToken);

            return Ok(dishes.Select((dish, index) => new
            {
                dish.id,
                dish.name,
                dish.description,
                dish.imageUrl,
                dish.category,
                dish.price,
                dish.totalOrdered,
                popularRank = index < 3 && dish.totalOrdered > 0 ? index + 1 : (int?)null
            }));
        }

        [HttpGet("/api/menu/extras")]
        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public async Task<IActionResult> MenuExtras(CancellationToken cancellationToken)
        {
            var dishes = await _db.MonAns
                .AsNoTracking()
                .Where(dish => dish.LoaiMon != "Chinh" && dish.ConMon)
                .OrderBy(dish => dish.DanhMuc)
                .ThenBy(dish => dish.TenMon)
                .Select(dish => new
                {
                    id = dish.MaMon,
                    name = dish.TenMon,
                    description = dish.MoTa,
                    imageUrl = dish.HinhAnh,
                    category = dish.DanhMuc,
                    price = dish.Gia
                })
                .ToListAsync(cancellationToken);

            return Ok(dishes);
        }

        [HttpGet("/api/promotions")]
        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public async Task<IActionResult> Promotions(CancellationToken cancellationToken)
        {
            var now = DateTime.Now;
            var promotions = await _db.KhuyenMais
                .AsNoTracking()
                .Where(promotion =>
                    promotion.NgayBatDau <= now &&
                    promotion.NgayKetThuc >= now &&
                    (!promotion.TongLuotToiDa.HasValue ||
                        _db.DonHangs.Count(order =>
                            order.MaCode == promotion.MaCode &&
                            order.TrangThai != "Huy" &&
                            order.TrangThai != "DaHuy") < promotion.TongLuotToiDa.Value))
                .OrderBy(promotion => promotion.NgayKetThuc)
                .Select(promotion => new
                {
                    promotion.MaCode,
                    promotion.LoaiGiam,
                    promotion.ApDungCho,
                    promotion.GiaTri,
                    promotion.GiamToiDa,
                    promotion.DonToiThieu,
                    promotion.NgayKetThuc
                })
                .ToListAsync(cancellationToken);

            return Ok(promotions.Select(promotion =>
            {
                var type = promotion.LoaiGiam.Trim().ToUpperInvariant();
                var scope = promotion.ApDungCho.Trim().ToUpperInvariant();
                var isShippingDiscount = type is "SHIPPING" or "SHIP" or "PHISHIP" ||
                    scope is "PHISHIP" or "PHIGIAO";
                var isPercentageDiscount = type is "PERCENT" or "PHANTRAM";

                return new
                {
                    code = promotion.MaCode,
                    discountType = isShippingDiscount
                        ? "SHIPPING"
                        : isPercentageDiscount
                            ? "PERCENT"
                            : "FIXED_AMOUNT",
                    discountValue = promotion.GiaTri,
                    maxDiscount = promotion.GiamToiDa,
                    minOrderValue = promotion.DonToiThieu,
                    endDate = promotion.NgayKetThuc
                };
            }));
        }

        [HttpGet("/api/orders/{trackingCode}/payment-status")]
        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public async Task<IActionResult> GetOrderPaymentStatus(
            string trackingCode,
            CancellationToken cancellationToken)
        {
            var paymentStatus = await _db.ThanhToans
                .AsNoTracking()
                .Where(payment => payment.MaDonNavigation.MaTraCuu == trackingCode)
                .Select(payment => new
                {
                    paymentStatus = payment.TrangThai,
                    orderStatus = payment.MaDonNavigation.TrangThai,
                    paymentDeadline = payment.PhuongThuc == "BANK"
                        ? payment.MaDonNavigation.NgayDat.AddMinutes(BankPaymentTimeoutMinutes)
                        : payment.HanThanhToan
                })
                .FirstOrDefaultAsync(cancellationToken);

            if (paymentStatus is null)
            {
                return NotFound(new { message = "Không tìm thấy đơn hàng." });
            }

            return Ok(paymentStatus);
        }

        [HttpPost("/api/promotions/validate")]
        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public async Task<IActionResult> ValidatePromotion(
            [FromBody] CouponValidationRequest? request,
            CancellationToken cancellationToken)
        {
            if (request is null ||
                string.IsNullOrWhiteSpace(request.Code) ||
                string.IsNullOrWhiteSpace(request.Phone) ||
                request.Subtotal <= 0)
            {
                return BadRequest(new { message = "Vui lòng nhập mã giảm giá, số điện thoại và chọn món trước." });
            }

            var result = await CalculatePromotionDiscountAsync(
                request.Code.Trim(),
                request.Phone.Trim(),
                request.Subtotal,
                request.ShippingFee,
                cancellationToken);
            if (result.Error is not null)
            {
                return BadRequest(new { message = result.Error });
            }

            return Ok(new
            {
                code = result.Promotion!.MaCode,
                discountType = result.DiscountType,
                appliesToShipping = result.IsShippingDiscount,
                discountValue = result.Promotion.GiaTri,
                maxDiscount = result.Promotion.GiamToiDa,
                minOrderValue = result.Promotion.DonToiThieu,
                discount = result.Discount
            });
        }

        [HttpPost("/api/delivery/quote")]
        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public async Task<IActionResult> QuoteDelivery(
            [FromBody] DeliveryQuoteRequest? request,
            CancellationToken cancellationToken)
        {
            if (request is null ||
                string.IsNullOrWhiteSpace(request.Address) ||
                !TryValidateModel(request))
            {
                return BadRequest(new { message = "Vui lòng nhập địa chỉ giao hàng hợp lệ." });
            }

            try
            {
                var quote = await _deliveryPricing.GetQuoteAsync(
                    request.Address.Trim(),
                    request.Latitude,
                    request.Longitude,
                    cancellationToken);
                return Ok(new
                {
                    quoteToken = quote.QuoteToken,
                    shippingFee = quote.ShippingFee,
                    distanceKm = quote.DistanceKm,
                    currency = quote.Currency,
                    expiresAt = quote.ExpiresAt,
                    resolvedAddress = quote.ResolvedAddress,
                    latitude = quote.Latitude,
                    longitude = quote.Longitude
                });
            }
            catch (DeliveryPricingException exception)
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = exception.Message });
            }
            catch (HttpRequestException)
            {
                return StatusCode(
                    StatusCodes.Status503ServiceUnavailable,
                    new { message = "Không kết nối được dịch vụ báo giá giao hàng. Vui lòng thử lại." });
            }
            catch (JsonException)
            {
                return StatusCode(
                    StatusCodes.Status503ServiceUnavailable,
                    new { message = "Dịch vụ báo giá giao hàng trả về dữ liệu không hợp lệ. Vui lòng thử lại." });
            }
            catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
            {
                return StatusCode(
                    StatusCodes.Status503ServiceUnavailable,
                    new { message = "Dịch vụ báo giá giao hàng quá thời gian chờ. Vui lòng thử lại." });
            }
        }

        [HttpPost("/api/orders")]
        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public async Task<IActionResult> CreateOrder(
            [FromBody] CreateOrderRequest? request,
            CancellationToken cancellationToken)
        {
            if (request is null || !TryValidateModel(request))
            {
                return BadRequest(new { message = "Vui lòng kiểm tra lại thông tin đơn hàng." });
            }

            var customerName = request.CustomerName!.Trim();
            var phone = request.Phone!.Trim();
            var address = request.Address!.Trim();
            var note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();
            var paymentMethod = request.PaymentMethod!;
            var items = request.Items;

            if (items is null || items.Count is 0 or > 100 ||
                items.Any(item => item is null || item.Quantity is < 1 or > 99))
            {
                return BadRequest(new { message = "Giỏ hàng không hợp lệ. Vui lòng kiểm tra số lượng món." });
            }

            if (request.Latitude.HasValue != request.Longitude.HasValue ||
                request.Latitude is < -90 or > 90 ||
                request.Longitude is < -180 or > 180)
            {
                return BadRequest(new { message = "Vị trí giao hàng không hợp lệ." });
            }

            var quantities = items
                .GroupBy(item => item.DishId)
                .ToDictionary(group => group.Key, group => group.Sum(item => item.Quantity));
            if (quantities.Values.Any(quantity => quantity > 99))
            {
                return BadRequest(new { message = "Mỗi món chỉ được đặt tối đa 99 phần." });
            }

            var dishes = await _db.MonAns
                .AsNoTracking()
                .Where(dish => quantities.Keys.Contains(dish.MaMon) && dish.ConMon)
                .ToListAsync(cancellationToken);
            if (dishes.Count != quantities.Count)
            {
                return BadRequest(new { message = "Một hoặc nhiều món đã hết hàng. Vui lòng cập nhật giỏ hàng." });
            }

            var dishById = dishes.ToDictionary(dish => dish.MaMon);
            var subtotal = quantities.Sum(item => dishById[item.Key].Gia * item.Value);
            if (!_deliveryPricing.TryGetValidQuote(
                request.DeliveryQuoteToken,
                address,
                request.Latitude,
                request.Longitude,
                out var deliveryQuote) ||
                deliveryQuote is null)
            {
                return Conflict(new
                {
                    message = "Báo giá giao hàng đã hết hạn hoặc địa chỉ đã thay đổi. Vui lòng lấy lại báo giá."
                });
            }

            var shippingFee = deliveryQuote.ShippingFee;
            KhuyenMai? promotion = null;
            var discount = 0m;

            if (!string.IsNullOrWhiteSpace(request.CouponCode))
            {
                var promotionResult = await CalculatePromotionDiscountAsync(
                    request.CouponCode.Trim(),
                    phone,
                    subtotal,
                    shippingFee,
                    cancellationToken);
                if (promotionResult.Error is not null)
                {
                    return BadRequest(new { message = promotionResult.Error });
                }

                promotion = promotionResult.Promotion;
                discount = promotionResult.Discount;
            }

            var orderedAt = DateTime.Now;
            var paymentDeadline = paymentMethod == "BANK"
                ? orderedAt.AddMinutes(BankPaymentTimeoutMinutes)
                : (DateTime?)null;
            var order = new DonHang
            {
                MaTraCuu = $"CM{string.Concat(Enumerable.Range(0, 10).Select(
                    _ => RandomNumberGenerator.GetInt32(10).ToString(CultureInfo.InvariantCulture)))}",
                MaTk = null,
                MaCode = promotion?.MaCode,
                TenNguoiNhan = customerName,
                Sdt = phone,
                Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim(),
                DiaChiGiao = address,
                ViDo = deliveryQuote.Latitude,
                KinhDo = deliveryQuote.Longitude,
                GhiChu = note,
                TienMon = subtotal,
                TienGiam = discount,
                PhiGiaoKhach = shippingFee,
                TongTien = subtotal + shippingFee - discount,
                TrangThai = "ChoXacNhan",
                NgayDat = orderedAt
            };

            var paymentQrCode = paymentMethod == "BANK"
                ? $"data:image/png;base64,{Convert.ToBase64String(Utils.GenerateQRCodeImageBytes(
                    Utils.GenerateQRCode("MB", "0961016972", order.TongTien.ToString("0", CultureInfo.InvariantCulture), order.MaTraCuu)))}"
                : null;

            await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
            _db.DonHangs.Add(order);
            foreach (var item in quantities)
            {
                _db.CtDonHangs.Add(new CtDonHang
                {
                    MaDonNavigation = order,
                    MaMon = item.Key,
                    SoLuong = item.Value,
                    DonGia = dishById[item.Key].Gia,
                    TenSize = null,
                    GhiChu = null
                });
            }

            _db.ThanhToans.Add(new ThanhToan
            {
                MaDonNavigation = order,
                PhuongThuc = paymentMethod,
                SoTien = order.TongTien,
                TrangThai = "ChuaTT",
                HanThanhToan = paymentDeadline
            });

            await _db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            return StatusCode(StatusCodes.Status201Created, new
            {
                trackingCode = order.MaTraCuu,
                orderId = order.MaDon,
                paymentMethod,
                paymentDeadline,
                subtotal,
                shippingFee,
                discount,
                total = order.TongTien,
                deliveryDistanceKm = deliveryQuote.DistanceKm,
                paymentStatus = "ChuaTT",
                paymentQrCode
            });
        }

        private async Task<PromotionDiscountResult> CalculatePromotionDiscountAsync(
            string code,
            string phone,
            decimal subtotal,
            decimal shippingFee,
            CancellationToken cancellationToken)
        {
            var promotion = await _db.KhuyenMais
                .AsNoTracking()
                .FirstOrDefaultAsync(item => item.MaCode == code, cancellationToken);

            if (promotion is null)
            {
                return PromotionDiscountResult.Failed("Mã giảm giá không tồn tại.");
            }

            var now = DateTime.Now;
            if (now < promotion.NgayBatDau || now > promotion.NgayKetThuc)
            {
                return PromotionDiscountResult.Failed("Mã giảm giá chưa bắt đầu hoặc đã hết hạn.");
            }

            if (subtotal < promotion.DonToiThieu)
            {
                return PromotionDiscountResult.Failed(
                    $"Đơn hàng cần đạt tối thiểu {promotion.DonToiThieu:N0}đ để dùng mã này.");
            }

            if (promotion.TongLuotToiDa is int maxUses)
            {
                var usageCount = await _db.DonHangs
                    .AsNoTracking()
                    .CountAsync(
                        order => order.MaCode == promotion.MaCode &&
                            order.TrangThai != "Huy" &&
                            order.TrangThai != "DaHuy",
                        cancellationToken);
                if (usageCount >= maxUses)
                {
                    return PromotionDiscountResult.Failed("Mã giảm giá đã hết lượt sử dụng.");
                }
            }

            if (promotion.LuotToiDaMoiSdt is int maxUsesPerPhone)
            {
                var phoneUsageCount = await _db.DonHangs
                    .AsNoTracking()
                    .CountAsync(
                        order => order.MaCode == promotion.MaCode &&
                            order.Sdt == phone &&
                            order.TrangThai != "Huy" &&
                            order.TrangThai != "DaHuy",
                        cancellationToken);
                if (phoneUsageCount >= maxUsesPerPhone)
                {
                    return PromotionDiscountResult.Failed("Số điện thoại này đã dùng hết lượt áp dụng mã.");
                }
            }

            var discountType = promotion.LoaiGiam.Trim().ToUpperInvariant();
            var appliesTo = promotion.ApDungCho.Trim().ToUpperInvariant();
            var isShippingDiscount = discountType is "SHIPPING" or "SHIP" or "PHISHIP" ||
                appliesTo is "PHISHIP" or "PHIGIAO";
            var isPercentageDiscount = discountType is "PERCENT" or "PHANTRAM";
            var isFixedDiscount = discountType is "FIXED" or "FIXED_AMOUNT" or "TIENMAT" or "SOTIEN" or "AMOUNT";

            if (!isShippingDiscount && !isPercentageDiscount && !isFixedDiscount)
            {
                return PromotionDiscountResult.Failed("Mã giảm giá có loại ưu đãi chưa được hỗ trợ.");
            }

            var discountBase = isShippingDiscount ? shippingFee : subtotal;
            var discount = isPercentageDiscount
                ? Math.Floor(discountBase * promotion.GiaTri / 100m)
                : promotion.GiaTri;
            if (promotion.GiamToiDa is decimal maxDiscount && maxDiscount > 0)
            {
                discount = Math.Min(discount, maxDiscount);
            }

            discount = Math.Min(discount, discountBase);
            if (discount <= 0)
            {
                return PromotionDiscountResult.Failed("Mã giảm giá không áp dụng được cho đơn hàng này.");
            }

            return new PromotionDiscountResult(
                promotion,
                discount,
                isPercentageDiscount ? "PERCENT" : isShippingDiscount ? "SHIPPING" : "FIXED_AMOUNT",
                isShippingDiscount,
                null);
        }

        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }

    }
}

public sealed record CouponValidationRequest(
    string? Code,
    string? Phone,
    decimal Subtotal,
    decimal ShippingFee = 0);

public sealed class DeliveryQuoteRequest
{
    [Required, StringLength(255)]
    public string? Address { get; init; }

    public double? Latitude { get; init; }

    public double? Longitude { get; init; }
}

public sealed class CreateOrderRequest
{
    [Required, StringLength(100)]
    public string? CustomerName { get; init; }

    [Required, RegularExpression(@"^0[0-9]{9}$")]
    public string? Phone { get; init; }

    [EmailAddress, StringLength(150)]
    public string? Email { get; init; }

    [Required, StringLength(255)]
    public string? Address { get; init; }

    [StringLength(500)]
    public string? Note { get; init; }

    [Required, RegularExpression("^(BANK|COD)$")]
    public string? PaymentMethod { get; init; }

    [MinLength(1)]
    public List<CreateOrderItemRequest>? Items { get; init; }

    [StringLength(30)]
    public string? CouponCode { get; init; }

    [Required, StringLength(64)]
    public string? DeliveryQuoteToken { get; init; }

    public double? Latitude { get; init; }

    public double? Longitude { get; init; }
}

public sealed class CreateOrderItemRequest
{
    [Range(1, int.MaxValue)]
    public int DishId { get; init; }

    [Range(1, 99)]
    public int Quantity { get; init; }
}

internal sealed record PromotionDiscountResult(
    KhuyenMai? Promotion,
    decimal Discount,
    string? DiscountType,
    bool IsShippingDiscount,
    string? Error)
{
    public static PromotionDiscountResult Failed(string message) =>
        new(null, 0, null, false, message);
}
