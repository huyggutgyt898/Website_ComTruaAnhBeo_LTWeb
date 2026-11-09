using ComTruaAnhBeo.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ComTruaAnhBeo.Controllers;

/// <summary>
/// API cho trang Admin: Quản lý tài khoản website (khách hàng).
/// Chỉ thao tác trên tài khoản có VaiTro = KhachHang, không đụng tới tài khoản Admin.
/// </summary>
[Route("admin/api/accounts")]
[Authorize(Roles = AdminController.AdminRole)]
[ApiController]
public sealed class AdminAccountsController : ControllerBase
{
    private const string CustomerRole = "KhachHang";
    private const int MaxOrdersInDetail = 20;
    private const int MaxDeliveryAddresses = 5;

    private readonly ComTruaAnhBeoContext _db;

    public AdminAccountsController(ComTruaAnhBeoContext db)
    {
        _db = db;
    }

    // GET /admin/api/accounts
    [HttpGet("")]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public async Task<IActionResult> List()
    {
        var rows = await _db.TaiKhoans
            .AsNoTracking()
            .Where(a => a.VaiTro == CustomerRole)
            .OrderByDescending(a => a.MaTk)
            .Select(a => new
            {
                a.MaTk,
                a.HoTen,
                a.Sdt,
                a.Email,
                a.HoatDong
            })
            .ToListAsync();

        var accounts = rows.Select(a => new
        {
            id = a.MaTk.ToString(),
            fullName = a.HoTen,
            phone = a.Sdt,
            email = a.Email,
            status = ToStatus(a.HoatDong),
            // Bảng TAI_KHOAN không có cột ngày tạo nên chưa có dữ liệu "Ngày tham gia".
            createdAt = (DateTime?)null
        });

        return Ok(new { accounts });
    }

    // GET /admin/api/accounts/{id}
    [HttpGet("{id:int}")]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public async Task<IActionResult> Detail(int id)
    {
        var account = await _db.TaiKhoans
            .AsNoTracking()
            .Where(a => a.MaTk == id && a.VaiTro == CustomerRole)
            .Select(a => new { a.MaTk, a.DiaChi })
            .FirstOrDefaultAsync();

        if (account is null)
        {
            return NotFound(new { message = "Không tìm thấy tài khoản khách hàng." });
        }

        var orderRows = await _db.DonHangs
            .AsNoTracking()
            .Where(o => o.MaTk == id)
            .OrderByDescending(o => o.NgayDat)
            .Select(o => new
            {
                o.MaTraCuu,
                o.NgayDat,
                o.TongTien,
                o.TrangThai,
                o.DiaChiGiao
            })
            .ToListAsync();

        var addresses = new List<object>();

        if (!string.IsNullOrWhiteSpace(account.DiaChi))
        {
            addresses.Add(new
            {
                label = "Địa chỉ tài khoản",
                address = account.DiaChi,
                isDefault = true,
                note = ""
            });
        }

        var deliveredTo = orderRows
            .Select(o => o.DiaChiGiao)
            .Where(a => !string.IsNullOrWhiteSpace(a))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Where(a => !string.Equals(a, account.DiaChi, StringComparison.OrdinalIgnoreCase))
            .Take(MaxDeliveryAddresses);

        foreach (var address in deliveredTo)
        {
            addresses.Add(new
            {
                label = "Từng giao hàng",
                address,
                isDefault = false,
                note = ""
            });
        }

        var orders = orderRows
            .Take(MaxOrdersInDetail)
            .Select(o => new
            {
                orderId = o.MaTraCuu,
                date = o.NgayDat.ToString("dd/MM/yyyy"),
                total = o.TongTien,
                status = o.TrangThai
            });

        return Ok(new
        {
            id = account.MaTk.ToString(),
            addresses,
            orders,
            totalOrders = orderRows.Count
        });
    }

    // POST /admin/api/accounts/{id}/lock
    [HttpPost("{id:int}/lock")]
    [ValidateAntiForgeryToken]
    public Task<IActionResult> Lock(int id) => SetActiveAsync(id, false);

    // POST /admin/api/accounts/{id}/unlock
    [HttpPost("{id:int}/unlock")]
    [ValidateAntiForgeryToken]
    public Task<IActionResult> Unlock(int id) => SetActiveAsync(id, true);

    private async Task<IActionResult> SetActiveAsync(int id, bool active)
    {
        var account = await _db.TaiKhoans
            .FirstOrDefaultAsync(a => a.MaTk == id && a.VaiTro == CustomerRole);

        if (account is null)
        {
            return NotFound(new { message = "Không tìm thấy tài khoản khách hàng." });
        }

        account.HoatDong = active;
        await _db.SaveChangesAsync();

        return Ok(new { id = account.MaTk.ToString(), status = ToStatus(account.HoatDong) });
    }

    private static string ToStatus(bool active) => active ? "ACTIVE" : "LOCKED";
}