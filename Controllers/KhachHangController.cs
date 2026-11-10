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
        var result = await _service.LayDanhSachKhachHangAsync(keyword, page, pageSize, ct);
        return Ok(result);
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
        var result = await _service.LayChiTietKhachHangAsync(maTk, ct);
        if (result is null)
        {
            return NotFound(new { message = $"Không tìm thấy khách hàng có mã tài khoản #{maTk}." });
        }

        return Ok(result);
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
}
