namespace ComTruaAnhBeo.Responses;

public sealed class ChiTietKhachHangResponse
{
    public int MaTk { get; set; }
    public string HoTen { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Sdt { get; set; } = string.Empty;
    public string DiaChi { get; set; } = string.Empty;
    public bool HoatDong { get; set; }
}
