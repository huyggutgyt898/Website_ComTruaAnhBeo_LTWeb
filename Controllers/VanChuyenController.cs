using ComTruaAnhBeo.Models;
using ComTruaAnhBeo.Requests;
using ComTruaAnhBeo.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace ComTruaAnhBeo.Controllers;

[ApiController]
[Route("api/van-chuyen")]
public sealed class VanChuyenController : ControllerBase
{
    private readonly IVanChuyenService _service;
    private readonly ILalamoveService _lalamove;
    private readonly IOpenRouteService _ors;
    private readonly ComTruaAnhBeoContext _db;
    private readonly IConfiguration _config;
    private readonly ILogger<VanChuyenController> _logger;

    public VanChuyenController(
        IVanChuyenService service,
        ILalamoveService lalamove,
        IOpenRouteService ors,
        ComTruaAnhBeoContext db,
        IConfiguration config,
        ILogger<VanChuyenController> logger)
    {
        _service = service;
        _lalamove = lalamove;
        _ors = ors;
        _db = db;
        _config = config;
        _logger = logger;
    }

    /// <summary>
    /// Lấy thông tin cấu hình quán và tình trạng kết nối API vận chuyển
    /// </summary>
    [HttpGet("thong-tin")]
    [AllowAnonymous]
    public IActionResult LayThongTin()
    {
        var openRouteKey = _config["OpenRouteService:ApiKey"];
        var lalamoveKey = _config["Lalamove:ApiKey"];
        var lalamoveSecret = _config["Lalamove:ApiSecret"];

        var coDiaChi = !string.IsNullOrWhiteSpace(openRouteKey);
        var coLalamove = !string.IsNullOrWhiteSpace(lalamoveKey) && !string.IsNullOrWhiteSpace(lalamoveSecret);

        return Ok(new
        {
            cuaHang = new
            {
                diaChi = _config["CuaHang:DiaChi"] ?? "450 Lê Văn Việt, Phường Tăng Nhơn Phú A, Thành phố Thủ Đức, Thành phố Hồ Chí Minh",
                viDo = _config.GetValue<double>("CuaHang:ViDo"),
                kinhDo = _config.GetValue<double>("CuaHang:KinhDo")
            },
            vanChuyen = new
            {
                nguongMienPhiShip = _config.GetValue<decimal>("VanChuyen:NguongMienPhiShip"),
                gioiHanKm = _config.GetValue<double?>("VanChuyen:GioiHanKm"),
                choPhepThuNghiem = _config.GetValue<bool>("VanChuyen:ChoPhepThuNghiemTienClient"),
                phamViPhucVu = "TP. Hồ Chí Minh"
            },
            openRouteService = new
            {
                daCauHinh = coDiaChi,
                thongBao = coDiaChi
                    ? "OpenRouteService API Key đã được cấu hình thành công."
                    : "CHƯA CÓ API KEY. Đã có hệ thống Geocoding & Routing dự phòng (Photon/OSRM)."
            },
            googleMaps = new
            {
                daCauHinh = coDiaChi,
                thongBao = coDiaChi
                    ? "Đã chuyển đổi sang sử dụng OpenRouteService & OpenStreetMap."
                    : "Chưa cấu hình API bản đồ."
            },
            lalamove = new
            {
                daCauHinh = coLalamove,
                trangThai = coLalamove ? "ACTIVE" : "CHUA_CAU_HINH",
                thongBao = coLalamove
                    ? "Lalamove API v3 Quotation & Order Placement đã sẵn sàng."
                    : "Chưa cấu hình Lalamove API Key/Secret."
            }
        });
    }

    /// <summary>
    /// API kiểm tra tính hợp lệ của địa chỉ giao hàng và phạm vi TP.HCM
    /// </summary>
    [HttpPost("kiem-tra-dia-chi")]
    [AllowAnonymous]
    public async Task<IActionResult> KiemTraDiaChi(
        [FromBody] KiemTraDiaChiRequest request, CancellationToken ct)
    {
        try
        {
            var result = await _service.KiemTraDiaChiAsync(request, ct);
            return result.HopLe && result.CoTheGiaoHang ? Ok(result) : BadRequest(result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Thiếu cấu hình kiểm tra địa chỉ.");
            return StatusCode(503, new { thongBao = ex.Message });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Lỗi API địa chỉ.");
            return StatusCode(502, new { thongBao = "Không thể kiểm tra địa chỉ lúc này: " + ex.Message });
        }
    }

    /// <summary>
    /// API lấy báo giá cước vận chuyển Lalamove và tính toán miễn ship
    /// </summary>
    [HttpPost("bao-gia")]
    [AllowAnonymous]
    public async Task<IActionResult> BaoGia(
        [FromBody] BaoGiaVanChuyenRequest request, CancellationToken ct)
    {
        try
        {
            var result = await _service.TinhPhiVanChuyenAsync(request, ct);
            return result.ThanhCong ? Ok(result) : BadRequest(result);
        }
        catch (NotImplementedException ex)
        {
            _logger.LogWarning(ex, "Lalamove chưa tích hợp.");
            return StatusCode(503, new { thongBao = "Lalamove chưa được tích hợp (LalamoveService đang ở dạng STUB)." });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Chưa đủ điều kiện báo giá.");
            return StatusCode(503, new { thongBao = ex.Message });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Lỗi API báo giá.");
            return StatusCode(502, new { thongBao = "Không lấy được báo giá giao hàng." });
        }
    }

    /// <summary>
    /// Lấy danh sách các đơn hàng và trạng thái vận chuyển Lalamove từ database cho Admin
    /// </summary>
    [HttpGet("danh-sach")]
    [Authorize(Roles = AdminController.AdminRole)]
    public async Task<IActionResult> LayDanhSachVanChuyen(CancellationToken ct)
    {
        // 1. Lấy danh sách các đơn hàng gần đây kèm thông tin thanh toán
        var donHangs = await _db.DonHangs
            .AsNoTracking()
            .Include(d => d.ThanhToan)
            .OrderByDescending(d => d.MaDon)
            .Take(50)
            .Select(d => new
            {
                MaDon = d.MaDon,
                MaTraCuuDon = d.MaTraCuu,
                TenKhach = d.TenNguoiNhan,
                SdtKhach = d.Sdt,
                DiaChiGiao = d.DiaChiGiao,
                ViDoGiao = d.ViDo,
                KinhDoGiao = d.KinhDo,
                TongTienDon = d.TongTien,
                TrangThaiDonHang = d.TrangThai,
                PhuongThucTt = d.ThanhToan != null ? d.ThanhToan.PhuongThuc : "COD",
                TrangThaiTt = d.ThanhToan != null ? d.ThanhToan.TrangThai : "ChuaTT",
                NgayDat = d.NgayDat
            })
            .ToListAsync(ct);

        var maDonList = donHangs.Select(d => d.MaDon).ToList();

        // 2. Lấy tất cả bản ghi vận chuyển tương ứng của các đơn hàng này
        var vanChuyens = await _db.VanChuyens
            .AsNoTracking()
            .Where(v => maDonList.Contains(v.MaDon))
            .OrderByDescending(v => v.MaVc)
            .ToListAsync(ct);

        // 3. Kết hợp dữ liệu: ưu tiên bản ghi vận chuyển đang hoạt động (TrangThai != 'Huy')
        var list = donHangs.Select(d =>
        {
            var vc = vanChuyens.FirstOrDefault(v => v.MaDon == d.MaDon && v.TrangThai != "Huy")
                     ?? vanChuyens.FirstOrDefault(v => v.MaDon == d.MaDon);

            string trangThaiVc = vc != null
                ? vc.TrangThai
                : (string.Equals(d.TrangThaiDonHang, "Huy", StringComparison.OrdinalIgnoreCase) ? "Huy" : "ChuaGoi");

            return new
            {
                MaVc = vc != null ? vc.MaVc : 0,
                MaDon = d.MaDon,
                MaTraCuuDon = d.MaTraCuuDon,
                TenKhach = d.TenKhach,
                SdtKhach = d.SdtKhach,
                DiaChiGiao = d.DiaChiGiao,
                ViDoGiao = d.ViDoGiao,
                KinhDoGiao = d.KinhDoGiao,
                PhiThucTe = vc != null ? vc.PhiThucTe : 0m,
                LalamoveOrderId = vc != null ? vc.LalamoveOrderId : null,
                LinkTheoDoi = vc != null ? vc.LinkTheoDoi : null,
                TenTaiXe = vc != null ? vc.TenTaiXe : null,
                SdttaiXe = vc != null ? vc.SdttaiXe : null,
                TrangThai = trangThaiVc,
                TrangThaiDonHang = d.TrangThaiDonHang,
                PhuongThucTt = d.PhuongThucTt,
                TrangThaiTt = d.TrangThaiTt,
                TongTienDon = d.TongTienDon,
                NgayTao = vc != null ? vc.NgayTao : d.NgayDat
            };
        }).ToList();

        return Ok(list);
    }

    /// <summary>
    /// Thao tác Admin: Gọi tài xế Lalamove cho đơn hàng
    /// BẮT BUỘC: MaDon là mã đơn hàng gốc duy nhất từ DON_HANG
    /// </summary>
    [HttpPost("goi-tai-xe")]
    [Authorize(Roles = AdminController.AdminRole)]
    public async Task<IActionResult> GoiTaiXe([FromBody] GoiTaiXeRequest request, CancellationToken ct)
    {
        if (request == null || (request.MaDon <= 0 && (!request.MaVc.HasValue || request.MaVc.Value <= 0)))
        {
            return BadRequest(new { thanhCong = false, thongBao = "Thiếu thông tin mã đơn hàng (MaDon)." });
        }

        // 1. Xác định mã đơn hàng gốc (MaDon)
        int maDonGoc = request.MaDon;
        if (maDonGoc <= 0 && request.MaVc.HasValue && request.MaVc.Value > 0)
        {
            var vcGoc = await _db.VanChuyens.AsNoTracking().FirstOrDefaultAsync(v => v.MaVc == request.MaVc.Value, ct);
            if (vcGoc != null)
            {
                maDonGoc = vcGoc.MaDon;
            }
        }

        if (maDonGoc <= 0)
        {
            return BadRequest(new { thanhCong = false, thongBao = "Không xác định được mã đơn hàng gốc (MaDon) để thực hiện gọi tài xế." });
        }

        // 2. Truy vấn DON_HANG bằng MaDon
        var donHang = await _db.DonHangs.FirstOrDefaultAsync(d => d.MaDon == maDonGoc, ct);
        if (donHang == null)
        {
            return NotFound(new { thanhCong = false, thongBao = $"Không tìm thấy đơn hàng #{maDonGoc} trong hệ thống." });
        }

        // 3. Kiểm tra điều kiện đơn hàng
        if (string.Equals(donHang.TrangThai, "Huy", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { thanhCong = false, thongBao = $"Đơn hàng #{donHang.MaDon} đã bị hủy, không thể gọi tài xế giao hàng." });
        }

        if (string.Equals(donHang.TrangThai, "HoanThanh", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(donHang.TrangThai, "COMPLETED", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { thanhCong = false, thongBao = $"Đơn hàng #{donHang.MaDon} đã hoàn thành, không thể gọi tài xế mới." });
        }

        if (string.Equals(donHang.TrangThai, "ChoXacNhan", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { thanhCong = false, thongBao = $"Đơn hàng #{donHang.MaDon} đang ở trạng thái 'Chờ xác nhận'. Vui lòng duyệt xác nhận đơn hàng trước khi gọi tài xế." });
        }

        // 4. Kiểm tra địa chỉ và tọa độ giao hàng
        if (string.IsNullOrWhiteSpace(donHang.DiaChiGiao))
        {
            return BadRequest(new { thanhCong = false, thongBao = $"Đơn hàng #{donHang.MaDon} chưa có địa chỉ giao hàng." });
        }

        if (donHang.ViDo == 0 || donHang.KinhDo == 0)
        {
            var geo = await _ors.GeocodeAsync(donHang.DiaChiGiao, ct);
            if (geo == null || geo.ViDo == 0 || geo.KinhDo == 0)
            {
                return BadRequest(new { thanhCong = false, thongBao = $"Đơn hàng #{donHang.MaDon} chưa có tọa độ giao hàng và không thể tự động định vị địa chỉ '{donHang.DiaChiGiao}'." });
            }
            donHang.ViDo = geo.ViDo;
            donHang.KinhDo = geo.KinhDo;
        }

        // 5. Kiểm tra THANH_TOAN bằng MaDon
        var thanhToan = await _db.ThanhToans.AsNoTracking().FirstOrDefaultAsync(t => t.MaDon == donHang.MaDon, ct);
        if (thanhToan != null)
        {
            string phuongThuc = thanhToan.PhuongThuc?.Trim().ToUpperInvariant() ?? "";
            string trangThaiTt = thanhToan.TrangThai?.Trim() ?? "";

            if (phuongThuc == "MOMO" && trangThaiTt != "DaTT")
            {
                return BadRequest(new
                {
                    thanhCong = false,
                    thongBao = $"Đơn hàng #{donHang.MaDon} thanh toán qua MoMo nhưng chưa hoàn tất thanh toán (Trạng thái: {trangThaiTt}). Chỉ gọi tài xế khi thanh toán thành công."
                });
            }

            if (phuongThuc == "VNPAY" && trangThaiTt != "DaTT")
            {
                return BadRequest(new
                {
                    thanhCong = false,
                    thongBao = $"Đơn hàng #{donHang.MaDon} thanh toán qua VNPay nhưng chưa hoàn tất thanh toán (Trạng thái: {trangThaiTt}). Chỉ gọi tài xế khi thanh toán thành công."
                });
            }

            // Với phương thức COD: cho phép gọi tài xế khi đơn đã sẵn sàng giao, chưa bắt buộc DaTT
        }

        // 6. Kiểm tra VAN_CHUYEN bằng MaDon: đảm bảo không có chuyến vận chuyển nào đang hoạt động
        var activeVc = await _db.VanChuyens
            .OrderByDescending(v => v.MaVc)
            .FirstOrDefaultAsync(v => v.MaDon == donHang.MaDon && v.TrangThai != "Huy", ct);

        if (activeVc != null)
        {
            return BadRequest(new
            {
                thanhCong = false,
                thongBao = $"Đơn hàng #{donHang.MaDon} hiện đã có chuyến vận chuyển đang hoạt động (Mã VC: #{activeVc.MaVc}, Trạng thái: {activeVc.TrangThai}, Mã Lalamove: {activeVc.LalamoveOrderId}). Vui lòng hủy chuyến cũ trước khi gọi lại tài xế.",
                vanChuyen = new
                {
                    activeVc.MaVc,
                    activeVc.MaDon,
                    activeVc.LalamoveOrderId,
                    activeVc.TrangThai,
                    activeVc.TenTaiXe,
                    activeVc.SdttaiXe,
                    activeVc.PhiThucTe,
                    activeVc.LinkTheoDoi
                }
            });
        }

        // 7. Lấy dữ liệu gửi tới Lalamove API
        double viDoLay = _config.GetValue<double>("CuaHang:ViDo", 10.844788);
        double kinhDoLay = _config.GetValue<double>("CuaHang:KinhDo", 106.795180);
        string diaChiLay = _config["CuaHang:DiaChi"] ?? "450 Lê Văn Việt, Phường Tăng Nhơn Phú A, Thành phố Thủ Đức, Thành phố Hồ Chí Minh";
        string sdtQuan = _config["CuaHang:Sdt"] ?? "0901234567";

        double viDoGiao = donHang.ViDo;
        double kinhDoGiao = donHang.KinhDo;
        string diaChiGiao = donHang.DiaChiGiao;
        string tenKhach = !string.IsNullOrWhiteSpace(donHang.TenNguoiNhan) ? donHang.TenNguoiNhan.Trim() : "Khách hàng";
        string sdtKhach = !string.IsNullOrWhiteSpace(donHang.Sdt) ? donHang.Sdt.Trim() : "0900000000";

        var ketQua = await _lalamove.GoiTaiXeAsync(
            viDoLay, kinhDoLay, diaChiLay, sdtQuan,
            viDoGiao, kinhDoGiao, diaChiGiao, tenKhach, sdtKhach,
            ct);

        if (!ketQua.ThanhCong)
        {
            // Trả về thông báo lỗi cụ thể từ Lalamove, tuyệt đối không tạo bản ghi giả
            return BadRequest(new { thanhCong = false, thongBao = ketQua.ThongBao });
        }

        // 8. Chuẩn hóa SĐT tài xế (nếu có, Database quy định VARCHAR(10))
        string? sdtTaiXeDb = null;
        if (!string.IsNullOrWhiteSpace(ketQua.SdtTaiXe))
        {
            var digitsOnly = new string(ketQua.SdtTaiXe.Where(char.IsAsciiDigit).ToArray());
            if (digitsOnly.Length > 10)
            {
                digitsOnly = digitsOnly.StartsWith("84") ? ("0" + digitsOnly[2..]) : digitsOnly[^10..];
            }
            sdtTaiXeDb = digitsOnly.Length > 10 ? digitsOnly[..10] : digitsOnly;
        }

        // 9. Lưu bản ghi VAN_CHUYEN mới với MaDon = mã đơn hàng gốc
        var vcMoi = new VanChuyen
        {
            MaDon = donHang.MaDon, // Luôn dùng MaDon của đơn hàng gốc!
            LalamoveOrderId = ketQua.OrderId,
            PhiThucTe = ketQua.PhiThucTe ?? 0m,
            LinkTheoDoi = ketQua.LinkTheoDoi,
            TenTaiXe = ketQua.TenTaiXe,
            SdttaiXe = sdtTaiXeDb,
            TrangThai = "TimTaiXe", // Trạng thái ban đầu theo DF_VC_TrangThai
            NgayTao = DateTime.Now
        };

        _db.VanChuyens.Add(vcMoi);

        // 10. Cập nhật trạng thái đơn hàng sang "DangGiao"
        donHang.TrangThai = "DangGiao";

        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException dbEx)
        {
            _logger.LogError(dbEx, "Lỗi xung đột khi lưu vận chuyển cho đơn hàng #{MaDon}", donHang.MaDon);
            return Conflict(new
            {
                thanhCong = false,
                thongBao = "Xung đột dữ liệu: Đã có một yêu cầu vận chuyển khác vừa được tạo đồng thời cho đơn hàng này."
            });
        }

        _logger.LogInformation("Đã điều phối tài xế Lalamove thành công cho đơn hàng #{MaDon}: Mã VC #{MaVc}, LalamoveOrderId={LalamoveOrderId}",
            vcMoi.MaDon, vcMoi.MaVc, vcMoi.LalamoveOrderId);

        return Ok(new
        {
            thanhCong = true,
            thongBao = ketQua.ThongBao,
            maVc = vcMoi.MaVc,
            maDon = vcMoi.MaDon,
            lalamoveOrderId = vcMoi.LalamoveOrderId,
            phiThucTe = vcMoi.PhiThucTe,
            linkTheoDoi = vcMoi.LinkTheoDoi,
            trangThai = vcMoi.TrangThai,
            tenTaiXe = vcMoi.TenTaiXe,
            sdtTaiXe = vcMoi.SdttaiXe
        });
    }

    /// <summary>
    /// Thao tác Admin: Hủy yêu cầu giao hàng Lalamove
    /// Giữ nguyên lịch sử bản ghi VAN_CHUYEN cũ (chuyển TrangThai = 'Huy') và cho phép gọi lại
    /// </summary>
    [HttpPost("huy-don")]
    [Authorize(Roles = AdminController.AdminRole)]
    public async Task<IActionResult> HuyDon([FromBody] HuyGiaoHangRequest request, CancellationToken ct)
    {
        if (request == null || (request.MaDon <= 0 && (!request.MaVc.HasValue || request.MaVc.Value <= 0)))
        {
            return BadRequest(new { thanhCong = false, thongBao = "Thiếu thông tin đơn hàng hoặc mã vận chuyển cần hủy." });
        }

        int maDonGoc = request.MaDon;
        if (maDonGoc <= 0 && request.MaVc.HasValue && request.MaVc.Value > 0)
        {
            var vcGoc = await _db.VanChuyens.AsNoTracking().FirstOrDefaultAsync(v => v.MaVc == request.MaVc.Value, ct);
            if (vcGoc != null)
            {
                maDonGoc = vcGoc.MaDon;
            }
        }

        var vc = await _db.VanChuyens
            .OrderByDescending(v => v.MaVc)
            .FirstOrDefaultAsync(v => v.MaDon == maDonGoc && v.TrangThai != "Huy", ct);

        if (vc == null)
        {
            return NotFound(new { thanhCong = false, thongBao = $"Không tìm thấy đơn vận chuyển đang hoạt động cho đơn hàng #{maDonGoc}." });
        }

        if (!string.IsNullOrWhiteSpace(vc.LalamoveOrderId))
        {
            await _lalamove.HuyDonAsync(vc.LalamoveOrderId, request.LyDo ?? "Hủy từ quản trị viên Cơm Trưa Anh Béo", ct);
        }

        // Quy ước chuẩn: chuyển TrangThai thành 'Huy' (khớp với UX_VC_MotChuyenHoatDong index filter)
        vc.TrangThai = "Huy";

        // Cập nhật lại trạng thái đơn hàng về 'DaXacNhan' để Admin có thể gọi lại tài xế
        var donHang = await _db.DonHangs.FirstOrDefaultAsync(d => d.MaDon == vc.MaDon, ct);
        if (donHang != null && donHang.TrangThai == "DangGiao")
        {
            donHang.TrangThai = "DaXacNhan";
        }

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Đã hủy đơn vận chuyển #{MaVc} (Đơn hàng #{MaDon}) thành công.", vc.MaVc, vc.MaDon);

        return Ok(new
        {
            thanhCong = true,
            thongBao = "Đã hủy yêu cầu vận chuyển Lalamove thành công. Đơn hàng sẵn sàng để gọi lại tài xế khi cần.",
            maVc = vc.MaVc,
            maDon = vc.MaDon,
            trangThai = vc.TrangThai
        });
    }

    /// <summary>
    /// Thao tác Admin: Cập nhật thông tin tài xế và tiến độ giao hàng mới nhất từ Lalamove
    /// </summary>
    [HttpGet("cap-nhat-trang-thai/{maDon}")]
    [Authorize(Roles = AdminController.AdminRole)]
    public async Task<IActionResult> CapNhatTrangThaiVanChuyen(int maDon, CancellationToken ct)
    {
        if (maDon <= 0)
        {
            return BadRequest(new { thanhCong = false, thongBao = "Mã đơn hàng không hợp lệ." });
        }

        var vc = await _db.VanChuyens
            .OrderByDescending(v => v.MaVc)
            .FirstOrDefaultAsync(v => v.MaDon == maDon && v.TrangThai != "Huy", ct);

        if (vc == null || string.IsNullOrWhiteSpace(vc.LalamoveOrderId))
        {
            return NotFound(new { thanhCong = false, thongBao = $"Không tìm thấy chuyến vận chuyển Lalamove đang hoạt động cho đơn hàng #{maDon}." });
        }

        var info = await _lalamove.LayThongTinDonAsync(vc.LalamoveOrderId, ct);
        if (info == null)
        {
            return Ok(new
            {
                thanhCong = false,
                thongBao = "Không thể đồng bộ dữ liệu từ máy chủ Lalamove lúc này.",
                vanChuyen = new
                {
                    vc.MaVc,
                    vc.MaDon,
                    vc.LalamoveOrderId,
                    vc.TrangThai,
                    vc.TenTaiXe,
                    vc.SdttaiXe,
                    vc.LinkTheoDoi
                }
            });
        }

        // Cập nhật thông tin tài xế khi Lalamove đã gán tài xế
        if (!string.IsNullOrWhiteSpace(info.TenTaiXe))
        {
            vc.TenTaiXe = info.TenTaiXe;
        }

        if (!string.IsNullOrWhiteSpace(info.SdtTaiXe))
        {
            var digitsOnly = new string(info.SdtTaiXe.Where(char.IsAsciiDigit).ToArray());
            if (digitsOnly.Length > 10)
            {
                digitsOnly = digitsOnly.StartsWith("84") ? ("0" + digitsOnly[2..]) : digitsOnly[^10..];
            }
            vc.SdttaiXe = digitsOnly.Length > 10 ? digitsOnly[..10] : digitsOnly;
        }

        if (!string.IsNullOrWhiteSpace(info.ShareLink))
        {
            vc.LinkTheoDoi = info.ShareLink;
        }

        // Ánh xạ trạng thái Lalamove sang Database (VARCHAR(9))
        string llmStatus = info.Status.ToUpperInvariant();
        if (llmStatus == "COMPLETED")
        {
            vc.TrangThai = "HoanThanh";
            var don = await _db.DonHangs.FirstOrDefaultAsync(d => d.MaDon == vc.MaDon, ct);
            if (don != null) don.TrangThai = "HoanThanh";
        }
        else if (llmStatus == "CANCELED" || llmStatus == "CANCELLED" || llmStatus == "REJECTED" || llmStatus == "EXPIRED")
        {
            vc.TrangThai = "Huy";
            var don = await _db.DonHangs.FirstOrDefaultAsync(d => d.MaDon == vc.MaDon, ct);
            if (don != null && don.TrangThai == "DangGiao") don.TrangThai = "DaXacNhan";
        }
        else if (llmStatus == "ON_GOING" || llmStatus == "PICKED_UP")
        {
            vc.TrangThai = "DangGiao";
        }
        else
        {
            vc.TrangThai = "TimTaiXe";
        }

        await _db.SaveChangesAsync(ct);

        return Ok(new
        {
            thanhCong = true,
            thongBao = "Đã đồng bộ thông tin mới nhất từ Lalamove.",
            maVc = vc.MaVc,
            maDon = vc.MaDon,
            lalamoveOrderId = vc.LalamoveOrderId,
            trangThai = vc.TrangThai,
            tenTaiXe = vc.TenTaiXe,
            sdtTaiXe = vc.SdttaiXe,
            linkTheoDoi = vc.LinkTheoDoi,
            statusLalamove = info.Status
        });
    }

    /// <summary>
    /// Webhook tiếp nhận sự kiện cập nhật trạng thái đơn hàng tự động từ Lalamove
    /// </summary>
    [HttpPost("webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> LalamoveWebhook([FromBody] JsonElement body, CancellationToken ct)
    {
        try
        {
            _logger.LogInformation("Nhận webhook từ Lalamove: {Body}", body.ToString());

            if (body.TryGetProperty("data", out var dataEl) &&
                dataEl.TryGetProperty("order", out var orderEl) &&
                orderEl.TryGetProperty("orderId", out var orderIdProp))
            {
                string orderId = orderIdProp.GetString() ?? "";
                if (!string.IsNullOrWhiteSpace(orderId))
                {
                    var vc = await _db.VanChuyens
                        .OrderByDescending(v => v.MaVc)
                        .FirstOrDefaultAsync(v => v.LalamoveOrderId == orderId && v.TrangThai != "Huy", ct);

                    if (vc != null)
                    {
                        if (orderEl.TryGetProperty("status", out var stProp))
                        {
                            string llmStatus = stProp.GetString()?.ToUpperInvariant() ?? "";
                            if (llmStatus == "COMPLETED")
                            {
                                vc.TrangThai = "HoanThanh";
                                var don = await _db.DonHangs.FirstOrDefaultAsync(d => d.MaDon == vc.MaDon, ct);
                                if (don != null) don.TrangThai = "HoanThanh";
                            }
                            else if (llmStatus == "CANCELED" || llmStatus == "CANCELLED" || llmStatus == "REJECTED" || llmStatus == "EXPIRED")
                            {
                                vc.TrangThai = "Huy";
                                var don = await _db.DonHangs.FirstOrDefaultAsync(d => d.MaDon == vc.MaDon, ct);
                                if (don != null && don.TrangThai == "DangGiao") don.TrangThai = "DaXacNhan";
                            }
                            else if (llmStatus == "ON_GOING" || llmStatus == "PICKED_UP")
                            {
                                vc.TrangThai = "DangGiao";
                            }
                        }

                        if (orderEl.TryGetProperty("driver", out var drEl))
                        {
                            if (drEl.TryGetProperty("name", out var n)) vc.TenTaiXe = n.GetString();
                            if (drEl.TryGetProperty("phone", out var p) && p.GetString() is { Length: > 0 } ph)
                            {
                                var digits = new string(ph.Where(char.IsAsciiDigit).ToArray());
                                vc.SdttaiXe = digits.Length > 10 ? digits[^10..] : digits;
                            }
                        }

                        await _db.SaveChangesAsync(ct);
                    }
                }
            }

            return Ok(new { received = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi xử lý Lalamove Webhook.");
            return Ok(new { received = false, error = ex.Message });
        }
    }
}

public sealed class GoiTaiXeRequest
{
    public int MaDon { get; set; }
    public int? MaVc { get; set; }
}

public sealed class HuyGiaoHangRequest
{
    public int MaDon { get; set; }
    public int? MaVc { get; set; }
    public string? LyDo { get; set; }
}
