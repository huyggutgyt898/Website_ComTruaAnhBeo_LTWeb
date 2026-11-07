using System.ComponentModel.DataAnnotations;

namespace ComTruaAnhBeo.Models.Auth;

public sealed class VerifyRegistrationRequest
{
    [Required]
    [StringLength(64)]
    public string ChallengeId { get; set; } = string.Empty;

    [Required(ErrorMessage = "Vui lòng nhập mã xác nhận.")]
    [RegularExpression(@"^\d{6}$", ErrorMessage = "Mã xác nhận phải gồm 6 chữ số.")]
    public string Code { get; set; } = string.Empty;
}
