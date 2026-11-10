namespace ComTruaAnhBeo.Responses;

public sealed class KiemTraDiaChiResponse
{
    public bool HopLe { get; set; }
    public bool CoTheGiaoHang { get; set; }
    public string ThongBao { get; set; } = string.Empty;
    public string DiaChiChuanHoa { get; set; } = string.Empty;
    public double? ViDo { get; set; }
    public double? KinhDo { get; set; }
    public double? KhoangCachKm { get; set; }
    public int? ThoiGianUocTinhPhut { get; set; }
}
