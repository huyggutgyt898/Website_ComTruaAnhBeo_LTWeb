using System.Globalization;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace ComTruaAnhBeo.Services;

public sealed class OpenRouteService : IOpenRouteService
{
    private readonly HttpClient _http;
    private readonly IConfiguration _config;
    private readonly ILogger<OpenRouteService> _logger;

    public OpenRouteService(HttpClient http, IConfiguration config, ILogger<OpenRouteService> logger)
    {
        _http = http;
        _config = config;
        _logger = logger;
    }

    public async Task<DiaChiDuocXacMinh?> GeocodeAsync(string diaChi, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(diaChi)) return null;

        string apiKey = LayApiKey();
        string baseUrl = LayBaseUrl();

        double latQuan = _config.GetValue<double>("CuaHang:ViDo");
        double lngQuan = _config.GetValue<double>("CuaHang:KinhDo");

        // 1. Thử tìm kiếm lần 1 với nguyên văn địa chỉ người dùng nhập qua Pelias
        DiaChiDuocXacMinh? ketQua = null;
        try
        {
            ketQua = await TimKiemPeliasAsync(baseUrl, apiKey, diaChi.Trim(), latQuan, lngQuan, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Lỗi khi gọi Pelias Geocode ban đầu.");
        }

        // 2. Nếu Pelias không tìm thấy, trả về null (hoặc hết quota 403), thử ngay qua Photon (OpenStreetMap) với nguyên văn
        if (ketQua is null || LaToaDoMacDinhThanhPho(ketQua))
        {
            var ketQuaPhoton = await TimKiemPhotonAsync(diaChi.Trim(), latQuan, lngQuan, ct);
            if (ketQuaPhoton is not null && !LaToaDoMacDinhThanhPho(ketQuaPhoton))
            {
                ketQua = ketQuaPhoton;
            }
        }

        // 3. Nếu vẫn không thấy, làm sạch chuỗi (bỏ mã bưu chính, khu phố/tổ, tiền tố thừa) rồi tìm kiếm
        if (ketQua is null || LaToaDoMacDinhThanhPho(ketQua))
        {
            string diaChiLamSach = LamSachDiaChi(diaChi);
            if (!string.Equals(diaChiLamSach, diaChi, StringComparison.OrdinalIgnoreCase))
            {
                var ketQuaPhotonSach = await TimKiemPhotonAsync(diaChiLamSach, latQuan, lngQuan, ct);
                if (ketQuaPhotonSach is not null && !LaToaDoMacDinhThanhPho(ketQuaPhotonSach))
                {
                    ketQua = ketQuaPhotonSach;
                }
                else
                {
                    var ketQuaPeliasSach = await TimKiemPeliasAsync(baseUrl, apiKey, diaChiLamSach, latQuan, lngQuan, ct);
                    if (ketQuaPeliasSach is not null && !LaToaDoMacDinhThanhPho(ketQuaPeliasSach))
                    {
                        ketQua = ketQuaPeliasSach;
                    }
                }
            }
        }

        // 4. Nếu địa chỉ dài nhưng vẫn chưa tìm thấy hoặc chỉ ra tâm TP.HCM, bóc tách tên địa danh / trục đường chính
        if (ketQua is null || LaToaDoMacDinhThanhPho(ketQua))
        {
            string tenDiaDanh = TrichXuatTenDiaDanhChinh(diaChi);
            if (!string.IsNullOrWhiteSpace(tenDiaDanh))
            {
                string textDiaDanh = $"{tenDiaDanh}, Thành phố Hồ Chí Minh";
                var ketQuaDiaDanh = await TimKiemPhotonAsync(textDiaDanh, latQuan, lngQuan, ct);
                if (ketQuaDiaDanh is not null && !LaToaDoMacDinhThanhPho(ketQuaDiaDanh))
                {
                    ketQua = ketQuaDiaDanh;
                }
                else
                {
                    var ketQuaPeliasDiaDanh = await TimKiemPeliasAsync(baseUrl, apiKey, textDiaDanh, latQuan, lngQuan, ct);
                    if (ketQuaPeliasDiaDanh is not null && !LaToaDoMacDinhThanhPho(ketQuaPeliasDiaDanh))
                    {
                        ketQua = ketQuaPeliasDiaDanh;
                    }
                }
            }
        }

        // 5. Tuyệt đối không chấp nhận tọa độ mặc định tâm thành phố (Quận 1) nếu người dùng nhập địa chỉ chi tiết
        // Trả về null để hệ thống yêu cầu người dùng cung cấp số nhà/tên đường cụ thể hơn, tránh tính khoảng cách ảo
        if (ketQua is not null && LaToaDoMacDinhThanhPho(ketQua) && diaChi.Length > 20)
        {
            _logger.LogWarning("Địa chỉ '{DiaChi}' chỉ định vị được tâm toàn thành phố (Ho Chi Minh City). Từ chối để tránh khoảng cách ảo.", diaChi);
            return null;
        }

        return ketQua;
    }

    private async Task<DiaChiDuocXacMinh?> TimKiemPeliasAsync(
        string baseUrl, string apiKey, string text,
        double focusLat, double focusLng, CancellationToken ct)
    {
        string focusParams = "";
        if (focusLat > 0 && focusLng > 0)
        {
            focusParams = $"&focus.point.lat={focusLat.ToString("F6", CultureInfo.InvariantCulture)}" +
                          $"&focus.point.lon={focusLng.ToString("F6", CultureInfo.InvariantCulture)}";
        }

        string url = $"{baseUrl.TrimEnd('/')}/geocode/search?api_key={Uri.EscapeDataString(apiKey)}" +
                     $"&text={Uri.EscapeDataString(text)}" +
                     $"&boundary.country=VNM&size=5{focusParams}";

        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        using var response = await _http.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Pelias Search trả về HTTP {StatusCode} cho text '{Text}'", (int)response.StatusCode, text);
            return null;
        }

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
        var root = doc.RootElement;

        if (!root.TryGetProperty("features", out var features) || features.GetArrayLength() == 0)
        {
            return null;
        }

        JsonElement? bestFeature = null;
        int bestPriority = 99;

        foreach (var feat in features.EnumerateArray())
        {
            if (!feat.TryGetProperty("geometry", out var geom)) continue;
            var coords = geom.GetProperty("coordinates");
            double lng = coords[0].GetDouble();
            double lat = coords[1].GetDouble();

            if (!ToaDoThuocTpHcm(lat, lng)) continue;

            string layer = "unknown";
            if (feat.TryGetProperty("properties", out var pr) &&
                pr.TryGetProperty("layer", out var lProp))
            {
                layer = lProp.GetString()?.ToLowerInvariant() ?? "";
            }

            int priority = layer switch
            {
                "venue" => 1,
                "address" => 2,
                "street" => 3,
                "neighbourhood" => 4,
                "macrohood" => 5,
                "locality" => 10,
                "region" => 20,
                _ => 15
            };

            // Nếu tọa độ trùng đúng tâm thành phố (10.781971, 106.693081), giảm mức ưu tiên xuống thấp nhất
            if (Math.Abs(lat - 10.781971) < 0.005 && Math.Abs(lng - 106.693081) < 0.005)
            {
                priority = 50;
            }

            if (priority < bestPriority)
            {
                bestPriority = priority;
                bestFeature = feat;
            }
        }

        if (bestFeature is null)
        {
            var first = features[0];
            var c = first.GetProperty("geometry").GetProperty("coordinates");
            double lat = c[1].GetDouble();
            double lng = c[0].GetDouble();
            if (ToaDoThuocTpHcm(lat, lng))
            {
                bestFeature = first;
            }
            else
            {
                return null;
            }
        }

        var feature = bestFeature.Value;
        var geometry = feature.GetProperty("geometry");
        var finalCoords = geometry.GetProperty("coordinates");
        double finalLng = finalCoords[0].GetDouble();
        double finalLat = finalCoords[1].GetDouble();

        string formattedAddress = text;
        if (feature.TryGetProperty("properties", out var props))
        {
            if (props.TryGetProperty("label", out var labelProp) && labelProp.GetString() is { Length: > 0 } label)
            {
                formattedAddress = label;
            }
            else if (props.TryGetProperty("name", out var nameProp) && nameProp.GetString() is { Length: > 0 } name)
            {
                formattedAddress = name;
            }
        }

        bool isHcm = ToaDoThuocTpHcm(finalLat, finalLng);
        return new DiaChiDuocXacMinh(formattedAddress, finalLat, finalLng, isHcm);
    }

    private async Task<DiaChiDuocXacMinh?> TimKiemPhotonAsync(
        string text, double focusLat, double focusLng, CancellationToken ct)
    {
        try
        {
            string url = $"https://photon.komoot.io/api/?q={Uri.EscapeDataString(text)}&limit=5";
            if (focusLat > 0 && focusLng > 0)
            {
                url += $"&lat={focusLat.ToString("F6", CultureInfo.InvariantCulture)}" +
                       $"&lon={focusLng.ToString("F6", CultureInfo.InvariantCulture)}";
            }

            using var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.TryAddWithoutValidation("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            using var response = await _http.SendAsync(req, ct);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Photon Search trả về HTTP {StatusCode} cho text '{Text}'", (int)response.StatusCode, text);
                return null;
            }

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
            var root = doc.RootElement;

            if (!root.TryGetProperty("features", out var features) || features.GetArrayLength() == 0)
            {
                return null;
            }

            foreach (var feat in features.EnumerateArray())
            {
                if (!feat.TryGetProperty("geometry", out var geom)) continue;
                var coords = geom.GetProperty("coordinates");
                double lng = coords[0].GetDouble();
                double lat = coords[1].GetDouble();

                if (!ToaDoThuocTpHcm(lat, lng)) continue;

                string formattedAddress = text;
                if (feat.TryGetProperty("properties", out var props))
                {
                    var parts = new List<string>();
                    if (props.TryGetProperty("name", out var name) && name.GetString() is { Length: > 0 } n)
                        parts.Add(n);
                    if (props.TryGetProperty("street", out var street) && street.GetString() is { Length: > 0 } st && !parts.Contains(st))
                        parts.Add(st);
                    if (props.TryGetProperty("district", out var dist) && dist.GetString() is { Length: > 0 } d && !parts.Contains(d))
                        parts.Add(d);
                    if (props.TryGetProperty("city", out var city) && city.GetString() is { Length: > 0 } c && !parts.Contains(c))
                        parts.Add(c);
                    else
                        parts.Add("Thành phố Hồ Chí Minh");
                    parts.Add("Việt Nam");

                    formattedAddress = string.Join(", ", parts);
                }

                return new DiaChiDuocXacMinh(formattedAddress, lat, lng, true);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Lỗi khi gọi Photon Search cho text '{Text}'", text);
        }

        return null;
    }

    public async Task<TuyenDuong?> TinhKhoangCachAsync(
        double viDoDiemLay, double kinhDoDiemLay,
        double viDoDiemGiao, double kinhDoDiemGiao,
        CancellationToken ct = default)
    {
        // 1. Thử tính qua OpenRouteService nếu có cấu hình API key
        try
        {
            string apiKey = LayApiKey();
            string baseUrl = LayBaseUrl();
            string url = $"{baseUrl.TrimEnd('/')}/v2/directions/driving-car";

            using var message = new HttpRequestMessage(HttpMethod.Post, url);
            message.Headers.TryAddWithoutValidation("Authorization", apiKey.Trim());
            message.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            var payload = new
            {
                coordinates = new[]
                {
                    new[] { kinhDoDiemLay, viDoDiemLay },
                    new[] { kinhDoDiemGiao, viDoDiemGiao }
                }
            };
            message.Content = JsonContent.Create(payload);

            using var response = await _http.SendAsync(message, ct);
            if (response.IsSuccessStatusCode)
            {
                using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
                var root = doc.RootElement;
                if (root.TryGetProperty("routes", out var routes) && routes.GetArrayLength() > 0)
                {
                    var route = routes[0];
                    if (route.TryGetProperty("summary", out var summary))
                    {
                        double distanceMeters = summary.GetProperty("distance").GetDouble();
                        double km = distanceMeters / 1000.0;
                        double durationSeconds = summary.GetProperty("duration").GetDouble();
                        int rawCarMinutes = (int)Math.Ceiling(durationSeconds / 60.0);
                        int deliveryMinutes = Math.Max(rawCarMinutes, (int)Math.Ceiling((km / 30.0) * 60) + 5);
                        return new TuyenDuong(km, deliveryMinutes);
                    }
                }
            }
            else
            {
                _logger.LogWarning("OpenRouteService Directions trả về HTTP {StatusCode}. Chuyển sang OSRM fallback.", (int)response.StatusCode);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Lỗi khi gọi OpenRouteService Directions. Chuyển sang OSRM fallback.");
        }

        // 2. Fallback sang OSRM (Open Source Routing Machine)
        var tuyenOsrm = await TinhKhoangCachOsrmAsync(viDoDiemLay, kinhDoDiemLay, viDoDiemGiao, kinhDoDiemGiao, ct);
        if (tuyenOsrm is not null)
        {
            return tuyenOsrm;
        }

        // 3. Fallback cấp cuối cùng: Tính toán Haversine với hệ số uốn lượn đô thị TP.HCM
        return TinhKhoangCachHaversine(viDoDiemLay, kinhDoDiemLay, viDoDiemGiao, kinhDoDiemGiao);
    }

    private async Task<TuyenDuong?> TinhKhoangCachOsrmAsync(
        double viDoDiemLay, double kinhDoDiemLay,
        double viDoDiemGiao, double kinhDoDiemGiao,
        CancellationToken ct)
    {
        try
        {
            string url = $"https://router.project-osrm.org/route/v1/driving/" +
                         $"{kinhDoDiemLay.ToString(CultureInfo.InvariantCulture)},{viDoDiemLay.ToString(CultureInfo.InvariantCulture)};" +
                         $"{kinhDoDiemGiao.ToString(CultureInfo.InvariantCulture)},{viDoDiemGiao.ToString(CultureInfo.InvariantCulture)}?overview=false";

            using var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.TryAddWithoutValidation("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            using var resp = await _http.SendAsync(req, ct);
            if (!resp.IsSuccessStatusCode) return null;

            using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync(ct));
            var root = doc.RootElement;
            if (root.TryGetProperty("routes", out var routes) && routes.GetArrayLength() > 0)
            {
                var route = routes[0];
                double distanceMeters = route.GetProperty("distance").GetDouble();
                double km = distanceMeters / 1000.0;
                double durationSeconds = route.GetProperty("duration").GetDouble();
                int rawMinutes = (int)Math.Ceiling(durationSeconds / 60.0);
                int deliveryMinutes = Math.Max(rawMinutes, (int)Math.Ceiling((km / 30.0) * 60) + 5);
                return new TuyenDuong(km, deliveryMinutes);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Lỗi khi gọi OSRM fallback.");
        }
        return null;
    }

    private static TuyenDuong TinhKhoangCachHaversine(double lat1, double lon1, double lat2, double lon2)
    {
        const double r = 6371; // Bán kính Trái Đất (km)
        var dLat = (lat2 - lat1) * Math.PI / 180.0;
        var dLon = (lon2 - lon1) * Math.PI / 180.0;
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(lat1 * Math.PI / 180.0) * Math.Cos(lat2 * Math.PI / 180.0) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        var straightKm = r * c;

        // Nhân hệ số uốn khúc đường bộ thực tế trong đô thị TP.HCM (~1.35x chim bay)
        double km = Math.Round(straightKm * 1.35, 1);
        int deliveryMinutes = (int)Math.Ceiling((km / 25.0) * 60) + 5;
        return new TuyenDuong(km, deliveryMinutes);
    }

    private static bool ToaDoThuocTpHcm(double lat, double lng)
    {
        // Tọa độ bounding box TP.HCM mở rộng (Lat: 10.35 - 11.20, Lng: 106.35 - 107.05)
        return (lat >= 10.35 && lat <= 11.20) && (lng >= 106.35 && lng <= 107.05);
    }

    private static bool LaToaDoMacDinhThanhPho(DiaChiDuocXacMinh diaChi)
    {
        // Tọa độ mặc định khi Pelias fallback về trung tâm toàn TP.HCM (Quận 1)
        bool toaDoTrungTam = Math.Abs(diaChi.ViDo - 10.781971) < 0.005 &&
                             Math.Abs(diaChi.KinhDo - 106.693081) < 0.005;

        bool tenTrungTam = diaChi.DiaChiChuanHoa.Equals("Ho Chi Minh City, HC, Vietnam", StringComparison.OrdinalIgnoreCase) ||
                           diaChi.DiaChiChuanHoa.Equals("Ho Chi Minh City, Vietnam", StringComparison.OrdinalIgnoreCase);

        return toaDoTrungTam || tenTrungTam;
    }

    private static string LamSachDiaChi(string diaChi)
    {
        string s = diaChi;

        // Bỏ mã bưu chính (VD: , 71320 hoặc 72121)
        s = Regex.Replace(s, @",?\s*\b\d{5,6}\b", "");

        // Bỏ các phân cấp nội bộ không có trên bản đồ OSM (Khu phố XX, Tổ XX, Ấp XX)
        s = Regex.Replace(s, @",?\s*(Khu phố|KP|Tổ|Ấp)\s*\d+[a-zA-Z]?", "", RegexOptions.IgnoreCase);

        // Chuẩn hóa tên đơn vị hành chính phi chuẩn (VD: Phường Tân Sơn Nhất -> Tân Sơn Nhất)
        s = Regex.Replace(s, @"\bPhường\s+Tân\s+Sơn\s+Nhất\b", "Tân Sơn Nhất", RegexOptions.IgnoreCase);

        // Bỏ phần ", Việt Nam" thừa
        s = Regex.Replace(s, @",?\s*Việt\s*Nam\b", "", RegexOptions.IgnoreCase);

        return s.Trim().TrimEnd(',').Trim();
    }

    private static string TrichXuatTenDiaDanhChinh(string diaChi)
    {
        var parts = diaChi.Split(new[] { ',', '-' }, StringSplitOptions.RemoveEmptyEntries)
                          .Select(p => p.Trim())
                          .Where(p => p.Length > 0)
                          .ToArray();

        if (parts.Length > 0 && parts[0].Length >= 5)
        {
            return parts[0];
        }

        return "";
    }

    private string LayApiKey()
    {
        var key = _config["OpenRouteService:ApiKey"];
        if (string.IsNullOrWhiteSpace(key))
        {
            throw new InvalidOperationException("Thiếu OpenRouteService:ApiKey trong cấu hình. Vui lòng cấu hình qua appsettings hoặc User Secrets.");
        }
        return key.Trim();
    }

    private string LayBaseUrl()
    {
        var url = _config["OpenRouteService:BaseUrl"];
        if (string.IsNullOrWhiteSpace(url))
        {
            return "https://api.openrouteservice.org";
        }
        return url.Trim();
    }
}
