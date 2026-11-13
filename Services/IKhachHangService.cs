using ComTruaAnhBeo.Responses;

namespace ComTruaAnhBeo.Services;

public interface IKhachHangService
{
    Task<DanhSachKhachHangResponse> LayDanhSachKhachHangAsync(
        string? keyword = null,
        int page = 1,
        int pageSize = 10,
        CancellationToken ct = default);

    Task<ChiTietKhachHangResponse?> LayChiTietKhachHangAsync(
        int maTk,
        CancellationToken ct = default);

    Task<ChiTietKhachHangResponse?> CapNhatTrangThaiAsync(
        int maTk,
        bool hoatDong,
        CancellationToken ct = default);
}
