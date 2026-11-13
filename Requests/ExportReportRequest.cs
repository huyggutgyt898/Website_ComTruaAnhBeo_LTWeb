namespace ComTruaAnhBeo.Requests;

public sealed class ExportReportRequest : StatisticsFilterRequest
{
    /// <summary>
    /// Loại báo cáo: "revenue" (doanh thu), "top-products" (món bán chạy), "reviews" (đánh giá).
    /// </summary>
    public string Type { get; set; } = "revenue";

    /// <summary>
    /// Định dạng file xuất: "csv" (chuẩn UTF-8 có BOM hỗ trợ Excel tiếng Việt).
    /// </summary>
    public string Format { get; set; } = "csv";

    /// <summary>
    /// Chu kỳ thống kê doanh thu khi xuất báo cáo doanh thu: "day" hoặc "month".
    /// </summary>
    public string Period { get; set; } = "day";

    /// <summary>
    /// Số lượng món khi xuất báo cáo món bán chạy (mặc định 10).
    /// </summary>
    public int Top { get; set; } = 10;

    /// <summary>
    /// Lọc theo số sao khi xuất báo cáo đánh giá (1-5 hoặc null để lấy toàn bộ).
    /// </summary>
    public byte? SoSao { get; set; }
}
