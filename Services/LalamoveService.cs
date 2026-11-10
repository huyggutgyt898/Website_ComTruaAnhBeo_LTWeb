using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace ComTruaAnhBeo.Services;

/// <summary>
/// Dịch vụ tích hợp chính thức Lalamove API v3 (Quotation, Order Placement, Tracking & Cancellation).
/// Xác thực HMAC-SHA256 theo tài liệu Lalamove Developer API v3.
/// Hỗ trợ lấy báo giá, điều phối gọi tài xế, tra cứu thông tin tài xế và hủy đơn vận chuyển.
/// </summary>
public sealed class LalamoveService : ILalamoveService
{
    private readonly HttpClient _http;
    private readonly IConfiguration _config;
    private readonly ILogger<LalamoveService> _logger;

    public LalamoveService(HttpClient http, IConfiguration config, ILogger<LalamoveService> logger)
    {
        _http = http;
        _config = config;
        _logger = logger;
    }

    public async Task<BaoGiaLalamove?> LayBaoGiaAsync(
        double viDoLay, double kinhDoLay,
        double viDoGiao, double kinhDoGiao,
        CancellationToken ct = default)
    {
        var (apiKey, apiSecret) = LayThongTinXacThuc();
        string baseUrl = LayBaseUrl(apiKey);
        string market = LayMarket();
        string serviceType = LayServiceType();

        string diaChiQuan = _config["CuaHang:DiaChi"] ??
            "450 Lê Văn Việt, Phường Tăng Nhơn Phú A, Thành phố Thủ Đức, Thành phố Hồ Chí Minh";

        // 1. Tạo payload Quotation v3
        var payload = new
        {
            data = new
            {
                serviceType = serviceType,
                language = "vi_VN",
                stops = new object[]
                {
                    new
                    {
                        coordinates = new
                        {
                            lat = viDoLay.ToString("F6", CultureInfo.InvariantCulture),
                            lng = kinhDoLay.ToString("F6", CultureInfo.InvariantCulture)
                        },
                        address = diaChiQuan
                    },
                    new
                    {
                        coordinates = new
                        {
                            lat = viDoGiao.ToString("F6", CultureInfo.InvariantCulture),
                            lng = kinhDoGiao.ToString("F6", CultureInfo.InvariantCulture)
                        },
                        address = "Địa chỉ giao hàng TP. Hồ Chí Minh"
                    }
                }
            }
        };

        string bodyJson = JsonSerializer.Serialize(payload);
        const string path = "/v3/quotations";
        const string method = "POST";

        // 2. Ký HMAC-SHA256 theo chuẩn Lalamove API v3 (\r\n)
        long timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        string rawSignature = $"{timestamp}\r\n{method}\r\n{path}\r\n\r\n{bodyJson}";

        string signature;
        using (var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(apiSecret)))
        {
            byte[] hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(rawSignature));
            signature = Convert.ToHexString(hash).ToLowerInvariant();
        }

        string authHeader = $"hmac {apiKey}:{timestamp}:{signature}";

        // 3. Khởi tạo HTTP Request
        string requestUrl = $"{baseUrl.TrimEnd('/')}{path}";
        using var request = new HttpRequestMessage(HttpMethod.Post, requestUrl);
        request.Headers.TryAddWithoutValidation("Authorization", authHeader);
        request.Headers.TryAddWithoutValidation("Market", market);
        request.Headers.TryAddWithoutValidation("Request-ID", Guid.NewGuid().ToString());
        request.Content = new StringContent(bodyJson, Encoding.UTF8, "application/json");

        _logger.LogInformation("Gửi yêu cầu Quotation tới Lalamove v3 ({Market}, Service: {ServiceType})", market, serviceType);

        // 4. Gửi request và xử lý response
        using var response = await _http.SendAsync(request, ct);
        string responseBody = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Lalamove Quotation API thất bại với mã HTTP {StatusCode}: {ResponseBody}",
                (int)response.StatusCode, responseBody);

            string errorDetail = TrichXuatThongBaoLoi(responseBody);

            throw response.StatusCode switch
            {
                System.Net.HttpStatusCode.Unauthorized =>
                    new HttpRequestException("Xác thực Lalamove thất bại (401 Unauthorized). Vui lòng kiểm tra API Key và Secret."),
                System.Net.HttpStatusCode.Forbidden =>
                    new HttpRequestException("Không có quyền truy cập Lalamove API (403 Forbidden)."),
                System.Net.HttpStatusCode.UnprocessableEntity =>
                    new HttpRequestException($"Lalamove từ chối tuyến đường (422): {errorDetail}"),
                System.Net.HttpStatusCode.TooManyRequests =>
                    new HttpRequestException("Lalamove API vượt quá giới hạn tần suất yêu cầu (429 Rate Limit)."),
                _ =>
                    new HttpRequestException($"Lalamove API trả về lỗi HTTP {(int)response.StatusCode}: {errorDetail}")
            };
        }

        // 5. Phân tích kết quả báo giá thành công
        using var doc = JsonDocument.Parse(responseBody);
        var root = doc.RootElement;

        if (!root.TryGetProperty("data", out var dataEl))
        {
            throw new HttpRequestException("Phản hồi từ Lalamove không chứa trường dữ liệu 'data'.");
        }

        string quotationId = dataEl.TryGetProperty("quotationId", out var qIdProp) ?
            (qIdProp.GetString() ?? "") : "";

        if (string.IsNullOrWhiteSpace(quotationId))
        {
            throw new HttpRequestException("Lalamove không trả về mã báo giá quotationId hợp lệ.");
        }

        decimal phiGoc = 0m;
        if (dataEl.TryGetProperty("priceBreakdown", out var priceEl))
        {
            if (priceEl.TryGetProperty("total", out var totalEl))
            {
                if (totalEl.ValueKind == JsonValueKind.String &&
                    decimal.TryParse(totalEl.GetString(), NumberStyles.Any, CultureInfo.InvariantCulture, out var pString))
                {
                    phiGoc = pString;
                }
                else if (totalEl.ValueKind == JsonValueKind.Number)
                {
                    phiGoc = totalEl.GetDecimal();
                }
            }
        }

        string? stopId0 = null;
        string? stopId1 = null;
        if (dataEl.TryGetProperty("stops", out var stopsEl) && stopsEl.ValueKind == JsonValueKind.Array)
        {
            var stopArray = stopsEl.EnumerateArray().ToArray();
            if (stopArray.Length > 0 && stopArray[0].TryGetProperty("stopId", out var s0))
            {
                stopId0 = s0.GetString();
            }
            if (stopArray.Length > 1 && stopArray[1].TryGetProperty("stopId", out var s1))
            {
                stopId1 = s1.GetString();
            }
        }

        return new BaoGiaLalamove(quotationId, phiGoc, stopId0, stopId1);
    }

    public async Task<KetQuaGoiTaiXe> GoiTaiXeAsync(
        double viDoLay, double kinhDoLay, string diaChiLay, string sdtQuan,
        double viDoGiao, double kinhDoGiao, string diaChiGiao, string tenKhach, string sdtKhach,
        CancellationToken ct = default)
    {
        var (apiKey, apiSecret) = LayThongTinXacThuc();
        string baseUrl = LayBaseUrl(apiKey);
        string market = LayMarket();

        string phoneSender = ChuanHoaSoDienThoai(sdtQuan);
        string phoneRecipient = ChuanHoaSoDienThoai(sdtKhach);

        // 1. Lấy báo giá trước để có quotationId và stopId
        BaoGiaLalamove? baoGia;
        try
        {
            baoGia = await LayBaoGiaAsync(viDoLay, kinhDoLay, viDoGiao, kinhDoGiao, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi lấy báo giá Lalamove trước khi gọi tài xế.");
            return new KetQuaGoiTaiXe(
                ThanhCong: false,
                ThongBao: $"Không thể lấy báo giá Lalamove cho tuyến đường này: {ex.Message}",
                OrderId: null,
                TenTaiXe: null,
                SdtTaiXe: null,
                LinkTheoDoi: null,
                TrangThai: null);
        }

        if (baoGia is null || string.IsNullOrWhiteSpace(baoGia.MaBaoGia))
        {
            return new KetQuaGoiTaiXe(
                ThanhCong: false,
                ThongBao: "Lalamove không cung cấp báo giá cho tuyến đường này.",
                OrderId: null,
                TenTaiXe: null,
                SdtTaiXe: null,
                LinkTheoDoi: null,
                TrangThai: null);
        }

        // 2. Tạo đơn vận chuyển qua Lalamove API v3 (POST /v3/orders)
        try
        {
            const string path = "/v3/orders";
            const string method = "POST";

            var senderObj = new Dictionary<string, object>
            {
                ["name"] = "Cơm Trưa Anh Béo",
                ["phone"] = phoneSender
            };
            if (!string.IsNullOrWhiteSpace(baoGia.StopIdLay))
            {
                senderObj["stopId"] = baoGia.StopIdLay;
            }

            var recipientObj = new Dictionary<string, object>
            {
                ["name"] = string.IsNullOrWhiteSpace(tenKhach) ? "Khách hàng" : tenKhach.Trim(),
                ["phone"] = phoneRecipient,
                ["remarks"] = "Giao cơm trưa tận tay"
            };
            if (!string.IsNullOrWhiteSpace(baoGia.StopIdGiao))
            {
                recipientObj["stopId"] = baoGia.StopIdGiao;
            }

            var orderPayload = new
            {
                data = new
                {
                    quotationId = baoGia.MaBaoGia,
                    sender = senderObj,
                    recipients = new object[] { recipientObj },
                    isPODEnabled = true
                }
            };

            string bodyJson = JsonSerializer.Serialize(orderPayload);
            long timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            string rawSignature = $"{timestamp}\r\n{method}\r\n{path}\r\n\r\n{bodyJson}";

            string signature;
            using (var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(apiSecret)))
            {
                byte[] hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(rawSignature));
                signature = Convert.ToHexString(hash).ToLowerInvariant();
            }

            string authHeader = $"hmac {apiKey}:{timestamp}:{signature}";

            string requestUrl = $"{baseUrl.TrimEnd('/')}{path}";
            using var request = new HttpRequestMessage(HttpMethod.Post, requestUrl);
            request.Headers.TryAddWithoutValidation("Authorization", authHeader);
            request.Headers.TryAddWithoutValidation("Market", market);
            request.Headers.TryAddWithoutValidation("Request-ID", Guid.NewGuid().ToString());
            request.Content = new StringContent(bodyJson, Encoding.UTF8, "application/json");

            using var response = await _http.SendAsync(request, ct);
            string responseBody = await response.Content.ReadAsStringAsync(ct);

            if (response.IsSuccessStatusCode)
            {
                using var doc = JsonDocument.Parse(responseBody);
                var root = doc.RootElement;
                if (root.TryGetProperty("data", out var dataEl))
                {
                    string orderId = dataEl.TryGetProperty("orderId", out var oProp) ? (oProp.GetString() ?? "") : "";
                    string shareLink = dataEl.TryGetProperty("shareLink", out var sProp) ? (sProp.GetString() ?? "") : "";
                    string status = dataEl.TryGetProperty("status", out var stProp) ? (stProp.GetString() ?? "ASSIGNING_DRIVER") : "ASSIGNING_DRIVER";

                    decimal phiThucTe = baoGia.PhiGoc;
                    if (dataEl.TryGetProperty("priceBreakdown", out var priceEl) &&
                        priceEl.TryGetProperty("total", out var totalEl))
                    {
                        if (totalEl.ValueKind == JsonValueKind.String &&
                            decimal.TryParse(totalEl.GetString(), NumberStyles.Any, CultureInfo.InvariantCulture, out var pParsed))
                        {
                            phiThucTe = pParsed;
                        }
                        else if (totalEl.ValueKind == JsonValueKind.Number)
                        {
                            phiThucTe = totalEl.GetDecimal();
                        }
                    }

                    _logger.LogInformation("Tạo đơn Lalamove thành công: OrderId={OrderId}, Status={Status}, Fee={Fee}",
                        orderId, status, phiThucTe);

                    return new KetQuaGoiTaiXe(
                        ThanhCong: true,
                        ThongBao: "Đã tạo đơn và gửi yêu cầu điều phối tài xế Lalamove thành công!",
                        OrderId: orderId,
                        TenTaiXe: null,
                        SdtTaiXe: null,
                        LinkTheoDoi: !string.IsNullOrWhiteSpace(shareLink) ? shareLink : $"https://share.lalamove.com/order/{orderId}",
                        TrangThai: "TimTaiXe",
                        PhiThucTe: phiThucTe);
                }
            }

            // Xử lý khi API Lalamove từ chối
            _logger.LogError("Lalamove Order API trả về lỗi HTTP {StatusCode}: {ResponseBody}",
                (int)response.StatusCode, responseBody);

            string errorDetail = TrichXuatThongBaoLoi(responseBody);
            return new KetQuaGoiTaiXe(
                ThanhCong: false,
                ThongBao: $"Lalamove API từ chối tạo đơn (HTTP {(int)response.StatusCode}): {errorDetail}",
                OrderId: null,
                TenTaiXe: null,
                SdtTaiXe: null,
                LinkTheoDoi: null,
                TrangThai: null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi kết nối khi gọi Lalamove Order v3.");
            return new KetQuaGoiTaiXe(
                ThanhCong: false,
                ThongBao: $"Lỗi kết nối đến máy chủ Lalamove: {ex.Message}",
                OrderId: null,
                TenTaiXe: null,
                SdtTaiXe: null,
                LinkTheoDoi: null,
                TrangThai: null);
        }
    }

    public async Task<bool> HuyDonAsync(
        string? lalamoveOrderId,
        string? lyDo = null,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(lalamoveOrderId)) return true;

        try
        {
            var (apiKey, apiSecret) = LayThongTinXacThuc();
            string baseUrl = LayBaseUrl(apiKey);
            string market = LayMarket();

            // Chuẩn Lalamove API v3: DELETE /v3/orders/{orderId}
            string path = $"/v3/orders/{Uri.EscapeDataString(lalamoveOrderId)}";
            const string method = "DELETE";
            long timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            string rawSignature = $"{timestamp}\r\n{method}\r\n{path}\r\n\r\n";

            string signature;
            using (var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(apiSecret)))
            {
                byte[] hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(rawSignature));
                signature = Convert.ToHexString(hash).ToLowerInvariant();
            }

            string authHeader = $"hmac {apiKey}:{timestamp}:{signature}";
            string requestUrl = $"{baseUrl.TrimEnd('/')}{path}";

            using var request = new HttpRequestMessage(HttpMethod.Delete, requestUrl);
            request.Headers.TryAddWithoutValidation("Authorization", authHeader);
            request.Headers.TryAddWithoutValidation("Market", market);
            request.Headers.TryAddWithoutValidation("Request-ID", Guid.NewGuid().ToString());

            using var response = await _http.SendAsync(request, ct);
            _logger.LogInformation("Gửi yêu cầu hủy đơn {OrderId} tới Lalamove: HTTP {StatusCode}",
                lalamoveOrderId, (int)response.StatusCode);

            // 204 No Content hoặc 200 OK hoặc 404 (đơn đã hủy)
            return response.IsSuccessStatusCode || response.StatusCode == System.Net.HttpStatusCode.NotFound;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Lỗi khi gọi Lalamove Delete/Cancel API cho đơn {OrderId}", lalamoveOrderId);
            return false;
        }
    }

    public async Task<ThongTinDonLalamove?> LayThongTinDonAsync(string lalamoveOrderId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(lalamoveOrderId)) return null;

        try
        {
            var (apiKey, apiSecret) = LayThongTinXacThuc();
            string baseUrl = LayBaseUrl(apiKey);
            string market = LayMarket();

            string path = $"/v3/orders/{Uri.EscapeDataString(lalamoveOrderId)}";
            const string method = "GET";
            long timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            string rawSignature = $"{timestamp}\r\n{method}\r\n{path}\r\n\r\n";

            string signature;
            using (var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(apiSecret)))
            {
                byte[] hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(rawSignature));
                signature = Convert.ToHexString(hash).ToLowerInvariant();
            }

            string authHeader = $"hmac {apiKey}:{timestamp}:{signature}";
            string requestUrl = $"{baseUrl.TrimEnd('/')}{path}";

            using var request = new HttpRequestMessage(HttpMethod.Get, requestUrl);
            request.Headers.TryAddWithoutValidation("Authorization", authHeader);
            request.Headers.TryAddWithoutValidation("Market", market);
            request.Headers.TryAddWithoutValidation("Request-ID", Guid.NewGuid().ToString());

            using var response = await _http.SendAsync(request, ct);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Không thể lấy thông tin đơn Lalamove {OrderId}: HTTP {StatusCode}",
                    lalamoveOrderId, (int)response.StatusCode);
                return null;
            }

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
            var root = doc.RootElement;
            if (!root.TryGetProperty("data", out var dataEl)) return null;

            string status = dataEl.TryGetProperty("status", out var stProp) ? (stProp.GetString() ?? "") : "";
            string shareLink = dataEl.TryGetProperty("shareLink", out var slProp) ? (slProp.GetString() ?? "") : "";
            string driverId = dataEl.TryGetProperty("driverId", out var drProp) ? (drProp.GetString() ?? "") : "";

            string? driverName = null;
            string? driverPhone = null;
            string? plateNumber = null;

            if (!string.IsNullOrWhiteSpace(driverId))
            {
                try
                {
                    string driverPath = $"/v3/orders/{Uri.EscapeDataString(lalamoveOrderId)}/drivers";
                    long drTimestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                    string drRawSig = $"{drTimestamp}\r\nGET\r\n{driverPath}\r\n\r\n";
                    string drSig;
                    using (var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(apiSecret)))
                    {
                        byte[] hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(drRawSig));
                        drSig = Convert.ToHexString(hash).ToLowerInvariant();
                    }

                    using var drReq = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl.TrimEnd('/')}{driverPath}");
                    drReq.Headers.TryAddWithoutValidation("Authorization", $"hmac {apiKey}:{drTimestamp}:{drSig}");
                    drReq.Headers.TryAddWithoutValidation("Market", market);
                    drReq.Headers.TryAddWithoutValidation("Request-ID", Guid.NewGuid().ToString());

                    using var drResp = await _http.SendAsync(drReq, ct);
                    if (drResp.IsSuccessStatusCode)
                    {
                        using var drDoc = JsonDocument.Parse(await drResp.Content.ReadAsStringAsync(ct));
                        var drRoot = drDoc.RootElement;
                        if (drRoot.TryGetProperty("data", out var drData))
                        {
                            driverName = drData.TryGetProperty("name", out var n) ? n.GetString() : null;
                            driverPhone = drData.TryGetProperty("phone", out var p) ? p.GetString() : null;
                            plateNumber = drData.TryGetProperty("plateNumber", out var pl) ? pl.GetString() : null;
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Lỗi khi lấy thông tin chi tiết tài xế cho đơn {OrderId}", lalamoveOrderId);
                }
            }

            return new ThongTinDonLalamove(
                OrderId: lalamoveOrderId,
                Status: status,
                ShareLink: shareLink,
                DriverId: driverId,
                TenTaiXe: driverName,
                SdtTaiXe: driverPhone,
                BienSoXe: plateNumber);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi gọi Lalamove Get Order API cho đơn {OrderId}", lalamoveOrderId);
            return null;
        }
    }

    private (string ApiKey, string ApiSecret) LayThongTinXacThuc()
    {
        string? apiKey = _config["Lalamove:ApiKey"]?.Trim();
        string? apiSecret = _config["Lalamove:ApiSecret"]?.Trim();

        if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(apiSecret))
        {
            throw new InvalidOperationException("Chưa cấu hình Lalamove:ApiKey hoặc Lalamove:ApiSecret trong hệ thống.");
        }

        return (apiKey, apiSecret);
    }

    private string LayBaseUrl(string apiKey)
    {
        string? configuredUrl = _config["Lalamove:BaseUrl"]?.Trim();
        if (!string.IsNullOrWhiteSpace(configuredUrl))
        {
            return configuredUrl;
        }

        if (apiKey.StartsWith("pk_test_", StringComparison.OrdinalIgnoreCase) ||
            apiKey.Contains("test", StringComparison.OrdinalIgnoreCase))
        {
            return "https://rest.sandbox.lalamove.com";
        }

        return "https://rest.lalamove.com";
    }

    private string LayMarket() =>
        _config["Lalamove:Market"]?.Trim() is { Length: > 0 } m ? m : "VN_SGN";

    private string LayServiceType() =>
        _config["Lalamove:ServiceType"]?.Trim() is { Length: > 0 } s ? s : "MOTORCYCLE";

    private static string ChuanHoaSoDienThoai(string? sdt)
    {
        if (string.IsNullOrWhiteSpace(sdt)) return "+84908123456";
        string clean = Regex.Replace(sdt, @"[^\d+]", "");
        if (clean.StartsWith("0"))
        {
            clean = "+84" + clean[1..];
        }
        else if (!clean.StartsWith("+"))
        {
            clean = "+84" + clean;
        }
        return clean;
    }

    private static string TrichXuatThongBaoLoi(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (root.TryGetProperty("message", out var msgProp) && msgProp.GetString() is { Length: > 0 } msg)
                return msg;

            if (root.TryGetProperty("detail", out var detailProp) && detailProp.GetString() is { Length: > 0 } detail)
                return detail;

            if (root.TryGetProperty("errors", out var errorsProp) && errorsProp.GetArrayLength() > 0)
            {
                var first = errorsProp[0];
                if (first.TryGetProperty("detail", out var dProp) && dProp.GetString() is { Length: > 0 } d)
                    return d;
                if (first.TryGetProperty("id", out var idProp) && idProp.GetString() is { Length: > 0 } id)
                    return id;
            }
        }
        catch
        {
            // Bỏ qua lỗi parse JSON nếu body không phải JSON
        }

        return json.Length > 200 ? json[..200] + "..." : json;
    }
}
