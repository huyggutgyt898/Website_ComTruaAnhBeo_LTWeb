namespace ComTruaAnhBeo.Requests;

public sealed class TopProductRequest : StatisticsFilterRequest
{
    /// <summary>
    /// Số lượng món hiển thị trong bảng xếp hạng: mặc định là 5, có thể truyền 10 hoặc số khác.
    /// </summary>
    public int Top { get; set; } = 5;
}
