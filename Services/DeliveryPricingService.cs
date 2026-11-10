using System.Globalization;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace ComTruaAnhBeo.Services;

public sealed class DeliveryPricingService
{
    private const string QuotationPath = "/v3/quotations";
    private readonly HttpClient _httpClient;
    private readonly IMemoryCache _cache;
    private readonly LalamoveOptions _lalamove;
    private readonly OpenRouteServiceOptions _openRouteService;
    private readonly StoreLocationOptions _store;

    public DeliveryPricingService(
        HttpClient httpClient,
        IMemoryCache cache,
        IOptions<LalamoveOptions> lalamove,
        IOptions<OpenRouteServiceOptions> openRouteService,
        IOptions<StoreLocationOptions> store)
    {
        _httpClient = httpClient;
        _cache = cache;
        _lalamove = lalamove.Value;
        _openRouteService = openRouteService.Value;
        _store = store.Value;
    }

    public async Task<DeliveryQuoteResult> GetQuoteAsync(
        string address,
        double? latitude,
        double? longitude,
        CancellationToken cancellationToken)
    {
        ValidateConfiguration();

        var destination = await ResolveDestinationAsync(address, latitude, longitude, cancellationToken);
        var requestBody = JsonSerializer.Serialize(new
        {
            data = new
            {
                serviceType = _lalamove.ServiceType,
                language = _lalamove.Language,
                stops = new[]
                {
                    new
                    {
                        coordinates = Coordinates(_store.ViDo, _store.KinhDo),
                        address = _store.DiaChi
                    },
                    new
                    {
                        coordinates = Coordinates(destination.Latitude, destination.Longitude),
                        address = destination.Address
                    }
                }
            }
        });

        using var request = CreateSignedRequest(HttpMethod.Post, QuotationPath, requestBody);
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new DeliveryPricingException(
                $"Lalamove chưa thể báo giá giao hàng (HTTP {(int)response.StatusCode}). Vui lòng kiểm tra địa chỉ hoặc thử lại.");
        }

        using var document = await JsonDocument.ParseAsync(
            await response.Content.ReadAsStreamAsync(cancellationToken),
            cancellationToken: cancellationToken);
        var data = GetRequiredProperty(document.RootElement, "data");
        var priceBreakdown = GetRequiredProperty(data, "priceBreakdown");
        var totalText = GetRequiredString(priceBreakdown, "total");
        var currency = GetRequiredString(priceBreakdown, "currency");
        if (!decimal.TryParse(totalText, NumberStyles.Number, CultureInfo.InvariantCulture, out var shippingFee) ||
            shippingFee < 0)
        {
            throw new DeliveryPricingException("Lalamove trả về mức phí giao hàng không hợp lệ.");
        }

        if (!string.Equals(currency, "VND", StringComparison.OrdinalIgnoreCase))
        {
            throw new DeliveryPricingException(
                $"Báo giá Lalamove trả về loại tiền {currency}, không phải VND. Vui lòng kiểm tra cấu hình thị trường.");
        }

        var distance = GetRequiredProperty(data, "distance");
        var distanceValue = GetRequiredNumberText(distance, "value");
        var distanceUnit = GetRequiredString(distance, "unit");
        if (!double.TryParse(distanceValue, NumberStyles.Number, CultureInfo.InvariantCulture, out var distanceAmount) ||
            distanceAmount < 0)
        {
            throw new DeliveryPricingException("Lalamove trả về khoảng cách giao hàng không hợp lệ.");
        }

        var distanceKm = distanceUnit switch
        {
            "m" => distanceAmount / 1000d,
            "km" => distanceAmount,
            "mi" => distanceAmount * 1.609344d,
            _ => throw new DeliveryPricingException("Lalamove trả về đơn vị khoảng cách không được hỗ trợ.")
        };

        var expiresAt = TryGetString(data, "expiresAt", out var expiresAtText) &&
            DateTimeOffset.TryParse(
                expiresAtText,
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal,
                out var parsedExpiresAt)
            ? parsedExpiresAt
            : DateTimeOffset.UtcNow.AddMinutes(5);

        if (expiresAt <= DateTimeOffset.UtcNow)
        {
            throw new DeliveryPricingException("Báo giá Lalamove đã hết hạn. Vui lòng yêu cầu báo giá mới.");
        }

        var quoteToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        var quote = new DeliveryQuoteResult(
            quoteToken,
            shippingFee,
            distanceKm,
            currency,
            expiresAt,
            destination.Address,
            destination.Latitude,
            destination.Longitude);

        _cache.Set(
            GetCacheKey(quoteToken),
            new CachedDeliveryQuote(
                address.Trim(),
                destination.Address,
                latitude,
                longitude,
                quote),
            expiresAt);

        return quote;
    }

    public bool TryGetValidQuote(
        string? quoteToken,
        string address,
        double? latitude,
        double? longitude,
        out DeliveryQuoteResult? quote)
    {
        quote = null;
        if (string.IsNullOrWhiteSpace(quoteToken) ||
            !_cache.TryGetValue(GetCacheKey(quoteToken), out CachedDeliveryQuote? cached) ||
            cached is null ||
            !(string.Equals(cached.RequestAddress, address.Trim(), StringComparison.Ordinal) ||
                string.Equals(cached.ResolvedAddress, address.Trim(), StringComparison.Ordinal)) ||
            cached.Latitude != latitude ||
            cached.Longitude != longitude ||
            cached.Quote.ExpiresAt <= DateTimeOffset.UtcNow)
        {
            return false;
        }

        quote = cached.Quote;
        return true;
    }

    private async Task<ResolvedDestination> ResolveDestinationAsync(
        string address,
        double? latitude,
        double? longitude,
        CancellationToken cancellationToken)
    {
        if (latitude.HasValue != longitude.HasValue ||
            latitude is < -90 or > 90 ||
            longitude is < -180 or > 180)
        {
            throw new DeliveryPricingException("Vị trí giao hàng không hợp lệ.");
        }

        if (latitude.HasValue && longitude.HasValue)
        {
            var gpsAddress = address.Trim();
            if (string.Equals(gpsAddress, "Vị trí hiện tại", StringComparison.OrdinalIgnoreCase))
            {
                gpsAddress = string.IsNullOrWhiteSpace(_openRouteService.ApiKey)
                    ? $"GPS {latitude.Value.ToString("F6", CultureInfo.InvariantCulture)}, {longitude.Value.ToString("F6", CultureInfo.InvariantCulture)}"
                    : await ReverseGeocodeAsync(latitude.Value, longitude.Value, cancellationToken);
            }

            return new ResolvedDestination(latitude.Value, longitude.Value, gpsAddress);
        }

        if (string.IsNullOrWhiteSpace(address) ||
            string.Equals(address.Trim(), "Vị trí hiện tại", StringComparison.OrdinalIgnoreCase))
        {
            throw new DeliveryPricingException("Vui lòng nhập địa chỉ giao hàng hoặc chọn vị trí hiện tại.");
        }

        if (string.IsNullOrWhiteSpace(_openRouteService.ApiKey))
        {
            throw new DeliveryPricingException(
                "Chưa cấu hình OpenRouteService API key để tìm tọa độ địa chỉ. Chạy scripts\\Configure-OpenRouteServiceSecret.ps1 bằng khóa mới rồi khởi động lại ứng dụng, hoặc chọn Dùng vị trí hiện tại.");
        }

        var searchUrl = $"{_openRouteService.BaseUrl.TrimEnd('/')}/geocode/search" +
            $"?text={Uri.EscapeDataString(address.Trim())}&boundary.country=VNM&size=1";
        using var request = new HttpRequestMessage(HttpMethod.Get, searchUrl);
        request.Headers.TryAddWithoutValidation("Authorization", _openRouteService.ApiKey);
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new DeliveryPricingException(
                $"Không thể xác định tọa độ địa chỉ (OpenRouteService HTTP {(int)response.StatusCode}). Vui lòng ghi địa chỉ rõ hơn.");
        }

        using var document = await JsonDocument.ParseAsync(
            await response.Content.ReadAsStreamAsync(cancellationToken),
            cancellationToken: cancellationToken);
        if (!document.RootElement.TryGetProperty("features", out var features) ||
            features.ValueKind != JsonValueKind.Array ||
            features.GetArrayLength() == 0)
        {
            throw new DeliveryPricingException("Không tìm thấy vị trí cho địa chỉ này. Vui lòng ghi địa chỉ cụ thể hơn.");
        }

        var feature = features[0];
        var coordinates = GetRequiredProperty(GetRequiredProperty(feature, "geometry"), "coordinates");
        if (coordinates.ValueKind != JsonValueKind.Array || coordinates.GetArrayLength() < 2 ||
            coordinates[0].ValueKind != JsonValueKind.Number ||
            coordinates[1].ValueKind != JsonValueKind.Number)
        {
            throw new DeliveryPricingException("OpenRouteService trả về tọa độ địa chỉ không hợp lệ.");
        }

        var longitudeValue = coordinates[0].GetDouble();
        var latitudeValue = coordinates[1].GetDouble();
        var resolvedAddress = TryGetString(
            GetRequiredProperty(feature, "properties"),
            "label",
            out var label)
            ? label
            : address.Trim();

        return new ResolvedDestination(latitudeValue, longitudeValue, resolvedAddress);
    }

    private async Task<string> ReverseGeocodeAsync(
        double latitude,
        double longitude,
        CancellationToken cancellationToken)
    {
        var reverseUrl = $"{_openRouteService.BaseUrl.TrimEnd('/')}/geocode/reverse" +
            $"?point.lat={latitude.ToString(CultureInfo.InvariantCulture)}" +
            $"&point.lon={longitude.ToString(CultureInfo.InvariantCulture)}&size=1";
        using var request = new HttpRequestMessage(HttpMethod.Get, reverseUrl);
        request.Headers.TryAddWithoutValidation("Authorization", _openRouteService.ApiKey);
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new DeliveryPricingException(
                $"Không thể xác định địa chỉ từ vị trí GPS (OpenRouteService HTTP {(int)response.StatusCode}).");
        }

        using var document = await JsonDocument.ParseAsync(
            await response.Content.ReadAsStreamAsync(cancellationToken),
            cancellationToken: cancellationToken);
        if (!document.RootElement.TryGetProperty("features", out var features) ||
            features.ValueKind != JsonValueKind.Array ||
            features.GetArrayLength() == 0 ||
            !TryGetString(
                GetRequiredProperty(features[0], "properties"),
                "label",
                out var label))
        {
            throw new DeliveryPricingException("Không tìm thấy địa chỉ cho vị trí GPS đã chọn.");
        }

        return label;
    }

    private HttpRequestMessage CreateSignedRequest(HttpMethod method, string path, string body)
    {
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            .ToString(CultureInfo.InvariantCulture);
        var rawSignature = $"{timestamp}\r\n{method.Method}\r\n{path}\r\n\r\n{body}";
        var signatureBytes = HMACSHA256.HashData(
            Encoding.UTF8.GetBytes(_lalamove.ApiSecret),
            Encoding.UTF8.GetBytes(rawSignature));
        var signature = Convert.ToHexStringLower(signatureBytes);

        var request = new HttpRequestMessage(
            method,
            $"{_lalamove.BaseUrl.TrimEnd('/')}{path}")
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json")
        };
        request.Headers.Authorization = new AuthenticationHeaderValue(
            "hmac",
            $"{_lalamove.ApiKey}:{timestamp}:{signature}");
        request.Headers.TryAddWithoutValidation("Market", _lalamove.Market);
        request.Headers.TryAddWithoutValidation("Request-ID", Guid.NewGuid().ToString());
        return request;
    }

    private void ValidateConfiguration()
    {
        if (string.IsNullOrWhiteSpace(_lalamove.ApiKey) ||
            string.IsNullOrWhiteSpace(_lalamove.ApiSecret))
        {
            throw new DeliveryPricingException(
                "Chưa cấu hình Lalamove API key/secret. Chạy scripts\\Configure-DeliverySecrets.ps1 bằng khóa sandbox mới rồi khởi động lại ứng dụng.");
        }

        if (string.IsNullOrWhiteSpace(_store.DiaChi) ||
            _store.ViDo is < -90 or > 90 ||
            _store.KinhDo is < -180 or > 180)
        {
            throw new DeliveryPricingException("Chưa cấu hình vị trí cửa hàng hợp lệ.");
        }
    }

    private static object Coordinates(double latitude, double longitude) => new
    {
        lat = latitude.ToString("G17", CultureInfo.InvariantCulture),
        lng = longitude.ToString("G17", CultureInfo.InvariantCulture)
    };

    private static string GetCacheKey(string quoteToken) => $"delivery-quote:{quoteToken}";

    private static JsonElement GetRequiredProperty(JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var value))
        {
            throw new DeliveryPricingException("Nhà cung cấp định tuyến trả về dữ liệu không hợp lệ.");
        }

        return value;
    }

    private static string GetRequiredString(JsonElement element, string propertyName)
    {
        var value = GetRequiredProperty(element, propertyName);
        if (value.ValueKind != JsonValueKind.String || string.IsNullOrWhiteSpace(value.GetString()))
        {
            throw new DeliveryPricingException("Nhà cung cấp định tuyến trả về dữ liệu không hợp lệ.");
        }

        return value.GetString()!;
    }

    private static string GetRequiredNumberText(JsonElement element, string propertyName)
    {
        var value = GetRequiredProperty(element, propertyName);
        return value.ValueKind switch
        {
            JsonValueKind.String when !string.IsNullOrWhiteSpace(value.GetString()) => value.GetString()!,
            JsonValueKind.Number => value.GetRawText(),
            _ => throw new DeliveryPricingException("Nhà cung cấp định tuyến trả về dữ liệu không hợp lệ.")
        };
    }

    private static bool TryGetString(JsonElement element, string propertyName, out string value)
    {
        if (element.TryGetProperty(propertyName, out var property) &&
            property.ValueKind == JsonValueKind.String &&
            !string.IsNullOrWhiteSpace(property.GetString()))
        {
            value = property.GetString()!;
            return true;
        }

        value = "";
        return false;
    }

    private sealed record ResolvedDestination(double Latitude, double Longitude, string Address);

    private sealed record CachedDeliveryQuote(
        string RequestAddress,
        string ResolvedAddress,
        double? Latitude,
        double? Longitude,
        DeliveryQuoteResult Quote);
}
