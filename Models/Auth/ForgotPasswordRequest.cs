using System.ComponentModel.DataAnnotations;

namespace ComTruaAnhBeo.Models.Auth;

public sealed class ForgotPasswordRequest
{
    [Required(ErrorMessage = "Vui lòng nhập email.")]
    [EmailAddress(ErrorMessage = "Email không hợp lệ.")]
    [StringLength(150, ErrorMessage = "Email không được vượt quá 150 ký tự.")]
    public string Email { get; set; } = string.Empty;
}