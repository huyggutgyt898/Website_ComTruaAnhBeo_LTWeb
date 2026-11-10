namespace ComTruaAnhBeo.Responses;

public sealed class BaoGiaVanChuyenResponse
{
    public bool ThanhCong { get; set; }
    public string ThongBao { get; set; } = string.Empty;
    public decimal? PhiGocLalamove { get; set; }
    public decimal? PhiKhachTra { get; set; }
    public decimal? PhiQuanChiu { get; set; }
    public bool DuocMienPhi { get; set; }
    public string? MaBaoGiaLalamove { get; set; }
    public double? KhoangCachKm { get; set; }
    public int? ThoiGianUocTinhPhut { get; set; }
}
