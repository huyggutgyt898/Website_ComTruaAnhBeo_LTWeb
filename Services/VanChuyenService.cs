using ComTruaAnhBeo.Requests;
using ComTruaAnhBeo.Responses;

namespace ComTruaAnhBeo.Services;

public sealed class VanChuyenService : IVanChuyenService
{
    private readonly IOpenRouteService _maps;
    private readonly ILalamoveService _lalamove;
    private readonly IConfiguration _config;
    private readonly IHostEnvironment _environment;

    public VanChuyenService(IOpenRouteService maps, ILalamoveService lalamove,
        IConfiguration config, IHostEnvironment environment)
    {
        _maps = maps;
        _lalamove = lalamove;
        _config = config;
        _environment = environment;
    }

    public async Task<KiemTraDiaChiResponse> KiemTraDiaChiAsync(
        KiemTraDiaChiRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request?.DiaChi))
            return new() { ThongBao = "Địa chỉ giao hàng không được để trống." };

        var geo = await _maps.GeocodeAsync(request.DiaChi, ct);
        if (geo is null)
            return new() { ThongBao = "Không tìm thấy địa chỉ giao hàng." };
        if (!geo.ThuocTpHcm)
            return new()
            {
                DiaChiChuanHoa = geo.DiaChiChuanHoa,
                ThongBao = "Địa chỉ không thuộc phạm vi TP.HCM được hỗ trợ."
            };

        double latQuan = _config.GetValue<double>("CuaHang:ViDo");
        double lngQuan = _config.GetValue<double>("CuaHang:KinhDo");
        if (latQuan == 0 || lngQuan == 0)
            throw new InvalidOperationException("Chưa cấu hình tọa độ CuaHang:ViDo/KinhDo.");

        var tuyen = await _maps.TinhKhoangCachAsync(
            latQuan, lngQuan, geo.ViDo, geo.KinhDo, ct);
        if (tuyen is null)
            return new() { ThongBao = "Không tính được tuyến đường giao hàng." };

        // Phạm vi ưu tiên là TP.HCM; chỉ áp dụng giới hạn km nếu nhóm cấu hình rõ.
        double? gioiHan = _config.GetValue<double?>("VanChuyen:GioiHanKm");
        bool trongPhamVi = !gioiHan.HasValue || tuyen.KhoangCachKm <= gioiHan.Value;
        return new()
        {
            HopLe = true,
            CoTheGiaoHang = trongPhamVi,
            DiaChiChuanHoa = geo.DiaChiChuanHoa,
            ViDo = geo.ViDo,
            KinhDo = geo.KinhDo,
            KhoangCachKm = tuyen.KhoangCachKm,
            ThoiGianUocTinhPhut = tuyen.ThoiGianPhut,
            ThongBao = trongPhamVi ? "Địa chỉ hợp lệ trong phạm vi phục vụ." :
                "Địa chỉ vượt quá khoảng cách giao hàng được cấu hình."
        };
    }

    public async Task<BaoGiaVanChuyenResponse> TinhPhiVanChuyenAsync(
        BaoGiaVanChuyenRequest request, CancellationToken ct = default)
    {
        // Chưa có hợp đồng liên kết đơn hàng: chỉ cho giá trị tiền thử nghiệm trong Development.
        if (!_environment.IsDevelopment() || !_config.GetValue<bool>("VanChuyen:ChoPhepThuNghiemTienClient"))
            throw new InvalidOperationException(
                "Chưa ghép xác minh giá trị đơn hàng từ backend. Không sử dụng số tiền frontend khi chạy thật.");

        var diaChi = await KiemTraDiaChiAsync(new KiemTraDiaChiRequest
        {
            DiaChi = request.DiaChiGiaoHang
        }, ct);
        if (!diaChi.HopLe || !diaChi.CoTheGiaoHang ||
            !diaChi.ViDo.HasValue || !diaChi.KinhDo.HasValue)
            return new() { ThanhCong = false, ThongBao = diaChi.ThongBao,
                KhoangCachKm = diaChi.KhoangCachKm };

        double latQuan = _config.GetValue<double>("CuaHang:ViDo");
        double lngQuan = _config.GetValue<double>("CuaHang:KinhDo");
        var baoGia = await _lalamove.LayBaoGiaAsync(
            latQuan, lngQuan, diaChi.ViDo.Value, diaChi.KinhDo.Value, ct);
        if (baoGia is null)
            return new() { ThanhCong = false, ThongBao = "Lalamove chưa cung cấp báo giá cho tuyến này." };

        decimal nguong = _config.GetValue<decimal>("VanChuyen:NguongMienPhiShip");
        bool mienPhi = nguong > 0 && request.TienHangSauGiamThuNghiem >= nguong;
        decimal phiKhachTra = mienPhi ? 0 : baoGia.PhiGoc;

        return new()
        {
            ThanhCong = true,
            ThongBao = "Đã lấy báo giá Lalamove.",
            PhiGocLalamove = baoGia.PhiGoc,
            PhiKhachTra = phiKhachTra,
            PhiQuanChiu = mienPhi ? baoGia.PhiGoc : 0,
            DuocMienPhi = mienPhi,
            MaBaoGiaLalamove = baoGia.MaBaoGia,
            KhoangCachKm = diaChi.KhoangCachKm,
            ThoiGianUocTinhPhut = diaChi.ThoiGianUocTinhPhut
        };
    }
}
