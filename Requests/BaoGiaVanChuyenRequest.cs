using System.ComponentModel.DataAnnotations;

namespace ComTruaAnhBeo.Requests;

public sealed class BaoGiaVanChuyenRequest
{
    [Required(ErrorMessage = "Vui lòng nhập địa chỉ giao hàng.")]
    public string DiaChiGiaoHang { get; set; } = string.Empty;

    // CHỈ ĐỂ KIỂM THỬ KHI CHƯA GHÉP MODULE ĐƠN HÀNG.
    // Không dùng số tiền phía client cung cấp để miễn phí ship khi chạy production.
    [Range(typeof(decimal), "0", "999999999999", ErrorMessage = "Tiền hàng không hợp lệ.")]
    public decimal TienHangSauGiamThuNghiem { get; set; }
}
