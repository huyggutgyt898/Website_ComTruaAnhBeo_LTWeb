namespace ComTruaAnhBeo.Services;

public sealed record BaoGiaLalamove(
    string MaBaoGia,
    decimal PhiGoc,
    string? StopIdLay = null,
    string? StopIdGiao = null);

public sealed record KetQuaGoiTaiXe(
    bool ThanhCong,
    string ThongBao,
    string? OrderId,
    string? TenTaiXe,
    string? SdtTaiXe,
    string? LinkTheoDoi,
    string? TrangThai,
    decimal? PhiThucTe = null);

public sealed record ThongTinDonLalamove(
    string OrderId,
    string Status,
    string? ShareLink,
    string? DriverId,
    string? TenTaiXe,
    string? SdtTaiXe,
    string? BienSoXe);

public interface ILalamoveService
{
    Task<BaoGiaLalamove?> LayBaoGiaAsync(
        double viDoLay, double kinhDoLay,
        double viDoGiao, double kinhDoGiao,
        CancellationToken ct = default);

    Task<KetQuaGoiTaiXe> GoiTaiXeAsync(
        double viDoLay, double kinhDoLay, string diaChiLay, string sdtQuan,
        double viDoGiao, double kinhDoGiao, string diaChiGiao, string tenKhach, string sdtKhach,
        CancellationToken ct = default);

    Task<bool> HuyDonAsync(
        string? lalamoveOrderId,
        string? lyDo = null,
        CancellationToken ct = default);

    Task<ThongTinDonLalamove?> LayThongTinDonAsync(
        string lalamoveOrderId,
        CancellationToken ct = default);
}
