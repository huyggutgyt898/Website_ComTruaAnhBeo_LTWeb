using System.ComponentModel.DataAnnotations;

namespace ComTruaAnhBeo.Models.Reviews;

public sealed class CreateReviewRequest
{
    [Range(1, 5, ErrorMessage = "Vui lòng chọn số sao từ 1 đến 5.")]
    public int Stars { get; set; }

    [StringLength(500, ErrorMessage = "Nhận xét không được vượt quá 500 ký tự.")]
    public string? Comment { get; set; }
}