using ComTruaAnhBeo.Requests;
using ComTruaAnhBeo.Responses;
using ComTruaAnhBeo.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ComTruaAnhBeo.Controllers;

[ApiController]
[Route("api/admin/statistics")]
[Authorize(Roles = AdminController.AdminRole)]
public sealed class StatisticsController : ControllerBase
{
    private readonly IStatisticsService _service;
    private readonly ILogger<StatisticsController> _logger;

    public StatisticsController(
        IStatisticsService service,
        ILogger<StatisticsController> logger)
    {
        _service = service;
        _logger = logger;
    }

    /// <summary>
    /// Chức năng 1: Thống kê tổng quan doanh thu từ các đơn hàng hoàn tất
    /// </summary>
    [HttpGet("revenue")]
    [ProducesResponseType(typeof(RevenueStatisticsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetRevenue(
        [FromQuery] StatisticsFilterRequest filter,
        CancellationToken ct = default)
    {
        try
        {
            var result = await _service.GetRevenueStatisticsAsync(filter, ct);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi lấy dữ liệu thống kê doanh thu.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Đã xảy ra lỗi khi tổng hợp dữ liệu thống kê doanh thu. Vui lòng thử lại sau."
            });
        }
    }

    /// <summary>
    /// Chức năng 1: Biểu đồ biến động doanh thu theo ngày hoặc theo tháng
    /// </summary>
    [HttpGet("revenue-chart")]
    [ProducesResponseType(typeof(RevenueChartResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetRevenueChart(
        [FromQuery] RevenueChartRequest request,
        CancellationToken ct = default)
    {
        try
        {
            var result = await _service.GetRevenueChartAsync(request, ct);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi lấy dữ liệu biểu đồ doanh thu.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Đã xảy ra lỗi khi tạo dữ liệu biểu đồ doanh thu. Vui lòng thử lại sau."
            });
        }
    }

    /// <summary>
    /// Chức năng 1: Thống kê phương thức thanh toán (COD, MOMO, VNPAY) và trạng thái (DaTT, ChuaTT, HetHan)
    /// </summary>
    [HttpGet("payments")]
    [ProducesResponseType(typeof(PaymentStatisticsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetPayments(
        [FromQuery] StatisticsFilterRequest filter,
        CancellationToken ct = default)
    {
        try
        {
            var result = await _service.GetPaymentStatisticsAsync(filter, ct);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi lấy dữ liệu thống kê thanh toán.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Đã xảy ra lỗi khi tổng hợp dữ liệu thanh toán. Vui lòng thử lại sau."
            });
        }
    }

    /// <summary>
    /// Chức năng 2: Thống kê Top món chính bán chạy nhất kèm sản lượng bán, doanh thu và tỷ trọng đóng góp
    /// </summary>
    [HttpGet("top-products")]
    [ProducesResponseType(typeof(TopProductListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetTopProducts(
        [FromQuery] TopProductRequest request,
        CancellationToken ct = default)
    {
        try
        {
            var result = await _service.GetTopProductsAsync(request, ct);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi thống kê top món bán chạy.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Đã xảy ra lỗi khi lấy danh sách món bán chạy. Vui lòng thử lại sau."
            });
        }
    }

    /// <summary>
    /// Chức năng 3: Thống kê đánh giá của khách hàng (tổng lượt, điểm trung bình, cơ cấu 1-5 sao)
    /// </summary>
    [HttpGet("reviews")]
    [ProducesResponseType(typeof(ReviewStatisticsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetReviews(
        [FromQuery] StatisticsFilterRequest filter,
        CancellationToken ct = default)
    {
        try
        {
            var result = await _service.GetReviewStatisticsAsync(filter, ct);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi thống kê đánh giá khách hàng.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Đã xảy ra lỗi khi tổng hợp số liệu đánh giá. Vui lòng thử lại sau."
            });
        }
    }

    /// <summary>
    /// Chức năng 3: Danh sách các nhận xét gần đây của khách hàng theo phân trang và lọc số sao
    /// </summary>
    [HttpGet("recent-reviews")]
    [ProducesResponseType(typeof(RecentReviewsPagedResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetRecentReviews(
        [FromQuery] ReviewFilterRequest request,
        CancellationToken ct = default)
    {
        try
        {
            var result = await _service.GetRecentReviewsAsync(request, ct);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi lấy danh sách nhận xét gần đây.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Đã xảy ra lỗi khi tải danh sách nhận xét. Vui lòng thử lại sau."
            });
        }
    }

    /// <summary>
    /// Chức năng Xuất báo cáo: Xuất file dữ liệu báo cáo (CSV UTF-8 BOM hỗ trợ Excel)
    /// </summary>
    [HttpGet("export")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Export(
        [FromQuery] ExportReportRequest request,
        CancellationToken ct = default)
    {
        try
        {
            var (fileBytes, contentType, fileName) = await _service.ExportReportAsync(request, ct);
            return File(fileBytes, contentType, fileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi xuất báo cáo thống kê.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Đã xảy ra lỗi khi xuất file báo cáo. Vui lòng thử lại sau."
            });
        }
    }
}
