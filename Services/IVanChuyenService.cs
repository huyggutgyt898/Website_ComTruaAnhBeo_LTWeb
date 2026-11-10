using ComTruaAnhBeo.Requests;
using ComTruaAnhBeo.Responses;

namespace ComTruaAnhBeo.Services;

public interface IVanChuyenService
{
    Task<KiemTraDiaChiResponse> KiemTraDiaChiAsync(
        KiemTraDiaChiRequest request, CancellationToken ct = default);
    Task<BaoGiaVanChuyenResponse> TinhPhiVanChuyenAsync(
        BaoGiaVanChuyenRequest request, CancellationToken ct = default);
}
