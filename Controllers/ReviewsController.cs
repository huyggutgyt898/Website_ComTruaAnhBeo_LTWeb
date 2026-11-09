using System.Security.Claims;
using ComTruaAnhBeo.Models;
using ComTruaAnhBeo.Models.Reviews;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ComTruaAnhBeo.Controllers;

/// <summary>
/// Đánh giá quán dành cho khách hàng.
/// GET /reviews: ai cũng xem được. POST /reviews: chỉ khách đã đăng nhập.
/// </summary>
[Route("reviews")]
[ApiController]
public sealed class ReviewsController : ControllerBase
{
    private const string CustomerRole = "KhachHang";
    private const int DefaultPageSize = 10;
    private const int MaxPageSize = 20;

    // Giới hạn chống spam: Tối đa MaxReviewsPerWindow đánh giá trong khoảng thời gian ReviewWindow
    private const int MaxReviewsPerWindow = 10;
    private static readonly TimeSpan ReviewWindow = TimeSpan.FromHours(24);

    private readonly ComTruaAnhBeoContext _db;

    public ReviewsController(ComTruaAnhBeoContext db)
    {
        _db = db;
    }

    // GET /reviews?skip=0&take=10
    [HttpGet("")]
    [AllowAnonymous]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public async Task<IActionResult> List(int skip = 0, int take = DefaultPageSize)
    {
        skip = Math.Max(skip, 0);
        take = Math.Clamp(take, 1, MaxPageSize);

        var starCounts = await _db.DanhGia
            .AsNoTracking()
            .GroupBy(r => r.SoSao)
            .Select(g => new { Stars = (int)g.Key, Count = g.Count() })
            .ToListAsync();

        var total = starCounts.Sum(x => x.Count);
        var average = total > 0
            ? Math.Round(starCounts.Sum(x => (decimal)x.Stars * x.Count) / total, 1)
            : 0m;

        var distribution = Enumerable.Range(1, 5)
            .ToDictionary(
                s => s.ToString(),
                s => starCounts.FirstOrDefault(x => x.Stars == s)?.Count ?? 0);

        // Lấy dư 1 dòng để biết còn trang sau hay không
        var rows = await _db.DanhGia
            .AsNoTracking()
            .OrderByDescending(r => r.NgayDg)
            .ThenByDescending(r => r.MaDg)
            .Skip(skip)
            .Take(take + 1)
            .Select(r => new
            {
                r.MaDg,
                Name = r.MaTkNavigation.HoTen,
                r.SoSao,
                r.NhanXet,
                r.NgayDg
            })
            .ToListAsync();

        var items = rows
            .Take(take)
            .Select(r => new
            {
                id = r.MaDg,
                name = DisplayName(r.Name),
                stars = (int)r.SoSao,
                comment = r.NhanXet ?? "",
                date = r.NgayDg.ToString("dd/MM/yyyy")
            });

        return Ok(new
        {
            summary = new { average, total, distribution },
            items,
            hasMore = rows.Count > take
        });
    }

    // POST /reviews  { "stars": 5, "comment": "Cơm ngon" }
    [HttpPost("")]
    [Authorize(Roles = CustomerRole)]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create([FromBody] CreateReviewRequest request)
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var accountId))
        {
            return Unauthorized(new { message = "Vui lòng đăng nhập để gửi đánh giá." });
        }

        var accountActive = await _db.TaiKhoans
            .AsNoTracking()
            .AnyAsync(a => a.MaTk == accountId && a.VaiTro == CustomerRole && a.HoatDong);

        if (!accountActive)
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Unauthorized(new { message = "Tài khoản không còn hoạt động. Vui lòng đăng nhập lại." });
        }

        // Kiểm tra giới hạn số lượng đánh giá trong 24 giờ
        var since = DateTime.Now - ReviewWindow;
        var recentCount = await _db.DanhGia.CountAsync(r => r.MaTk == accountId && r.NgayDg >= since);
        if (recentCount >= MaxReviewsPerWindow)
        {
            return StatusCode(StatusCodes.Status429TooManyRequests, new
            {
                message = $"Bạn đã gửi tối đa {MaxReviewsPerWindow} đánh giá trong 24 giờ qua. Cảm ơn bạn, vui lòng quay lại sau nhé!"
            });
        }

        var comment = request.Comment?.Trim();

        _db.DanhGia.Add(new DanhGia
        {
            MaTk = accountId,
            SoSao = (byte)request.Stars,
            NhanXet = string.IsNullOrEmpty(comment) ? null : comment
            // NgayDg: để cột mặc định của DB (sysdatetime) tự điền
        });
        await _db.SaveChangesAsync();

        return Ok(new { message = "Cảm ơn bạn đã gửi đánh giá!" });
    }

    // Hiển thị đầy đủ tên người đánh giá; chuẩn hóa khoảng trắng, nếu trống thì dùng "Khách hàng"
    private static string DisplayName(string? fullName)
    {
        var parts = (fullName ?? string.Empty)
            .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        return parts.Length == 0 ? "Khách hàng" : string.Join(' ', parts);
    }
}