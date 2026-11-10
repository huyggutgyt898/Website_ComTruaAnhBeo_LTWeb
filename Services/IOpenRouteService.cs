namespace ComTruaAnhBeo.Services;

public sealed record DiaChiDuocXacMinh(
    string DiaChiChuanHoa,
    double ViDo,
    double KinhDo,
    bool ThuocTpHcm);

public sealed record TuyenDuong(double KhoangCachKm, int ThoiGianPhut);

public interface IOpenRouteService
{
    Task<DiaChiDuocXacMinh?> GeocodeAsync(string diaChi, CancellationToken ct = default);
    Task<TuyenDuong?> TinhKhoangCachAsync(
        double viDoDiemLay, double kinhDoDiemLay,
        double viDoDiemGiao, double kinhDoDiemGiao,
        CancellationToken ct = default);
}
