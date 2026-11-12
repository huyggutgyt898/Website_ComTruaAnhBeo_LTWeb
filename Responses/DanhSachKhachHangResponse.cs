namespace ComTruaAnhBeo.Responses;

public sealed class DanhSachKhachHangResponse
{
    public List<KhachHangResponse> Items { get; set; } = new();
    public int TotalItems { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalItems / PageSize) : 0;
}
