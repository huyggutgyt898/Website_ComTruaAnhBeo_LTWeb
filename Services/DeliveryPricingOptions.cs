namespace ComTruaAnhBeo.Services;

public sealed class LalamoveOptions
{
    public string ApiKey { get; set; } = "pk_test_cd66be7f448a3d5f39750eeeea7a18e6";
    public string ApiSecret { get; set; } = "sk_test_vmAwpC2ZVDS9wL1yO4qGmIvgRcttBzWE0XPn3sqSocvMOBIOarABavJ0zs2xendy";
    public string BaseUrl { get; set; } = "https://rest.sandbox.lalamove.com";
    public string Market { get; set; } = "VN";
    public string ServiceType { get; set; } = "MOTORCYCLE";
    public string Language { get; set; } = "vi_VN";
}

public sealed class OpenRouteServiceOptions
{
    public string ApiKey { get; set; } = "";
    public string BaseUrl { get; set; } = "https://api.openrouteservice.org";
}

public sealed class StoreLocationOptions
{
    public double ViDo { get; set; } = 10.844788;
    public double KinhDo { get; set; } = 106.795180;
    public string DiaChi { get; set; } =
        "Phân hiệu Trường Đại học Giao thông Vận tải tại Thành phố Hồ Chí Minh, 450 Lê Văn Việt, Phường Tăng Nhơn Phú A, Thành phố Thủ Đức, Thành phố Hồ Chí Minh";
    public string Ten { get; set; } = "";
    public string Sdt { get; set; } = "";
}

public sealed record LalamoveDispatchResult(
    string OrderId,
    string Status,
    string? TrackingUrl,
    string? DriverName,
    string? DriverPhone);

public sealed record LalamoveDeliveryStatusResult(
    string Status,
    string? TrackingUrl,
    string? DriverName,
    string? DriverPhone);

public sealed record DeliveryQuoteResult(
    string QuoteToken,
    decimal ShippingFee,
    double DistanceKm,
    string Currency,
    DateTimeOffset ExpiresAt,
    string ResolvedAddress,
    double Latitude,
    double Longitude);

public sealed class DeliveryPricingException(string message) : Exception(message);
