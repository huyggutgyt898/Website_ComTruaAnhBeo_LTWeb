using ComTruaAnhBeo.Requests;
using ComTruaAnhBeo.Responses;

namespace ComTruaAnhBeo.Services;

public interface IStatisticsService
{
    /// <summary>
    /// Chức năng 1: Thống kê tổng quan doanh thu (tổng doanh thu hoàn thành, số đơn, AOV, tiền đã thanh toán, chờ thanh toán)
    /// </summary>
    Task<RevenueStatisticsResponse> GetRevenueStatisticsAsync(
        StatisticsFilterRequest filter,
        CancellationToken ct = default);

    /// <summary>
    /// Chức năng 1: Biểu đồ doanh thu theo chu kỳ ngày hoặc tháng
    /// </summary>
    Task<RevenueChartResponse> GetRevenueChartAsync(
        RevenueChartRequest request,
        CancellationToken ct = default);

    /// <summary>
    /// Chức năng 1: Thống kê phương thức thanh toán (COD, MOMO, VNPAY) và trạng thái thanh toán (DaTT, ChuaTT, HetHan)
    /// </summary>
    Task<PaymentStatisticsResponse> GetPaymentStatisticsAsync(
        StatisticsFilterRequest filter,
        CancellationToken ct = default);

    /// <summary>
    /// Chức năng 2: Thống kê Top món chính bán chạy nhất kèm sản lượng bán, doanh thu món và tỷ trọng đóng góp
    /// </summary>
    Task<TopProductListResponse> GetTopProductsAsync(
        TopProductRequest request,
        CancellationToken ct = default);

    /// <summary>
    /// Chức năng 3: Thống kê tổng hợp đánh giá khách hàng (tổng lượt, điểm trung bình, cơ cấu 1-5 sao)
    /// </summary>
    Task<ReviewStatisticsResponse> GetReviewStatisticsAsync(
        StatisticsFilterRequest filter,
        CancellationToken ct = default);

    /// <summary>
    /// Chức năng 3: Lấy danh sách nhận xét gần đây của khách hàng theo phân trang và lọc số sao
    /// </summary>
    Task<RecentReviewsPagedResponse> GetRecentReviewsAsync(
        ReviewFilterRequest request,
        CancellationToken ct = default);

    /// <summary>
    /// Chức năng Xuất báo cáo: Xuất dữ liệu thống kê ra file (CSV UTF-8 có BOM)
    /// </summary>
    Task<(byte[] FileBytes, string ContentType, string FileName)> ExportReportAsync(
        ExportReportRequest request,
        CancellationToken ct = default);
}
