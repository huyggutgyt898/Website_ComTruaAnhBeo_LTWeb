namespace ComTruaAnhBeo.Responses;

public sealed class ReviewStatisticsResponse
{
    /// <summary>
    /// Tổng lượt đánh giá từ khách hàng
    /// </summary>
    public int TongLuotDanhGia { get; set; }

    /// <summary>
    /// Điểm đánh giá trung bình (thang điểm 1.0 - 5.0)
    /// </summary>
    public double DiemTrungBinh { get; set; }

    /// <summary>
    /// Thống kê chi tiết số lượt và tỷ lệ theo từng mức sao (từ 5 sao xuống 1 sao)
    /// </summary>
    public List<StarRatingDetailResponse> ChiTietSao { get; set; } = new();

    /// <summary>
    /// Ngày bắt đầu của kỳ lọc
    /// </summary>
    public DateTime TuNgay { get; set; }

    /// <summary>
    /// Ngày kết thúc của kỳ lọc
    /// </summary>
    public DateTime DenNgay { get; set; }
}

public sealed class StarRatingDetailResponse
{
    /// <summary>
    /// Mức sao (1 đến 5)
    /// </summary>
    public byte SoSao { get; set; }

    /// <summary>
    /// Số lượt đánh giá ở mức sao này
    /// </summary>
    public int SoLuot { get; set; }

    /// <summary>
    /// Tỷ lệ phần trăm trên tổng số lượt đánh giá (%)
    /// </summary>
    public double TyLe { get; set; }
}
