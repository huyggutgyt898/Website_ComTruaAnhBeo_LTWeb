using System.ComponentModel.DataAnnotations;

namespace ComTruaAnhBeo.Models.Auth;

public sealed class UpdateProfileRequest
{
    [Required(ErrorMessage = "Vui lòng nhập họ và tên.")]
    [StringLength(100, ErrorMessage = "Họ tên không được vượt quá 100 ký tự.")]
    public string FullName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Vui lòng nhập số điện thoại.")]
    [StringLength(10, MinimumLength = 10, ErrorMessage = "Số điện thoại phải có 10 chữ số.")]
    [RegularExpression(@"^0\d{9}$", ErrorMessage = "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0.")]
    public string Phone { get; set; } = string.Empty;

    [Required(ErrorMessage = "Vui lòng nhập địa chỉ nhận hàng.")]
    [StringLength(255, ErrorMessage = "Địa chỉ không được vượt quá 255 ký tự.")]
    public string Address { get; set; } = string.Empty;
}