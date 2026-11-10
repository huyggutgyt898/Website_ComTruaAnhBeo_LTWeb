using System.Text;
using ComTruaAnhBeo.Models;
using ComTruaAnhBeo.Requests;
using ComTruaAnhBeo.Responses;
using Microsoft.EntityFrameworkCore;

namespace ComTruaAnhBeo.Services;

public sealed class StatisticsService : IStatisticsService
{
    private static readonly TimeZoneInfo VietnamTimeZone = GetVietnamTimeZone();

    private readonly ComTruaAnhBeoContext _db;
    private readonly ILogger<StatisticsService> _logger;

    public StatisticsService(
        ComTruaAnhBeoContext db,
        ILogger<StatisticsService> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Chức năng 1: Thống kê tổng quan doanh thu từ các đơn hàng đã hoàn tất
    /// </summary>
    public async Task<RevenueStatisticsResponse> GetRevenueStatisticsAsync(
        StatisticsFilterRequest filter,
        CancellationToken ct = default)
    {
        var range = ResolveDateRange(filter?.Preset, filter?.FromDate, filter?.ToDate);

        var completedOrdersQuery = _db.DonHangs
            .AsNoTracking()
            .Where(d => (d.TrangThai == "HoanThanh" || d.TrangThai == "COMPLETED") &&
                        d.NgayDat >= range.Start && d.NgayDat < range.EndExclusive);

        int totalCompleted = await completedOrdersQuery.CountAsync(ct);

        decimal totalRevenue = 0m;
        decimal paidAmount = 0m;
        decimal pendingAmount = 0m;

        if (totalCompleted > 0)
        {
            totalRevenue = await completedOrdersQuery.SumAsync(d => d.TongTien, ct);

            paidAmount = await completedOrdersQuery
                .Where(d => d.ThanhToan != null && d.ThanhToan.TrangThai == "DaTT")
                .SumAsync(d => d.TongTien, ct);

            pendingAmount = await completedOrdersQuery
                .Where(d => d.ThanhToan == null || d.ThanhToan.TrangThai == "ChuaTT")
                .SumAsync(d => d.TongTien, ct);
        }

        decimal aov = totalCompleted > 0
            ? Math.Round(totalRevenue / totalCompleted, 0)
            : 0m;

        return new RevenueStatisticsResponse
        {
            TongDoanhThu = totalRevenue,
            TongSoDonHoanThanh = totalCompleted,
            GiaTriDonTrungBinh = aov,
            TongTienDaThanhToan = paidAmount,
            TongTienChoThanhToan = pendingAmount,
            TuNgay = range.FromDisplay,
            DenNgay = range.ToDisplay
        };
    }

    /// <summary>
    /// Chức năng 1: Thống kê dữ liệu biểu đồ doanh thu theo chu kỳ ngày hoặc tháng
    /// </summary>
    public async Task<RevenueChartResponse> GetRevenueChartAsync(
        RevenueChartRequest request,
        CancellationToken ct = default)
    {
        var range = ResolveDateRange(request?.Preset, request?.FromDate, request?.ToDate);
        string period = string.Equals(request?.Period, "month", StringComparison.OrdinalIgnoreCase) ? "month" : "day";

        var completedOrdersQuery = _db.DonHangs
            .AsNoTracking()
            .Where(d => (d.TrangThai == "HoanThanh" || d.TrangThai == "COMPLETED") &&
                        d.NgayDat >= range.Start && d.NgayDat < range.EndExclusive);

        var result = new RevenueChartResponse
        {
            Period = period
        };

        if (period == "month")
        {
            var rawMonthly = await completedOrdersQuery
                .GroupBy(d => new { d.NgayDat.Year, d.NgayDat.Month })
                .Select(g => new
                {
                    Year = g.Key.Year,
                    Month = g.Key.Month,
                    DoanhThu = g.Sum(d => d.TongTien),
                    SoDon = g.Count(),
                    DaThuTien = g.Sum(d => d.ThanhToan != null && d.ThanhToan.TrangThai == "DaTT" ? d.TongTien : 0),
                    ChoThanhToan = g.Sum(d => d.ThanhToan == null || d.ThanhToan.TrangThai == "ChuaTT" ? d.TongTien : 0)
                })
                .ToListAsync(ct);

            var items = new List<RevenueChartItemResponse>();
            var curMonth = new DateTime(range.FromDisplay.Year, range.FromDisplay.Month, 1);
            var endMonth = new DateTime(range.ToDisplay.Year, range.ToDisplay.Month, 1);

            while (curMonth <= endMonth)
            {
                var match = rawMonthly.FirstOrDefault(m => m.Year == curMonth.Year && m.Month == curMonth.Month);
                items.Add(new RevenueChartItemResponse
                {
                    TimeLabel = $"Tháng {curMonth.Month:D2}/{curMonth.Year}",
                    Date = curMonth,
                    DoanhThu = match?.DoanhThu ?? 0m,
                    SoDon = match?.SoDon ?? 0,
                    DaThuTien = match?.DaThuTien ?? 0m,
                    ChoThanhToan = match?.ChoThanhToan ?? 0m
                });

                curMonth = curMonth.AddMonths(1);
            }

            result.Items = items;
            result.TongDoanhThu = items.Sum(i => i.DoanhThu);
            result.TongSoDon = items.Sum(i => i.SoDon);
        }
        else
        {
            var rawDaily = await completedOrdersQuery
                .GroupBy(d => d.NgayDat.Date)
                .Select(g => new
                {
                    Date = g.Key,
                    DoanhThu = g.Sum(d => d.TongTien),
                    SoDon = g.Count(),
                    DaThuTien = g.Sum(d => d.ThanhToan != null && d.ThanhToan.TrangThai == "DaTT" ? d.TongTien : 0),
                    ChoThanhToan = g.Sum(d => d.ThanhToan == null || d.ThanhToan.TrangThai == "ChuaTT" ? d.TongTien : 0)
                })
                .ToListAsync(ct);

            var items = new List<RevenueChartItemResponse>();
            for (var day = range.FromDisplay; day <= range.ToDisplay; day = day.AddDays(1))
            {
                var match = rawDaily.FirstOrDefault(d => d.Date == day);
                items.Add(new RevenueChartItemResponse
                {
                    TimeLabel = day.ToString("dd/MM/yyyy"),
                    Date = day,
                    DoanhThu = match?.DoanhThu ?? 0m,
                    SoDon = match?.SoDon ?? 0,
                    DaThuTien = match?.DaThuTien ?? 0m,
                    ChoThanhToan = match?.ChoThanhToan ?? 0m
                });
            }

            result.Items = items;
            result.TongDoanhThu = items.Sum(i => i.DoanhThu);
            result.TongSoDon = items.Sum(i => i.SoDon);
        }

        return result;
    }

    /// <summary>
    /// Chức năng 1: Thống kê các phương thức thanh toán (COD, MOMO, VNPAY) và trạng thái thanh toán (DaTT, ChuaTT, HetHan)
    /// </summary>
    public async Task<PaymentStatisticsResponse> GetPaymentStatisticsAsync(
        StatisticsFilterRequest filter,
        CancellationToken ct = default)
    {
        var range = ResolveDateRange(filter?.Preset, filter?.FromDate, filter?.ToDate);

        var query = _db.ThanhToans
            .AsNoTracking()
            .Where(t => (t.MaDonNavigation.TrangThai == "HoanThanh" || t.MaDonNavigation.TrangThai == "COMPLETED") &&
                        t.MaDonNavigation.NgayDat >= range.Start && t.MaDonNavigation.NgayDat < range.EndExclusive);

        int totalTx = await query.CountAsync(ct);
        decimal totalAmount = totalTx > 0 ? await query.SumAsync(t => t.SoTien, ct) : 0m;

        decimal paidAmount = await query
            .Where(t => t.TrangThai == "DaTT")
            .SumAsync(t => t.SoTien, ct);

        decimal pendingAmount = await query
            .Where(t => t.TrangThai == "ChuaTT")
            .SumAsync(t => t.SoTien, ct);

        // Phân loại theo phương thức
        var methodGroups = await query
            .GroupBy(t => t.PhuongThuc)
            .Select(g => new
            {
                PhuongThuc = g.Key,
                SoLuong = g.Count(),
                TongTien = g.Sum(x => x.SoTien)
            })
            .ToListAsync(ct);

        var methodList = new List<PaymentMethodStatResponse>();
        // Ưu tiên đảm bảo các phương thức chính (COD, MOMO, VNPAY) luôn có mặt
        var knownMethods = new[] { "COD", "MOMO", "VNPAY" };
        var handledMethods = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var m in knownMethods)
        {
            var match = methodGroups.FirstOrDefault(x => string.Equals(x.PhuongThuc, m, StringComparison.OrdinalIgnoreCase));
            int sl = match?.SoLuong ?? 0;
            decimal tt = match?.TongTien ?? 0m;
            double tyLe = totalAmount > 0 ? Math.Round((double)(tt / totalAmount * 100), 2) : 0;

            methodList.Add(new PaymentMethodStatResponse
            {
                PhuongThuc = m,
                TenPhuongThuc = GetMethodDisplayName(m),
                SoLuong = sl,
                TongTien = tt,
                TyLe = tyLe
            });
            handledMethods.Add(m);
        }

        foreach (var mg in methodGroups)
        {
            if (!handledMethods.Contains(mg.PhuongThuc))
            {
                double tyLe = totalAmount > 0 ? Math.Round((double)(mg.TongTien / totalAmount * 100), 2) : 0;
                methodList.Add(new PaymentMethodStatResponse
                {
                    PhuongThuc = mg.PhuongThuc,
                    TenPhuongThuc = GetMethodDisplayName(mg.PhuongThuc),
                    SoLuong = mg.SoLuong,
                    TongTien = mg.TongTien,
                    TyLe = tyLe
                });
            }
        }

        // Phân loại theo trạng thái
        var statusGroups = await query
            .GroupBy(t => t.TrangThai)
            .Select(g => new
            {
                TrangThai = g.Key,
                SoLuong = g.Count(),
                TongTien = g.Sum(x => x.SoTien)
            })
            .ToListAsync(ct);

        var statusList = new List<PaymentStatusStatResponse>();
        var knownStatuses = new[] { "DaTT", "ChuaTT", "HetHan" };
        var handledStatuses = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var s in knownStatuses)
        {
            var match = statusGroups.FirstOrDefault(x => string.Equals(x.TrangThai, s, StringComparison.OrdinalIgnoreCase));
            int sl = match?.SoLuong ?? 0;
            decimal tt = match?.TongTien ?? 0m;
            double tyLe = totalTx > 0 ? Math.Round((double)sl / totalTx * 100, 2) : 0;

            statusList.Add(new PaymentStatusStatResponse
            {
                TrangThai = s,
                TenTrangThai = GetStatusDisplayName(s),
                SoLuong = sl,
                TongTien = tt,
                TyLe = tyLe
            });
            handledStatuses.Add(s);
        }

        foreach (var sg in statusGroups)
        {
            if (!handledStatuses.Contains(sg.TrangThai))
            {
                double tyLe = totalTx > 0 ? Math.Round((double)sg.SoLuong / totalTx * 100, 2) : 0;
                statusList.Add(new PaymentStatusStatResponse
                {
                    TrangThai = sg.TrangThai,
                    TenTrangThai = GetStatusDisplayName(sg.TrangThai),
                    SoLuong = sg.SoLuong,
                    TongTien = sg.TongTien,
                    TyLe = tyLe
                });
            }
        }

        return new PaymentStatisticsResponse
        {
            TongGiaoDich = totalTx,
            TongTien = totalAmount,
            TongTienDaThanhToan = paidAmount,
            TongTienChuaThanhToan = pendingAmount,
            TheoPhuongThuc = methodList,
            TheoTrangThai = statusList
        };
    }

    /// <summary>
    /// Chức năng 2: Thống kê Top món bán chạy (chỉ xét LoaiMon = "Chinh", không tính món phụ/canh/nước, gộp theo size)
    /// </summary>
    public async Task<TopProductListResponse> GetTopProductsAsync(
        TopProductRequest request,
        CancellationToken ct = default)
    {
        var range = ResolveDateRange(request?.Preset, request?.FromDate, request?.ToDate);
        int limit = request?.Top is int t && t > 0 ? t : 5;

        // Chỉ truy vấn chi tiết các món chính từ đơn hàng hoàn thành
        var mainDishDetailsQuery = _db.CtDonHangs
            .AsNoTracking()
            .Where(ctdh => (ctdh.MaDonNavigation.TrangThai == "HoanThanh" || ctdh.MaDonNavigation.TrangThai == "COMPLETED") &&
                           ctdh.MaDonNavigation.NgayDat >= range.Start && ctdh.MaDonNavigation.NgayDat < range.EndExclusive &&
                           ctdh.MaMonNavigation.LoaiMon == "Chinh");

        var dishGrouped = await mainDishDetailsQuery
            .GroupBy(ctdh => new
            {
                ctdh.MaMon,
                ctdh.MaMonNavigation.TenMon,
                ctdh.MaMonNavigation.DanhMuc,
                ctdh.MaMonNavigation.HinhAnh
            })
            .Select(g => new
            {
                MaMon = g.Key.MaMon,
                TenMon = g.Key.TenMon,
                DanhMuc = g.Key.DanhMuc,
                HinhAnh = g.Key.HinhAnh,
                SoLuongBan = g.Sum(x => x.SoLuong),
                DoanhThuMon = g.Sum(x => (decimal)x.SoLuong * x.DonGia)
            })
            .OrderByDescending(x => x.SoLuongBan)
            .ThenByDescending(x => x.DoanhThuMon)
            .ToListAsync(ct);

        // Tính tổng doanh thu và tổng sản lượng trên TOÀN BỘ món chính hợp lệ cùng kỳ
        decimal totalRevenueAllMainDishes = dishGrouped.Sum(x => x.DoanhThuMon);
        int totalQtyAllMainDishes = dishGrouped.Sum(x => x.SoLuongBan);

        var topItems = dishGrouped
            .Take(limit)
            .Select((d, index) => new TopProductResponse
            {
                Hang = index + 1,
                MaMon = d.MaMon,
                TenMon = d.TenMon,
                DanhMuc = d.DanhMuc,
                HinhAnh = d.HinhAnh,
                SoLuongBan = d.SoLuongBan,
                DoanhThuMon = d.DoanhThuMon,
                TyTrong = totalRevenueAllMainDishes > 0
                    ? Math.Round((double)(d.DoanhThuMon / totalRevenueAllMainDishes * 100), 2)
                    : 0
            })
            .ToList();

        return new TopProductListResponse
        {
            Items = topItems,
            TongDoanhThuTatCaMonChinh = totalRevenueAllMainDishes,
            TongSoLuongTatCaMonChinh = totalQtyAllMainDishes,
            Limit = limit,
            TuNgay = range.FromDisplay,
            DenNgay = range.ToDisplay
        };
    }

    /// <summary>
    /// Chức năng 3: Thống kê đánh giá khách hàng (tổng lượt, điểm trung bình, cơ cấu 1-5 sao)
    /// </summary>
    public async Task<ReviewStatisticsResponse> GetReviewStatisticsAsync(
        StatisticsFilterRequest filter,
        CancellationToken ct = default)
    {
        var range = ResolveDateRange(filter?.Preset, filter?.FromDate, filter?.ToDate);

        var query = _db.DanhGia
            .AsNoTracking()
            .Where(dg => dg.NgayDg >= range.Start && dg.NgayDg < range.EndExclusive);

        int totalReviews = await query.CountAsync(ct);

        double avgScore = 0.0;
        if (totalReviews > 0)
        {
            avgScore = Math.Round(await query.AverageAsync(dg => (double)dg.SoSao, ct), 1);
        }

        var starCounts = await query
            .GroupBy(dg => dg.SoSao)
            .Select(g => new { SoSao = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var starDetails = new List<StarRatingDetailResponse>();
        for (byte star = 5; star >= 1; star--)
        {
            int count = starCounts.FirstOrDefault(x => x.SoSao == star)?.Count ?? 0;
            double percentage = totalReviews > 0
                ? Math.Round((double)count / totalReviews * 100, 1)
                : 0.0;

            starDetails.Add(new StarRatingDetailResponse
            {
                SoSao = star,
                SoLuot = count,
                TyLe = percentage
            });
        }

        return new ReviewStatisticsResponse
        {
            TongLuotDanhGia = totalReviews,
            DiemTrungBinh = avgScore,
            ChiTietSao = starDetails,
            TuNgay = range.FromDisplay,
            DenNgay = range.ToDisplay
        };
    }

    /// <summary>
    /// Chức năng 3: Lấy danh sách nhận xét gần đây của khách hàng theo phân trang và lọc số sao
    /// </summary>
    public async Task<RecentReviewsPagedResponse> GetRecentReviewsAsync(
        ReviewFilterRequest request,
        CancellationToken ct = default)
    {
        var range = ResolveDateRange(request?.Preset, request?.FromDate, request?.ToDate);

        int validPage = Math.Max(1, request?.Page ?? 1);
        int validPageSize = request?.PageSize switch
        {
            null or <= 0 => 10,
            > 100 => 100,
            _ => request.PageSize
        };

        var query = _db.DanhGia
            .AsNoTracking()
            .Where(dg => dg.NgayDg >= range.Start && dg.NgayDg < range.EndExclusive);

        if (request?.SoSao is byte star && star >= 1 && star <= 5)
        {
            query = query.Where(dg => dg.SoSao == star);
        }

        int totalItems = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(dg => dg.NgayDg)
            .Skip((validPage - 1) * validPageSize)
            .Take(validPageSize)
            .Select(dg => new RecentReviewResponse
            {
                MaDg = dg.MaDg,
                MaTk = dg.MaTk,
                SoSao = dg.SoSao,
                NhanXet = dg.NhanXet ?? string.Empty,
                NgayDg = dg.NgayDg
            })
            .ToListAsync(ct);

        return new RecentReviewsPagedResponse
        {
            Items = items,
            TotalItems = totalItems,
            Page = validPage,
            PageSize = validPageSize
        };
    }

    /// <summary>
    /// Chức năng Xuất báo cáo: Tạo file CSV chuẩn UTF-8 có BOM (tương thích Microsoft Excel)
    /// </summary>
    public async Task<(byte[] FileBytes, string ContentType, string FileName)> ExportReportAsync(
        ExportReportRequest request,
        CancellationToken ct = default)
    {
        string reportType = request?.Type?.Trim().ToLowerInvariant() ?? "revenue";
        var range = ResolveDateRange(request?.Preset, request?.FromDate, request?.ToDate);

        var sb = new StringBuilder();

        string fileName;
        switch (reportType)
        {
            case "top-products":
            case "mon-ban-chay":
                var topReq = new TopProductRequest
                {
                    Preset = request?.Preset,
                    FromDate = request?.FromDate,
                    ToDate = request?.ToDate,
                    Top = request?.Top ?? 10
                };
                var topData = await GetTopProductsAsync(topReq, ct);

                fileName = $"BaoCao_MonBanChay_{range.FromDisplay:yyyyMMdd}_{range.ToDisplay:yyyyMMdd}.csv";

                sb.AppendLine("BÁO CÁO MÓN CHÍNH BÁN CHẠY - CƠM TRƯA ANH BÉO");
                sb.AppendLine($"Khoảng thời gian: Từ {range.FromDisplay:dd/MM/yyyy} đến {range.ToDisplay:dd/MM/yyyy}");
                sb.AppendLine($"Tổng sản lượng bán món chính: {topData.TongSoLuongTatCaMonChinh}");
                sb.AppendLine($"Tổng doanh thu món chính: {topData.TongDoanhThuTatCaMonChinh:N0} VNĐ");
                sb.AppendLine();
                sb.AppendLine("Hạng,Mã món,Tên món ăn,Nhóm thực đơn,Số lượng bán,Doanh thu món (VNĐ),Tỷ trọng (%)");

                foreach (var item in topData.Items)
                {
                    sb.AppendLine($"{item.Hang},{item.MaMon},{EscapeCsv(item.TenMon)},{EscapeCsv(item.DanhMuc)},{item.SoLuongBan},{item.DoanhThuMon:N0},{item.TyTrong:F2}%");
                }
                break;

            case "reviews":
            case "danh-gia":
                var revSummary = await GetReviewStatisticsAsync(request ?? new StatisticsFilterRequest(), ct);
                var revReq = new ReviewFilterRequest
                {
                    Preset = request?.Preset,
                    FromDate = request?.FromDate,
                    ToDate = request?.ToDate,
                    SoSao = request?.SoSao,
                    Page = 1,
                    PageSize = 1000
                };
                var revData = await GetRecentReviewsAsync(revReq, ct);

                fileName = $"BaoCao_DanhGia_{range.FromDisplay:yyyyMMdd}_{range.ToDisplay:yyyyMMdd}.csv";

                sb.AppendLine("BÁO CÁO ĐÁNH GIÁ KHÁCH HÀNG - CƠM TRƯA ANH BÉO");
                sb.AppendLine($"Khoảng thời gian: Từ {range.FromDisplay:dd/MM/yyyy} đến {range.ToDisplay:dd/MM/yyyy}");
                sb.AppendLine($"Tổng lượt đánh giá: {revSummary.TongLuotDanhGia}");
                sb.AppendLine($"Điểm đánh giá trung bình: {revSummary.DiemTrungBinh:F1} / 5.0");
                sb.AppendLine();
                sb.AppendLine("Mã đánh giá,Mã tài khoản,Số sao,Ngày gửi,Nội dung nhận xét");

                foreach (var item in revData.Items)
                {
                    sb.AppendLine($"{item.MaDg},{item.MaTk},{item.SoSao} sao,{item.NgayDg:dd/MM/yyyy HH:mm},{EscapeCsv(item.NhanXet)}");
                }
                break;

            case "revenue":
            default:
                var revSummaryData = await GetRevenueStatisticsAsync(request ?? new StatisticsFilterRequest(), ct);
                var chartReq = new RevenueChartRequest
                {
                    Preset = request?.Preset,
                    FromDate = request?.FromDate,
                    ToDate = request?.ToDate,
                    Period = request?.Period ?? "day"
                };
                var chartData = await GetRevenueChartAsync(chartReq, ct);

                fileName = $"BaoCao_DoanhThu_{range.FromDisplay:yyyyMMdd}_{range.ToDisplay:yyyyMMdd}.csv";

                sb.AppendLine("BÁO CÁO DOANH THU & THANH TOÁN - CƠM TRƯA ANH BÉO");
                sb.AppendLine($"Khoảng thời gian: Từ {range.FromDisplay:dd/MM/yyyy} đến {range.ToDisplay:dd/MM/yyyy}");
                sb.AppendLine($"Tổng doanh thu đơn hoàn thành: {revSummaryData.TongDoanhThu:N0} VNĐ");
                sb.AppendLine($"Tổng số đơn hoàn thành: {revSummaryData.TongSoDonHoanThanh}");
                sb.AppendLine($"Giá trị đơn trung bình (AOV): {revSummaryData.GiaTriDonTrungBinh:N0} VNĐ");
                sb.AppendLine($"Tiền thực tế đã thanh toán: {revSummaryData.TongTienDaThanhToan:N0} VNĐ");
                sb.AppendLine($"Tiền chờ thanh toán: {revSummaryData.TongTienChoThanhToan:N0} VNĐ");
                sb.AppendLine();
                sb.AppendLine("Thời gian,Số đơn hoàn tất,Đã thu tiền (VNĐ),Chờ thanh toán (VNĐ),Doanh thu (VNĐ)");

                foreach (var item in chartData.Items)
                {
                    sb.AppendLine($"{EscapeCsv(item.TimeLabel)},{item.SoDon},{item.DaThuTien:N0},{item.ChoThanhToan:N0},{item.DoanhThu:N0}");
                }
                break;
        }

        // Tạo buffer với UTF-8 BOM để Excel hiển thị đúng dấu tiếng Việt
        byte[] preamble = Encoding.UTF8.GetPreamble();
        byte[] contentBytes = Encoding.UTF8.GetBytes(sb.ToString());

        byte[] fileBytes = new byte[preamble.Length + contentBytes.Length];
        Buffer.BlockCopy(preamble, 0, fileBytes, 0, preamble.Length);
        Buffer.BlockCopy(contentBytes, 0, fileBytes, preamble.Length, contentBytes.Length);

        return (fileBytes, "text/csv; charset=utf-8", fileName);
    }

    #region Helper Methods

    private static (DateTime Start, DateTime EndExclusive, DateTime FromDisplay, DateTime ToDisplay) ResolveDateRange(
        string? preset,
        DateTime? fromDate,
        DateTime? toDate)
    {
        var nowVn = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, VietnamTimeZone);
        var today = nowVn.Date;

        DateTime from;
        DateTime to;

        var normalizedPreset = preset?.Trim().ToLowerInvariant();
        switch (normalizedPreset)
        {
            case "today":
            case "hom-nay":
                from = today;
                to = today;
                break;

            case "7days":
            case "7-days":
            case "7ngay":
                from = today.AddDays(-6);
                to = today;
                break;

            case "this_month":
            case "this-month":
            case "thang-nay":
                from = new DateTime(today.Year, today.Month, 1);
                to = today;
                break;

            case "last_month":
            case "last-month":
            case "thang-truoc":
                var firstOfThisMonth = new DateTime(today.Year, today.Month, 1);
                var lastOfLastMonth = firstOfThisMonth.AddDays(-1);
                from = new DateTime(lastOfLastMonth.Year, lastOfLastMonth.Month, 1);
                to = lastOfLastMonth;
                break;

            default:
                from = fromDate?.Date ?? new DateTime(today.Year, today.Month, 1);
                to = toDate?.Date ?? today;
                if (from > to)
                {
                    (from, to) = (to, from);
                }
                break;
        }

        var start = from;
        var endExclusive = to.AddDays(1);
        return (start, endExclusive, from, to);
    }

    private static TimeZoneInfo GetVietnamTimeZone()
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
        }
        catch (TimeZoneNotFoundException)
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById("Asia/Ho_Chi_Minh");
            }
            catch (Exception)
            {
                return TimeZoneInfo.Utc;
            }
        }
    }

    private static string GetMethodDisplayName(string method)
    {
        return method.ToUpperInvariant() switch
        {
            "COD" => "Tiền mặt khi nhận hàng (COD)",
            "MOMO" => "Ví điện tử MoMo",
            "VNPAY" => "Cổng thanh toán VNPAY",
            _ => method
        };
    }

    private static string GetStatusDisplayName(string status)
    {
        return status switch
        {
            "DaTT" => "Đã thanh toán",
            "ChuaTT" => "Chưa thanh toán",
            "HetHan" => "Hết hạn thanh toán",
            _ => status
        };
    }

    private static string EscapeCsv(string? value)
    {
        if (string.IsNullOrEmpty(value)) return "\"\"";
        return "\"" + value.Replace("\"", "\"\"").Replace("\r", " ").Replace("\n", " ") + "\"";
    }

    #endregion
}
