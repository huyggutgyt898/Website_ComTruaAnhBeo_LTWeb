using ComTruaAnhBeo.Models;
using Microsoft.EntityFrameworkCore;

namespace ComTruaAnhBeo.Services;

public sealed class OnlinePaymentExpiryWorker : BackgroundService
{
    private const int PaymentTimeoutMinutes = 10;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<OnlinePaymentExpiryWorker> _logger;

    public OnlinePaymentExpiryWorker(
        IServiceScopeFactory scopeFactory,
        ILogger<OnlinePaymentExpiryWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
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
                _logger.LogError(exception, "Không thể hủy các đơn thanh toán online quá hạn trong chu kỳ này.");
            }

            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
    }

    private async Task CancelExpiredOrdersAsync(CancellationToken cancellationToken)
    {
        var paymentDeadline = DateTime.Now.AddMinutes(-PaymentTimeoutMinutes);
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ComTruaAnhBeoContext>();
        var expiredPayments = await db.ThanhToans
            .Include(payment => payment.MaDonNavigation)
            .Where(payment =>
                payment.PhuongThuc != "COD" &&
                payment.TrangThai == "ChuaTT" &&
                payment.MaDonNavigation.NgayDat <= paymentDeadline &&
                payment.MaDonNavigation.TrangThai != "DaHuy")
            .ToListAsync(cancellationToken);

        foreach (var payment in expiredPayments)
        {
            payment.TrangThai = "HetHan";
            payment.MaDonNavigation.TrangThai = "DaHuy";
            payment.MaDonNavigation.LyDoHuy = $"Quá hạn thanh toán ({PaymentTimeoutMinutes} phút)";
        }

        if (expiredPayments.Count > 0)
        {
            await db.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Đã tự hủy {OrderCount} đơn thanh toán online quá hạn.", expiredPayments.Count);
        }
    }
}
