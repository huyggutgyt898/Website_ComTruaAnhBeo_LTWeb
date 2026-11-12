using System.ComponentModel.DataAnnotations;

namespace ComTruaAnhBeo.Models.Auth;

/// <summary>Dùng chung cho "quên mật khẩu" và "đổi mật khẩu" (xác nhận bằng mã gửi qua email).</summary>
public sealed class ResetPasswordRequest
{
    [Required(ErrorMessage = "Phiên xác nhận không hợp lệ. Vui lòng gửi lại mã.")]
    [StringLength(64, ErrorMessage = "Phiên xác nhận không hợp lệ. Vui lòng gửi lại mã.")]
    public string ChallengeId { get; set; } = string.Empty;

    [Required(ErrorMessage = "Vui lòng nhập mã xác nhận.")]
    [RegularExpression(@"^\d{6}$", ErrorMessage = "Mã xác nhận phải gồm 6 chữ số.")]
    public string Code { get; set; } = string.Empty;

    [Required(ErrorMessage = "Vui lòng nhập mật khẩu mới.")]
    [StringLength(100, MinimumLength = 8, ErrorMessage = "Mật khẩu phải có từ 8 đến 100 ký tự.")]
    public string NewPassword { get; set; } = string.Empty;
}