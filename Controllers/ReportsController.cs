using System.Globalization;
using System.Text;
using ComTruaAnhBeo.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ComTruaAnhBeo.Controllers;

/// <summary>
/// API cho trang Admin: Thống kê &amp; báo cáo.
/// Tất cả endpoint đều chỉ dành cho Admin và chỉ đọc dữ liệu (GET).
/// </summary>
[Route("admin/api/reports")]
[Authorize(Roles = AdminController.AdminRole)]
[ApiController]
public sealed class ReportsController : ControllerBase
{
    // ------------------------------------------------------------------------
    // CẦN XÁC NHẬN VỚI DB: các mã trạng thái dưới đây là phỏng đoán.
    // Chạy các câu SQL sau rồi sửa lại danh sách cho đúng:
    //   SELECT DISTINCT TrangThai FROM DON_HANG;
    //   SELECT DISTINCT TrangThai FROM THANH_TOAN;
    // So sánh không phân biệt hoa thường (collation Vietnamese_CI_AS).
    // ------------------------------------------------------------------------
    private static readonly string[] CompletedOrderCodes = { "HoanTat", "HoanThanh" };
    private static readonly string[] PaidPaymentCodes = { "DaTT", "DaThu", "DaTra" };

    private const int MaxRangeDays = 732;
    private const int MaxReviewRows = 500;

    private readonly ComTruaAnhBeoContext _db;

    public ReportsController(ComTruaAnhBeoContext db)
    {
        _db = db;
    }

    // ========================================================================
    // 1. DOANH THU
    // GET /admin/api/reports/revenue?period=day|month&from=yyyy-MM-dd&to=yyyy-MM-dd
    //     &excludeCanceled=true&separatePayment=true
    // ========================================================================
    [HttpGet("revenue")]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public async Task<IActionResult> Revenue(
        string? period, [FromQuery(Name = "from")] DateTime? fromDate, [FromQuery(Name = "to")] DateTime? toDate,
        bool excludeCanceled = true, bool separatePayment = true)
    {
        if (!TryGetRange(fromDate, toDate, out var start, out var endExclusive, out var error))
        {
            return BadRequest(new { message = error });
        }

        var data = await BuildRevenueAsync(
            string.Equals(period, "month", StringComparison.OrdinalIgnoreCase),
            start, endExclusive, excludeCanceled, separatePayment);

        return Ok(data);
    }

    // ========================================================================
    // 2. MÓN BÁN CHẠY
    // GET /admin/api/reports/top-dishes?limit=5|10&from=...&to=...
    // ========================================================================
    [HttpGet("top-dishes")]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public async Task<IActionResult> TopDishes(int limit = 5, [FromQuery(Name = "from")] DateTime? fromDate = null, [FromQuery(Name = "to")] DateTime? toDate = null)
    {
        if (!TryGetRange(fromDate, toDate, out var start, out var endExclusive, out var error))
        {
            return BadRequest(new { message = error });
        }

        limit = limit is 5 or 10 ? limit : 5;
        return Ok(await BuildTopDishesAsync(limit, start, endExclusive));
    }

    // ========================================================================
    // 3. ĐÁNH GIÁ CỦA KHÁCH
    // GET /admin/api/reports/reviews?stars=ALL|1..5&from=...&to=...
    // ========================================================================
    [HttpGet("reviews")]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public async Task<IActionResult> Reviews(string? stars, [FromQuery(Name = "from")] DateTime? fromDate = null, [FromQuery(Name = "to")] DateTime? toDate = null)
    {
        if (!TryGetRange(fromDate, toDate, out var start, out var endExclusive, out var error))
        {
            return BadRequest(new { message = error });
        }

        return Ok(await BuildReviewsAsync(ParseStars(stars), start, endExclusive));
    }

    // ========================================================================
    // 4. CHI PHÍ LALAMOVE
    // GET /admin/api/reports/lalamove?from=...&to=...
    // ========================================================================
    [HttpGet("lalamove")]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public async Task<IActionResult> Lalamove([FromQuery(Name = "from")] DateTime? fromDate = null, [FromQuery(Name = "to")] DateTime? toDate = null)
    {
        if (!TryGetRange(fromDate, toDate, out var start, out var endExclusive, out var error))
        {
            return BadRequest(new { message = error });
        }

        return Ok(await BuildLalamoveAsync(start, endExclusive));
    }

    // ========================================================================
    // XUẤT BÁO CÁO CSV (mở được bằng Excel)
    // GET /admin/api/reports/export?tab=revenue|top-dishes|reviews|lalamove
    //     &from=...&to=...&period=day|month&limit=5|10&stars=ALL|1..5
    //     &excludeCanceled=true&separatePayment=true
    // ========================================================================
    [HttpGet("export")]
    public async Task<IActionResult> Export(
        string? tab, string? period, int limit = 5, string? stars = null,
        [FromQuery(Name = "from")] DateTime? fromDate = null, [FromQuery(Name = "to")] DateTime? toDate = null,
        bool excludeCanceled = true, bool separatePayment = true)
    {
        if (!TryGetRange(fromDate, toDate, out var start, out var endExclusive, out var error))
        {
            return BadRequest(new { message = error });
        }

        var csv = new CsvBuilder();
        var rangeText = $"{start:dd/MM/yyyy} - {endExclusive.AddDays(-1):dd/MM/yyyy}";
        string fileTab;

        switch ((tab ?? "revenue").ToLowerInvariant())
        {
            case "top-dishes":
                {
                    fileTab = "mon-ban-chay";
                    var d = await BuildTopDishesAsync(limit is 5 or 10 ? limit : 5, start, endExclusive);
                    csv.Row("Bao cao mon ban chay", rangeText);
                    csv.Row("Hang", "Ten mon", "Nhom thuc don", "So luong ban", "Doanh thu mon (VND)", "Ty trong (%)");
                    foreach (var r in d.Items)
                    {
                        csv.Row(r.Rank, r.Name, r.Category, r.Quantity, r.Revenue, r.SharePercent);
                    }
                    break;
                }
            case "reviews":
                {
                    fileTab = "danh-gia";
                    var d = await BuildReviewsAsync(ParseStars(stars), start, endExclusive);
                    csv.Row("Bao cao danh gia khach hang", rangeText);
                    csv.Row("Diem trung binh", d.Summary.Average, "Tong luot", d.Summary.Total);
                    csv.Row("Khach hang", "So sao", "Noi dung", "Ngay gui", "Phan loai");
                    foreach (var r in d.Items)
                    {
                        csv.Row(r.Customer, r.Stars, r.Content, r.Date, r.Sentiment);
                    }
                    break;
                }
            case "lalamove":
                {
                    fileTab = "lalamove";
                    var d = await BuildLalamoveAsync(start, endExclusive);
                    csv.Row("Bao cao chi phi Lalamove", rangeText);
                    csv.Row("Ma don", "Ngay giao", "Tai xe", "Khach tra (VND)", "Cuoc Lalamove (VND)",
                        "Quan tro gia (VND)", "Chenh lech (VND)");
                    foreach (var r in d.Items)
                    {
                        csv.Row(r.OrderCode, r.Date, r.Driver, r.CustomerPaid, r.ActualFee, r.Subsidy, r.Difference);
                    }
                    break;
                }
            default:
                {
                    fileTab = "doanh-thu";
                    var isMonth = string.Equals(period, "month", StringComparison.OrdinalIgnoreCase);
                    var d = await BuildRevenueAsync(isMonth, start, endExclusive, excludeCanceled, separatePayment);
                    csv.Row("Bao cao doanh thu", rangeText);
                    csv.Row("Thoi gian", "So don", "Don da thu tien", "Don cho thanh toan",
                        "Tien da thu (VND)", "Tien cho thu (VND)", "Doanh thu (VND)");
                    foreach (var r in d.Rows)
                    {
                        csv.Row(r.Label, r.Orders, r.PaidOrders, r.PendingOrders, r.PaidAmount, r.PendingAmount, r.Revenue);
                    }
                    csv.Row("TONG", d.Kpi.CompletedOrders, "", "", "", "", d.Kpi.TotalRevenue);
                    break;
                }
        }

        // BOM để Excel đọc đúng tiếng Việt UTF-8
        var bytes = new UTF8Encoding(encoderShouldEmitUTF8Identifier: true).GetBytes(csv.ToString());
        var fileName = $"bao-cao-{fileTab}-{start:yyyyMMdd}-{endExclusive.AddDays(-1):yyyyMMdd}.csv";
        return File(bytes, "text/csv; charset=utf-8", fileName);
    }

    // ========================================================================
    // XÂY DỰNG DỮ LIỆU
    // ========================================================================
    private async Task<RevenueResult> BuildRevenueAsync(
        bool byMonth, DateTime start, DateTime endExclusive, bool excludeCanceled, bool separatePayment)
    {
        var query = _db.DonHangs
            .AsNoTracking()
            .Where(o => o.NgayDat >= start && o.NgayDat < endExclusive);

        // Bật "loại trừ đơn hủy": chỉ tính đơn đã hoàn tất.
        // Tắt: tính mọi đơn trong khoảng thời gian (kể cả đơn hủy).
        if (excludeCanceled)
        {
            query = query.Where(o => CompletedOrderCodes.Contains(o.TrangThai));
        }

        var orders = await query
            .Select(o => new
            {
                o.NgayDat,
                o.TongTien,
                PayStatus = o.ThanhToan != null ? o.ThanhToan.TrangThai : null
            })
            .ToListAsync();

        var rows = orders
            .GroupBy(o => byMonth
                ? new DateTime(o.NgayDat.Year, o.NgayDat.Month, 1)
                : o.NgayDat.Date)
            .OrderBy(g => g.Key)
            .Select(g =>
            {
                var paid = g.Where(o => IsPaid(o.PayStatus)).ToList();
                var pending = g.Where(o => !IsPaid(o.PayStatus)).ToList();
                var paidAmount = paid.Sum(o => o.TongTien);
                var pendingAmount = pending.Sum(o => o.TongTien);

                return new RevenueRow(
                    Label: byMonth ? g.Key.ToString("MM/yyyy") : g.Key.ToString("dd/MM/yyyy"),
                    Orders: g.Count(),
                    PaidOrders: paid.Count,
                    PendingOrders: pending.Count,
                    PaidAmount: paidAmount,
                    PendingAmount: pendingAmount,
                    // Bật "tách biệt thu tiền": doanh thu = tiền đã thu thực tế.
                    // Tắt: doanh thu = tổng giá trị đơn (đã thu + chờ thu).
                    Revenue: separatePayment ? paidAmount : paidAmount + pendingAmount);
            })
            .ToList();

        var totalRevenue = rows.Sum(r => r.Revenue);
        var totalOrders = rows.Sum(r => r.Orders);
        var aov = totalOrders > 0 ? Math.Round(totalRevenue / totalOrders, 0) : 0m;

        return new RevenueResult(
            Period: byMonth ? "month" : "day",
            Kpi: new RevenueKpi(totalRevenue, totalOrders, aov),
            Rows: rows);
    }

    private async Task<TopDishesResult> BuildTopDishesAsync(int limit, DateTime start, DateTime endExclusive)
    {
        var lines = await _db.CtDonHangs
            .AsNoTracking()
            .Where(c => c.MaDonNavigation.NgayDat >= start
                        && c.MaDonNavigation.NgayDat < endExclusive
                        && CompletedOrderCodes.Contains(c.MaDonNavigation.TrangThai))
            .Select(c => new { c.MaMon, c.SoLuong, c.DonGia })
            .ToListAsync();

        var grouped = lines
            .GroupBy(l => l.MaMon)
            .Select(g => new
            {
                MaMon = g.Key,
                Quantity = g.Sum(l => l.SoLuong),
                Revenue = g.Sum(l => l.SoLuong * l.DonGia)
            })
            .OrderByDescending(x => x.Quantity)
            .ThenByDescending(x => x.Revenue)
            .ToList();

        var totalRevenue = grouped.Sum(x => x.Revenue);
        var top = grouped.Take(limit).ToList();
        var ids = top.Select(x => x.MaMon).ToList();

        var dishes = await _db.MonAns
            .AsNoTracking()
            .Where(m => ids.Contains(m.MaMon))
            .Select(m => new { m.MaMon, m.TenMon, m.DanhMuc })
            .ToDictionaryAsync(m => m.MaMon);

        var items = top.Select((x, index) =>
        {
            dishes.TryGetValue(x.MaMon, out var dish);
            var share = totalRevenue > 0 ? Math.Round(x.Revenue / totalRevenue * 100m, 1) : 0m;
            return new TopDishRow(
                Rank: index + 1,
                Name: dish?.TenMon ?? $"Món #{x.MaMon}",
                Category: dish?.DanhMuc ?? "",
                Quantity: x.Quantity,
                Revenue: x.Revenue,
                SharePercent: share);
        }).ToList();

        return new TopDishesResult(limit, totalRevenue, items);
    }

    private async Task<ReviewsResult> BuildReviewsAsync(int? stars, DateTime start, DateTime endExclusive)
    {
        var inRange = _db.DanhGia
            .AsNoTracking()
            .Where(r => r.NgayDg >= start && r.NgayDg < endExclusive);

        // Điểm trung bình và số lượt tính trên cả khoảng thời gian, không phụ thuộc bộ lọc sao.
        var starCounts = await inRange
            .GroupBy(r => r.SoSao)
            .Select(g => new { Stars = (int)g.Key, Count = g.Count() })
            .ToListAsync();

        var total = starCounts.Sum(x => x.Count);
        var average = total > 0
            ? Math.Round(starCounts.Sum(x => (decimal)x.Stars * x.Count) / total, 1)
            : 0m;

        var filtered = stars is null ? inRange : inRange.Where(r => r.SoSao == (byte)stars.Value);

        var rows = await filtered
            .OrderByDescending(r => r.NgayDg)
            .Take(MaxReviewRows)
            .Select(r => new
            {
                r.MaDg,
                Customer = r.MaTkNavigation.HoTen,
                r.SoSao,
                r.NhanXet,
                r.NgayDg
            })
            .ToListAsync();

        var items = rows.Select(r => new ReviewRow(
            Id: r.MaDg,
            Customer: r.Customer,
            Stars: r.SoSao,
            Content: r.NhanXet ?? "",
            Date: r.NgayDg.ToString("dd/MM/yyyy"),
            // DB không có cột trạng thái cho đánh giá, nên phân loại theo số sao.
            Sentiment: r.SoSao >= 4 ? "Tích cực" : r.SoSao == 3 ? "Trung lập" : "Cần chú ý"));

        var distribution = Enumerable.Range(1, 5)
            .ToDictionary(s => s.ToString(CultureInfo.InvariantCulture),
                s => starCounts.FirstOrDefault(x => x.Stars == s)?.Count ?? 0);

        return new ReviewsResult(new ReviewSummary(average, total, distribution), items.ToList());
    }

    private async Task<LalamoveResult> BuildLalamoveAsync(DateTime start, DateTime endExclusive)
    {
        var rows = await _db.VanChuyens
            .AsNoTracking()
            .Where(v => v.MaDonNavigation.NgayDat >= start
                        && v.MaDonNavigation.NgayDat < endExclusive
                        && CompletedOrderCodes.Contains(v.MaDonNavigation.TrangThai)
                        && v.TrangThai != "Huy")
            .OrderByDescending(v => v.NgayTao)
            .Select(v => new
            {
                v.MaDonNavigation.MaTraCuu,
                v.NgayTao,
                v.TenTaiXe,
                CustomerPaid = v.MaDonNavigation.PhiGiaoKhach,
                ActualFee = v.PhiThucTe
            })
            .ToListAsync();

        var items = rows.Select(r =>
        {
            var difference = r.CustomerPaid - r.ActualFee;
            return new LalamoveRow(
                OrderCode: r.MaTraCuu,
                Date: r.NgayTao.ToString("dd/MM/yyyy"),
                Driver: r.TenTaiXe ?? "",
                CustomerPaid: r.CustomerPaid,
                ActualFee: r.ActualFee,
                // Quán trợ giá = phần cước Lalamove vượt quá số tiền khách trả.
                Subsidy: difference < 0 ? -difference : 0m,
                Difference: difference);
        }).ToList();

        var kpi = new LalamoveKpi(
            CustomerPaid: items.Sum(i => i.CustomerPaid),
            ActualFee: items.Sum(i => i.ActualFee),
            StoreSubsidy: items.Sum(i => i.Subsidy),
            // DB chưa lưu riêng phụ phí (mưa, cao điểm) nên chưa tách được.
            ExtraFees: (decimal?)null);

        return new LalamoveResult(kpi, items);
    }

    // ========================================================================
    // TIỆN ÍCH
    // ========================================================================
    private static bool IsPaid(string? status) =>
        status is not null && PaidPaymentCodes.Contains(status, StringComparer.OrdinalIgnoreCase);

    private static int? ParseStars(string? stars) =>
        int.TryParse(stars, NumberStyles.Integer, CultureInfo.InvariantCulture, out var s) && s is >= 1 and <= 5
            ? s
            : null;

    /// <summary>Mặc định: từ ngày 1 của tháng hiện tại đến hôm nay. Trả về khoảng [start, endExclusive).</summary>
    private static bool TryGetRange(
        DateTime? fromDate, DateTime? toDate,
        out DateTime start, out DateTime endExclusive, out string error)
    {
        var today = DateTime.Today;
        start = (fromDate ?? new DateTime(today.Year, today.Month, 1)).Date;
        var end = (toDate ?? today).Date;
        endExclusive = end.AddDays(1);
        error = "";

        if (end < start)
        {
            error = "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.";
            return false;
        }

        if ((end - start).TotalDays > MaxRangeDays)
        {
            error = "Khoảng thời gian thống kê tối đa là 2 năm.";
            return false;
        }

        return true;
    }

    private sealed class CsvBuilder
    {
        private readonly StringBuilder _sb = new();

        public void Row(params object?[] cells)
        {
            _sb.AppendJoin(',', cells.Select(Format));
            _sb.Append("\r\n");
        }

        public override string ToString() => _sb.ToString();

        private static string Format(object? value)
        {
            var text = value switch
            {
                null => "",
                decimal d => d.ToString("0.##", CultureInfo.InvariantCulture),
                double d => d.ToString("0.##", CultureInfo.InvariantCulture),
                IFormattable f => f.ToString(null, CultureInfo.InvariantCulture),
                _ => value.ToString() ?? ""
            };

            // Chống CSV/Excel formula injection với nội dung do người dùng nhập (tên, nhận xét...)
            if (value is string && text.Length > 0 && "=+-@\t\r".Contains(text[0]))
            {
                text = "'" + text;
            }

            return text.IndexOfAny(new[] { ',', '"', '\r', '\n' }) >= 0
                ? "\"" + text.Replace("\"", "\"\"") + "\""
                : text;
        }
    }

    // ------------------------------------------------------------------------
    // Kiểu dữ liệu trả về (JSON tự đổi tên thuộc tính sang camelCase)
    // ------------------------------------------------------------------------
    private sealed record RevenueRow(
        string Label, int Orders, int PaidOrders, int PendingOrders,
        decimal PaidAmount, decimal PendingAmount, decimal Revenue);

    private sealed record RevenueKpi(decimal TotalRevenue, int CompletedOrders, decimal Aov);

    private sealed record RevenueResult(string Period, RevenueKpi Kpi, List<RevenueRow> Rows);

    private sealed record TopDishRow(
        int Rank, string Name, string Category, int Quantity, decimal Revenue, decimal SharePercent);

    private sealed record TopDishesResult(int Limit, decimal TotalRevenue, List<TopDishRow> Items);

    private sealed record ReviewRow(
        int Id, string Customer, int Stars, string Content, string Date, string Sentiment);

    private sealed record ReviewSummary(decimal Average, int Total, Dictionary<string, int> Distribution);

    private sealed record ReviewsResult(ReviewSummary Summary, List<ReviewRow> Items);

    private sealed record LalamoveRow(
        string OrderCode, string Date, string Driver,
        decimal CustomerPaid, decimal ActualFee, decimal Subsidy, decimal Difference);

    private sealed record LalamoveKpi(
        decimal CustomerPaid, decimal ActualFee, decimal StoreSubsidy, decimal? ExtraFees);

    private sealed record LalamoveResult(LalamoveKpi Kpi, List<LalamoveRow> Items);
}