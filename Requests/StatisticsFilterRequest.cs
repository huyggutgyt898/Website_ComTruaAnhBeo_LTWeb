namespace ComTruaAnhBeo.Requests;

public class StatisticsFilterRequest
{
    /// <summary>
    /// Các tùy chọn nhanh: "today", "7days", "this_month", "last_month".
    /// Nếu truyền Preset, hệ thống tự động tính FromDate và ToDate theo múi giờ Việt Nam.
    /// </summary>
    public string? Preset { get; set; }

    /// <summary>
    /// Ngày bắt đầu (tùy chỉnh)
    /// </summary>
    public DateTime? FromDate { get; set; }

    /// <summary>
    /// Ngày kết thúc (tùy chỉnh)
    /// </summary>
    public DateTime? ToDate { get; set; }
}
