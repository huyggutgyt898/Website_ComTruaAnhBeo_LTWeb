namespace ComTruaAnhBeo.Responses;

public sealed class TopProductListResponse
{
    /// <summary>
    /// Danh sách các món ăn bán chạy nhất theo thứ hạng
    /// </summary>
    public List<TopProductResponse> Items { get; set; } = new();

    /// <summary>
    /// Tổng doanh thu của TẤT CẢ các món chính hợp lệ trong cùng kỳ
    /// </summary>
    public decimal TongDoanhThuTatCaMonChinh { get; set; }

    /// <summary>
    /// Tổng số lượng bán của TẤT CẢ các món chính hợp lệ trong cùng kỳ
    /// </summary>
    public int TongSoLuongTatCaMonChinh { get; set; }

    /// <summary>
    /// Giới hạn hiển thị (5, 10...)
    /// </summary>
    public int Limit { get; set; }

    /// <summary>
    /// Ngày bắt đầu của kỳ lọc
    /// </summary>
    public DateTime TuNgay { get; set; }

    /// <summary>
    /// Ngày kết thúc của kỳ lọc
    /// </summary>
    public DateTime DenNgay { get; set; }
}

public sealed class TopProductResponse
{
    /// <summary>
    /// Thứ hạng bán chạy (1, 2, 3...)
    /// </summary>
    public int Hang { get; set; }

    /// <summary>
    /// Mã món ăn
    /// </summary>
    public int MaMon { get; set; }

    /// <summary>
    /// Tên món ăn
    /// </summary>
    public string TenMon { get; set; } = string.Empty;

    /// <summary>
    /// Nhóm thực đơn / Danh mục (Cơm đĩa, Cơm văn phòng, v.v.)
    /// </summary>
    public string DanhMuc { get; set; } = string.Empty;

    /// <summary>
    /// Ảnh món ăn (nếu có)
    /// </summary>
    public string? HinhAnh { get; set; }

    /// <summary>
    /// Tổng số lượng đã bán (gộp tất cả kích thước size)
    /// </summary>
    public int SoLuongBan { get; set; }

    /// <summary>
    /// Tổng doanh thu từ món ăn này (tính theo đơn giá lịch sử trong CtDonHang)
    /// </summary>
    public decimal DoanhThuMon { get; set; }

    /// <summary>
    /// Tỷ trọng doanh thu so với tổng doanh thu của TẤT CẢ món chính cùng kỳ (%)
    /// </summary>
    public double TyTrong { get; set; }
}
