using System.Globalization;
using System.Net;
using System.Text.RegularExpressions;
using ComTruaAnhBeo.Models;
using MailKit;
using MailKit.Net.Imap;
using MailKit.Search;
using MailKit.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using MimeKit;

namespace ComTruaAnhBeo.Services;

public sealed class BankPaymentEmailWorker : BackgroundService
{
    private const int PaymentTimeoutMinutes = 10;
    private static readonly Regex TrackingCodePattern = new(@"\bCM\d{10}\b", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
    private static readonly Regex AmountPattern = new(
        @"(?:\b(?:nhận(?:\s+được)?|ghi\s+có|cộng|received|credited|số\s+tiền(?:\s+giao\s+dịch)?|amount|GD|giao\s+dịch)\s*[:=]?\s*\+?\s*|\+\s*)(?<amount>\d{1,3}(?:[.,]\d{3})+|\d+)\s*(?:VND|VNĐ|đồng|đ)(?!\p{L})",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    private readonly BankPaymentEmailSettings _settings;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<BankPaymentEmailWorker> _logger;

    public BankPaymentEmailWorker(
        IOptions<BankPaymentEmailSettings> options,
        IServiceScopeFactory scopeFactory,
        ILogger<BankPaymentEmailWorker> logger)
    {
        _settings = options.Value;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var canReadEmail = ValidateSettings();
        while (!stoppingToken.IsCancellationRequested)
        {
            if (canReadEmail)
            {
                try
                {
                    await ProcessUnreadEmailsAsync(stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception exception)
                {
                    _logger.LogError(exception, "Không thể xử lý email thanh toán ngân hàng trong chu kỳ này.");
                }
            }

            try
            {
                await CancelExpiredOrdersAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "Không thể hủy các đơn chuyển khoản quá hạn trong chu kỳ này.");
            }

            await Task.Delay(TimeSpan.FromSeconds(Math.Clamp(_settings.PollIntervalSeconds, 5, 300)), stoppingToken);
        }
    }

    private bool ValidateSettings()
    {
        if (!_settings.Enabled)
        {
            _logger.LogInformation("Đọc email xác nhận chuyển khoản đang tắt. Các đơn chuyển khoản quá hạn vẫn được tự động hủy.");
            return false;
        }

        var missingSettings = new List<string>();
        if (string.IsNullOrWhiteSpace(_settings.ImapHost))
        {
            missingSettings.Add("BankPaymentEmail:ImapHost");
        }

        if (string.IsNullOrWhiteSpace(_settings.Username))
        {
            missingSettings.Add("BankPaymentEmail:Username");
        }

        if (string.IsNullOrWhiteSpace(_settings.Password))
        {
            missingSettings.Add("BankPaymentEmail:Password");
        }

        if (string.IsNullOrWhiteSpace(_settings.BankSenderAddress))
        {
            missingSettings.Add("BankPaymentEmail:BankSenderAddress");
        }

        if (_settings.ImapPort is < 1 or > 65535)
        {
            missingSettings.Add("BankPaymentEmail:ImapPort");
        }

        if (_settings.PollIntervalSeconds is < 5 or > 300)
        {
            missingSettings.Add("BankPaymentEmail:PollIntervalSeconds (5-300)");
        }

        if (missingSettings.Count > 0)
        {
            _logger.LogError(
                "Không thể bật đọc email thanh toán. Thiếu hoặc không hợp lệ: {Settings}",
                string.Join(", ", missingSettings));
            return false;
        }

        return true;
    }

    private async Task ProcessUnreadEmailsAsync(CancellationToken cancellationToken)
    {
        using var client = new ImapClient();
        await client.ConnectAsync(
            _settings.ImapHost,
            _settings.ImapPort,
            SecureSocketOptions.SslOnConnect,
            cancellationToken);
        await client.AuthenticateAsync(_settings.Username, _settings.Password, cancellationToken);

        var inbox = client.Inbox;
        await inbox.OpenAsync(FolderAccess.ReadWrite, cancellationToken);
        var unreadMessages = await inbox.SearchAsync(
            SearchQuery.NotSeen.And(SearchQuery.FromContains(_settings.BankSenderAddress)),
            cancellationToken);

        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ComTruaAnhBeoContext>();
        foreach (var uid in unreadMessages)
        {
            var message = await inbox.GetMessageAsync(uid, cancellationToken);
            try
            {
                if (IsFromConfiguredBank(message))
                {
                    await ProcessPaymentMessageAsync(db, message, cancellationToken);
                }
                else
                {
                    _logger.LogWarning(
                        "Bỏ qua email thanh toán có địa chỉ người gửi không khớp cấu hình: {Sender}",
                        string.Join(", ", message.From.Mailboxes.Select(mailbox => mailbox.Address)));
                }

                await inbox.AddFlagsAsync(uid, MessageFlags.Seen, true, cancellationToken);
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                _logger.LogError(
                    exception,
                    "Không xử lý được email thanh toán UID {Uid}; email sẽ được giữ lại để thử lại.",
                    uid);
                throw;
            }
        }

        await client.DisconnectAsync(true, cancellationToken);
    }

    private bool IsFromConfiguredBank(MimeMessage message) =>
        message.From.Mailboxes.Any(mailbox =>
            string.Equals(mailbox.Address, _settings.BankSenderAddress, StringComparison.OrdinalIgnoreCase));

    private async Task ProcessPaymentMessageAsync(
        ComTruaAnhBeoContext db,
        MimeMessage message,
        CancellationToken cancellationToken)
    {
        var body = GetSearchableBody(message);
        var trackingCode = TrackingCodePattern.Match($"{message.Subject}\n{body}");
        var amounts = AmountPattern.Matches($"{message.Subject}\n{body}")
            .Select(match => decimal.TryParse(
                match.Groups["amount"].Value.Replace(".", "").Replace(",", ""),
                NumberStyles.None,
                CultureInfo.InvariantCulture,
                out var amount)
                ? (decimal?)amount
                : null)
            .Where(amount => amount.HasValue)
            .Select(amount => amount!.Value)
            .ToHashSet();

        if (!trackingCode.Success || amounts.Count == 0)
        {
            _logger.LogWarning("Bỏ qua email ngân hàng không có mã đơn hoặc số tiền hợp lệ.");
            return;
        }

        var payment = await db.ThanhToans
            .Include(item => item.MaDonNavigation)
            .FirstOrDefaultAsync(
                item => item.MaDonNavigation.MaTraCuu == trackingCode.Value,
                cancellationToken);
        if (payment is null)
        {
            _logger.LogWarning("Không tìm thấy đơn hàng có mã chuyển khoản {TrackingCode}.", trackingCode.Value);
            return;
        }

        if (payment.PhuongThuc != "BANK" ||
            payment.TrangThai != "ChuaTT" ||
            payment.MaDonNavigation.TrangThai is "Huy" or "DaHuy")
        {
            _logger.LogInformation(
                "Bỏ qua email cho đơn {TrackingCode} do đơn không còn chờ thanh toán chuyển khoản.",
                trackingCode.Value);
            return;
        }

        var now = DateTime.Now;
        if (payment.HanThanhToan is null || payment.HanThanhToan <= now)
        {
            _logger.LogWarning("Bỏ qua khoản chuyển khoản đến sau hạn thanh toán của đơn {TrackingCode}.", trackingCode.Value);
            return;
        }

        if (!amounts.Contains(payment.SoTien))
        {
            _logger.LogWarning(
                "Số tiền trong email không khớp số tiền đơn {TrackingCode}; không tự xác nhận thanh toán.",
                trackingCode.Value);
            return;
        }

        payment.TrangThai = "DaTT";
        payment.ThoiGianTt = now;
        await db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Đã tự xác nhận thanh toán cho đơn {TrackingCode}.", trackingCode.Value);
    }

    private static string GetSearchableBody(MimeMessage message)
    {
        var body = message.TextBody;
        if (string.IsNullOrWhiteSpace(body))
        {
            body = Regex.Replace(message.HtmlBody ?? string.Empty, "<[^>]+>", " ");
            body = WebUtility.HtmlDecode(body);
        }

        return body;
    }

    private async Task CancelExpiredOrdersAsync(CancellationToken cancellationToken)
    {
        var now = DateTime.Now;
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ComTruaAnhBeoContext>();
        var expiredPayments = await db.ThanhToans
            .Include(payment => payment.MaDonNavigation)
            .Where(payment =>
                payment.PhuongThuc == "BANK" &&
                payment.TrangThai == "ChuaTT" &&
                payment.HanThanhToan <= now &&
                payment.MaDonNavigation.TrangThai != "Huy" &&
                payment.MaDonNavigation.TrangThai != "DaHuy")
            .ToListAsync(cancellationToken);

        foreach (var payment in expiredPayments)
        {
            payment.MaDonNavigation.TrangThai = "Huy";
            payment.MaDonNavigation.LyDoHuy = $"Quá hạn thanh toán ({PaymentTimeoutMinutes} phút)";
        }

        if (expiredPayments.Count > 0)
        {
            await db.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Đã tự hủy {OrderCount} đơn chuyển khoản quá hạn.", expiredPayments.Count);
        }
    }
}
