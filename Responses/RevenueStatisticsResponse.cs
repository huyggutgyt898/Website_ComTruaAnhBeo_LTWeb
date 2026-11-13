namespace ComTruaAnhBeo.Responses;

public sealed class RevenueStatisticsResponse
{
    /// <summary>
    /// Tổng doanh thu các đơn hàng đã hoàn thành (VNĐ)
    /// </summary>
    public decimal TongDoanhThu { get; set; }

    /// <summary>
    /// Tổng số đơn hàng đã hoàn thành
    /// </summary>
    public int TongSoDonHoanThanh { get; set; }

    /// <summary>
    /// Giá trị đơn hàng trung bình (AOV = Tổng doanh thu / Tổng số đơn hoàn thành)
    /// </summary>
    public decimal GiaTriDonTrungBinh { get; set; }

    /// <summary>
    /// Tổng tiền thực tế đã thanh toán thành công (TrangThai = 'DaTT')
    /// </summary>
    public decimal TongTienDaThanhToan { get; set; }

    /// <summary>
    /// Tổng tiền các đơn hoàn thành nhưng đang chờ thanh toán (TrangThai = 'ChuaTT')
    /// </summary>
    public decimal TongTienChoThanhToan { get; set; }

    /// <summary>
    /// Ngày bắt đầu của kỳ báo cáo
    /// </summary>
    public DateTime TuNgay { get; set; }

    /// <summary>
    /// Ngày kết thúc của kỳ báo cáo
    /// </summary>
    public DateTime DenNgay { get; set; }
}
