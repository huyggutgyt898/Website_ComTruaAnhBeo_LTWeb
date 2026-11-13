namespace ComTruaAnhBeo.Responses;

public sealed class RevenueChartResponse
{
    /// <summary>
    /// Chu kỳ biểu đồ: "day" hoặc "month"
    /// </summary>
    public string Period { get; set; } = "day";

    /// <summary>
    /// Danh sách các điểm dữ liệu trên biểu đồ theo thứ tự thời gian tăng dần
    /// </summary>
    public List<RevenueChartItemResponse> Items { get; set; } = new();

    /// <summary>
    /// Tổng doanh thu trong toàn bộ chu kỳ biểu đồ
    /// </summary>
    public decimal TongDoanhThu { get; set; }

    /// <summary>
    /// Tổng số đơn hoàn thành trong toàn bộ chu kỳ biểu đồ
    /// </summary>
    public int TongSoDon { get; set; }
}

public sealed class RevenueChartItemResponse
{
    /// <summary>
    /// Nhãn hiển thị trục thời gian (ví dụ: "01/11/2026" cho ngày, "11/2026" cho tháng)
    /// </summary>
    public string TimeLabel { get; set; } = string.Empty;

    /// <summary>
    /// Mốc thời gian chuẩn dạng DateOnly/DateTime để vẽ biểu đồ
    /// </summary>
    public DateTime Date { get; set; }

    /// <summary>
    /// Tổng doanh thu đơn hoàn thành trong mốc thời gian này (VNĐ)
    /// </summary>
    public decimal DoanhThu { get; set; }

    /// <summary>
    /// Số lượng đơn hoàn thành trong mốc thời gian này
    /// </summary>
    public int SoDon { get; set; }

    /// <summary>
    /// Số tiền thực thu (đã thanh toán thành công DaTT)
    /// </summary>
    public decimal DaThuTien { get; set; }

    /// <summary>
    /// Số tiền chờ thanh toán (ChuaTT)
    /// </summary>
    public decimal ChoThanhToan { get; set; }
}
