using System.ComponentModel.DataAnnotations;

namespace ComTruaAnhBeo.Requests;

public sealed class KiemTraDiaChiRequest
{
    [Required(ErrorMessage = "Vui lòng nhập địa chỉ giao hàng.")]
    public string DiaChi { get; set; } = string.Empty;
}
