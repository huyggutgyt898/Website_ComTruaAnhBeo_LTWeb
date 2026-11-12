namespace ComTruaAnhBeo.Responses;

public sealed class PaymentStatisticsResponse
{
    /// <summary>
    /// Tổng số giao dịch thanh toán được ghi nhận
    /// </summary>
    public int TongGiaoDich { get; set; }

    /// <summary>
    /// Tổng số tiền của các giao dịch thanh toán
    /// </summary>
    public decimal TongTien { get; set; }

    /// <summary>
    /// Tổng tiền đã thanh toán (DaTT)
    /// </summary>
    public decimal TongTienDaThanhToan { get; set; }

    /// <summary>
    /// Tổng tiền chờ thanh toán (ChuaTT)
    /// </summary>
    public decimal TongTienChuaThanhToan { get; set; }

    /// <summary>
    /// Thống kê phân loại theo phương thức thanh toán (COD, MOMO, VNPAY, v.v.)
    /// </summary>
    public List<PaymentMethodStatResponse> TheoPhuongThuc { get; set; } = new();

    /// <summary>
    /// Thống kê phân loại theo trạng thái thanh toán (DaTT, ChuaTT, HetHan, v.v.)
    /// </summary>
    public List<PaymentStatusStatResponse> TheoTrangThai { get; set; } = new();
}

public sealed class PaymentMethodStatResponse
{
    /// <summary>
    /// Mã phương thức: COD, MOMO, VNPAY, ...
    /// </summary>
    public string PhuongThuc { get; set; } = string.Empty;

    /// <summary>
    /// Tên diễn giải thân thiện của phương thức
    /// </summary>
    public string TenPhuongThuc { get; set; } = string.Empty;

    /// <summary>
    /// Số lượng đơn / giao dịch sử dụng phương thức này
    /// </summary>
    public int SoLuong { get; set; }

    /// <summary>
    /// Tổng tiền của các giao dịch sử dụng phương thức này
    /// </summary>
    public decimal TongTien { get; set; }

    /// <summary>
    /// Tỷ trọng doanh số theo phương thức thanh toán (%)
    /// </summary>
    public double TyLe { get; set; }
}

public sealed class PaymentStatusStatResponse
{
    /// <summary>
    /// Mã trạng thái: DaTT, ChuaTT, HetHan, ...
    /// </summary>
    public string TrangThai { get; set; } = string.Empty;

    /// <summary>
    /// Tên diễn giải thân thiện của trạng thái
    /// </summary>
    public string TenTrangThai { get; set; } = string.Empty;

    /// <summary>
    /// Số lượng giao dịch ở trạng thái này
    /// </summary>
    public int SoLuong { get; set; }

    /// <summary>
    /// Tổng tiền của các giao dịch ở trạng thái này
    /// </summary>
    public decimal TongTien { get; set; }

    /// <summary>
    /// Tỷ trọng theo số lượng giao dịch (%)
    /// </summary>
    public double TyLe { get; set; }
}
