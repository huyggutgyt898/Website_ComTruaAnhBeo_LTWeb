namespace ComTruaAnhBeo.Responses;

public sealed class RecentReviewsPagedResponse
{
    /// <summary>
    /// Danh sách các nhận xét / đánh giá gần đây
    /// </summary>
    public List<RecentReviewResponse> Items { get; set; } = new();

    /// <summary>
    /// Tổng số lượng nhận xét thỏa mãn bộ lọc
    /// </summary>
    public int TotalItems { get; set; }

    /// <summary>
    /// Trang hiện tại
    /// </summary>
    public int Page { get; set; }

    /// <summary>
    /// Số lượng bản ghi trên một trang
    /// </summary>
    public int PageSize { get; set; }

    /// <summary>
    /// Tổng số trang
    /// </summary>
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalItems / PageSize) : 0;
}

public sealed class RecentReviewResponse
{
    /// <summary>
    /// Mã đánh giá
    /// </summary>
    public int MaDg { get; set; }

    /// <summary>
    /// Mã tài khoản khách hàng thực hiện đánh giá
    /// </summary>
    public int MaTk { get; set; }

    /// <summary>
    /// Điểm số sao (1 đến 5)
    /// </summary>
    public byte SoSao { get; set; }

    /// <summary>
    /// Nội dung phản hồi / nhận xét của khách
    /// </summary>
    public string NhanXet { get; set; } = string.Empty;

    /// <summary>
    /// Thời gian khách gửi đánh giá
    /// </summary>
    public DateTime NgayDg { get; set; }
}
