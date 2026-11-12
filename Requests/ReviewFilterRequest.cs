namespace ComTruaAnhBeo.Requests;

public sealed class ReviewFilterRequest : StatisticsFilterRequest
{
    /// <summary>
    /// Lọc theo số sao cụ thể (1 đến 5). Nếu null thì lấy tất cả các mức sao.
    /// </summary>
    public byte? SoSao { get; set; }

    /// <summary>
    /// Số trang (phân trang)
    /// </summary>
    public int Page { get; set; } = 1;

    /// <summary>
    /// Số lượng bản ghi trên một trang (mặc định 10)
    /// </summary>
    public int PageSize { get; set; } = 10;
}
