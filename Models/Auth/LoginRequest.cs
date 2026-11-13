using System.ComponentModel.DataAnnotations;

namespace ComTruaAnhBeo.Models.Auth;

public sealed class LoginRequest
{
    [Required(ErrorMessage = "Vui lòng nhập email hoặc số điện thoại.")]
    [StringLength(150, ErrorMessage = "Thông tin đăng nhập không hợp lệ.")]
    public string Identifier { get; set; } = string.Empty;

    [Required(ErrorMessage = "Vui lòng nhập mật khẩu.")]
    [StringLength(100, ErrorMessage = "Thông tin đăng nhập không hợp lệ.")]
    public string Password { get; set; } = string.Empty;
}
