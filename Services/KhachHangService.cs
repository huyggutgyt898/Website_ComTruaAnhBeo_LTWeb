using ComTruaAnhBeo.Models;
using ComTruaAnhBeo.Responses;
using Microsoft.EntityFrameworkCore;

namespace ComTruaAnhBeo.Services;

public sealed class KhachHangService : IKhachHangService
{
    public const string RoleKhachHang = "KhachHang";
    private const int MaxPageSize = 100;
    private const int DefaultPageSize = 10;

    private readonly ComTruaAnhBeoContext _db;
    private readonly ILogger<KhachHangService> _logger;

    public KhachHangService(ComTruaAnhBeoContext db, ILogger<KhachHangService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<DanhSachKhachHangResponse> LayDanhSachKhachHangAsync(
        string? keyword = null,
        int page = 1,
        int pageSize = DefaultPageSize,
        CancellationToken ct = default)
    {
        // Chuẩn hóa phân trang
        int validPage = Math.Max(1, page);
        int validPageSize = pageSize switch
        {
            <= 0 => DefaultPageSize,
            > MaxPageSize => MaxPageSize,
            _ => pageSize
        };

        // Chỉ lấy tài khoản khách hàng, tuyệt đối không lấy tài khoản Admin
        var query = _db.TaiKhoans
            .AsNoTracking()
            .Where(t => t.VaiTro == RoleKhachHang);

        // Tìm kiếm gần đúng an toàn theo Họ tên, SĐT hoặc Email
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            string kw = keyword.Trim();
            string pattern = $"%{kw}%";
            query = query.Where(t =>
                EF.Functions.Like(t.HoTen, pattern) ||
                EF.Functions.Like(t.Sdt, pattern) ||
                EF.Functions.Like(t.Email, pattern));
        }

        int totalItems = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(t => t.MaTk)
            .Skip((validPage - 1) * validPageSize)
            .Take(validPageSize)
            .Select(t => new KhachHangResponse
            {
                MaTk = t.MaTk,
                HoTen = t.HoTen ?? string.Empty,
                Email = t.Email ?? string.Empty,
                Sdt = t.Sdt ?? string.Empty,
                DiaChi = t.DiaChi ?? string.Empty,
                HoatDong = t.HoatDong
            })
            .ToListAsync(ct);

        return new DanhSachKhachHangResponse
        {
            Items = items,
            TotalItems = totalItems,
            Page = validPage,
            PageSize = validPageSize
        };
    }

    public async Task<ChiTietKhachHangResponse?> LayChiTietKhachHangAsync(
        int maTk,
        CancellationToken ct = default)
    {
        // Chỉ lấy khách hàng theo mã tài khoản, loại trừ mọi tài khoản Admin
        var account = await _db.TaiKhoans
            .AsNoTracking()
            .Where(t => t.MaTk == maTk && t.VaiTro == RoleKhachHang)
            .Select(t => new ChiTietKhachHangResponse
            {
                MaTk = t.MaTk,
                HoTen = t.HoTen ?? string.Empty,
                Email = t.Email ?? string.Empty,
                Sdt = t.Sdt ?? string.Empty,
                DiaChi = t.DiaChi ?? string.Empty,
                HoatDong = t.HoatDong
            })
            .FirstOrDefaultAsync(ct);

        return account;
    }

    public async Task<ChiTietKhachHangResponse?> CapNhatTrangThaiAsync(
        int maTk,
        bool hoatDong,
        CancellationToken ct = default)
    {
        // Tìm tài khoản trực tiếp để cập nhật qua EF Core Change Tracker
        var account = await _db.TaiKhoans
            .FirstOrDefaultAsync(t => t.MaTk == maTk, ct);

        if (account is null)
        {
            _logger.LogWarning("Không tìm thấy tài khoản mã #{MaTk} để cập nhật trạng thái.", maTk);
            return null;
        }

        // BẢO VỆ NGHIÊM NGẶT: Tuyệt đối không cho phép khóa hoặc can thiệp tài khoản Admin
        if (account.VaiTro != RoleKhachHang)
        {
            _logger.LogWarning("Từ chối cập nhật trạng thái tài khoản #{MaTk} vì không phải là KhachHang (VaiTro={VaiTro}).",
                maTk, account.VaiTro);
            return null;
        }

        // Chỉ cập nhật thuộc tính HoatDong
        account.HoatDong = hoatDong;
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Đã cập nhật trạng thái tài khoản khách hàng #{MaTk} thành HoatDong={HoatDong}.",
            maTk, hoatDong);

        return new ChiTietKhachHangResponse
        {
            MaTk = account.MaTk,
            HoTen = account.HoTen ?? string.Empty,
            Email = account.Email ?? string.Empty,
            Sdt = account.Sdt ?? string.Empty,
            DiaChi = account.DiaChi ?? string.Empty,
            HoatDong = account.HoatDong
        };
    }
}
