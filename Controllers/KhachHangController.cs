using ComTruaAnhBeo.Requests;
using ComTruaAnhBeo.Responses;
using ComTruaAnhBeo.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ComTruaAnhBeo.Controllers;

[ApiController]
[Route("api/khach-hang")]
[Authorize(Roles = AdminController.AdminRole)]
public sealed class KhachHangController : ControllerBase
{
    private readonly IKhachHangService _service;
    private readonly ILogger<KhachHangController> _logger;

    public KhachHangController(
        IKhachHangService service,
        ILogger<KhachHangController> logger)
    {
        _service = service;
        _logger = logger;
    }

    /// <summary>
    /// Chức năng 1 & 2: Lấy danh sách khách hàng và tìm kiếm theo từ khóa kết hợp phân trang
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(DanhSachKhachHangResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> LayDanhSach(
        [FromQuery] string? keyword,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken ct = default)
    {
        try
        {
            var result = await _service.LayDanhSachKhachHangAsync(keyword, page, pageSize, ct);
            return Ok(result);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            _logger.LogInformation("Yêu cầu lấy danh sách khách hàng đã bị hủy bởi người dùng.");
            return StatusCode(499); // 499 Client Closed Request
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi lấy danh sách khách hàng.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Đã xảy ra lỗi khi tải danh sách khách hàng. Vui lòng thử lại sau."
            });
        }
    }

    /// <summary>
    /// Chức năng 3: Xem chi tiết thông tin một khách hàng theo mã tài khoản
    /// </summary>
    [HttpGet("{maTk:int}")]
    [ProducesResponseType(typeof(ChiTietKhachHangResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> LayChiTiet(
        [FromRoute] int maTk,
        CancellationToken ct = default)
    {
        try
        {
            var result = await _service.LayChiTietKhachHangAsync(maTk, ct);
            if (result is null)
            {
                return NotFound(new { message = $"Không tìm thấy khách hàng có mã tài khoản #{maTk}." });
            }

            return Ok(result);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            _logger.LogInformation("Yêu cầu lấy chi tiết khách hàng #{MaTk} đã bị hủy bởi người dùng.", maTk);
            return StatusCode(499);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi lấy chi tiết khách hàng #{MaTk}.", maTk);
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Đã xảy ra lỗi khi tải thông tin chi tiết khách hàng. Vui lòng thử lại sau."
            });
        }
    }

    /// <summary>
    /// Chức năng 4: Khóa hoặc mở khóa tài khoản khách hàng (cập nhật thuộc tính HoatDong)
    /// </summary>
    [HttpPatch("{maTk:int}/trang-thai")]
    [ProducesResponseType(typeof(ChiTietKhachHangResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CapNhatTrangThai(
        [FromRoute] int maTk,
        [FromBody] CapNhatTrangThaiKhachHangRequest request,
        CancellationToken ct = default)
    {
        if (request is null)
        {
            return BadRequest(new { message = "Dữ liệu yêu cầu không hợp lệ." });
        }

        try
        {
            var result = await _service.CapNhatTrangThaiAsync(maTk, request.HoatDong, ct);
            if (result is null)
            {
                return NotFound(new
                {
                    message = $"Không tìm thấy tài khoản khách hàng #{maTk} hoặc tài khoản không được phép thao tác."
                });
            }

            return Ok(new
            {
                message = request.HoatDong ? "Mở khóa tài khoản thành công." : "Khóa tài khoản thành công.",
                data = result
            });
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            _logger.LogInformation("Yêu cầu cập nhật trạng thái khách hàng #{MaTk} đã bị hủy bởi người dùng.", maTk);
            return StatusCode(499);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi cập nhật trạng thái tài khoản khách hàng #{MaTk}.", maTk);
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Đã xảy ra lỗi khi cập nhật trạng thái khách hàng. Vui lòng thử lại sau."
            });
        }
    }
}
