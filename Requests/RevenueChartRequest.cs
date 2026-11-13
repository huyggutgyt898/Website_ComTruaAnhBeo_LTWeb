namespace ComTruaAnhBeo.Requests;

public sealed class RevenueChartRequest : StatisticsFilterRequest
{
    /// <summary>
    /// Chu kỳ biểu đồ: "day" (theo ngày, mặc định) hoặc "month" (theo tháng).
    /// </summary>
    public string Period { get; set; } = "day";
}
