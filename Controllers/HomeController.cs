using ComTruaAnhBeo.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics;
using System.ComponentModel.DataAnnotations;
using System.Security.Cryptography;

namespace ComTruaAnhBeo.Controllers
{
    public class HomeController : Controller
    {
        private const decimal ShippingFee = 20_000m;
        private readonly ComTruaAnhBeoContext _db;

        public HomeController(ComTruaAnhBeoContext db)
        {
            _db = db;
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
            var shippingFee = quantities.Count > 0 ? ShippingFee : 0m;
            KhuyenMai? promotion = null;
            var discount = 0m;

            if (!string.IsNullOrWhiteSpace(request.CouponCode))
            {
                var promotionResult = await CalculatePromotionDiscountAsync(
                    request.CouponCode.Trim(),
                    phone,
                    subtotal,
                    cancellationToken);
                if (promotionResult.Error is not null)
                {
                    return BadRequest(new { message = promotionResult.Error });
                }

                promotion = promotionResult.Promotion;
                discount = promotionResult.Discount;
            }

            var order = new DonHang
            {
                MaTraCuu = Convert.ToHexString(RandomNumberGenerator.GetBytes(6)),
                MaTk = null,
                MaCode = promotion?.MaCode,
                TenNguoiNhan = customerName,
                Sdt = phone,
                Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim(),
                DiaChiGiao = address,
                ViDo = request.Latitude ?? 0,
                KinhDo = request.Longitude ?? 0,
                GhiChu = note,
                TienMon = subtotal,
                TienGiam = discount,
                PhiGiaoKhach = shippingFee,
                TongTien = subtotal + shippingFee - discount,
                TrangThai = "ChoXacNhan",
                NgayDat = DateTime.Now
            };

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
                TrangThai = "ChuaTT"
            });

            await _db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            return StatusCode(StatusCodes.Status201Created, new
            {
                trackingCode = order.MaTraCuu,
                orderId = order.MaDon,
                paymentMethod,
                subtotal,
                shippingFee,
                discount,
                total = order.TongTien,
                paymentStatus = "ChuaTT"
            });
        }

        private async Task<PromotionDiscountResult> CalculatePromotionDiscountAsync(
            string code,
            string phone,
            decimal subtotal,
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
                    .CountAsync(order => order.MaCode == promotion.MaCode && order.TrangThai != "Huy", cancellationToken);
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
                            order.TrangThai != "Huy",
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
            var isFixedDiscount = discountType is "FIXED" or "FIXED_AMOUNT" or "TIENMAT" or "AMOUNT";

            if (!isShippingDiscount && !isPercentageDiscount && !isFixedDiscount)
            {
                return PromotionDiscountResult.Failed("Mã giảm giá có loại ưu đãi chưa được hỗ trợ.");
            }

            var discountBase = isShippingDiscount ? ShippingFee : subtotal;
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

public sealed record CouponValidationRequest(string? Code, string? Phone, decimal Subtotal);

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

    [Required, RegularExpression("^(MOMO|COD|WALLET)$")]
    public string? PaymentMethod { get; init; }

    [MinLength(1)]
    public List<CreateOrderItemRequest>? Items { get; init; }

    [StringLength(30)]
    public string? CouponCode { get; init; }

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
