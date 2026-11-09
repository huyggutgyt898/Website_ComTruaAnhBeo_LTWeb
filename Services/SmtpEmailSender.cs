using System.Net;
using System.Net.Mail;
using ComTruaAnhBeo.Models.Auth;
using Microsoft.Extensions.Options;

namespace ComTruaAnhBeo.Services;

public sealed class SmtpEmailSender(IOptions<EmailSettings> options) : IEmailSender
{
    private readonly EmailSettings _settings = options.Value;

    public Task SendRegistrationCodeAsync(
        string email,
        string fullName,
        string code,
        CancellationToken cancellationToken) =>
        SendAsync(
            email,
            "Mã xác nhận đăng ký tài khoản",
            $"Xin chào {fullName},\n\n" +
            $"Mã xác nhận đăng ký tài khoản Cơm Trưa Anh Béo của bạn là: {code}\n\n" +
            "Mã có hiệu lực trong 10 phút. Không chia sẻ mã này với bất kỳ ai.",
            cancellationToken);

    public Task SendPasswordResetCodeAsync(
        string email,
        string fullName,
        string code,
        CancellationToken cancellationToken) =>
        SendAsync(
            email,
            "Mã xác nhận đặt lại mật khẩu",
            $"Xin chào {fullName},\n\n" +
            $"Mã xác nhận để đặt lại hoặc đổi mật khẩu tài khoản Cơm Trưa Anh Béo của bạn là: {code}\n\n" +
            "Mã có hiệu lực trong 10 phút. Không chia sẻ mã này với bất kỳ ai.\n" +
            "Nếu bạn không yêu cầu, hãy bỏ qua email này, mật khẩu của bạn vẫn được giữ nguyên.",
            cancellationToken);

    private async Task SendAsync(
        string email,
        string subject,
        string body,
        CancellationToken cancellationToken)
    {
        ValidateSettings();

        MailAddress from;
        MailAddress recipient;
        try
        {
            from = new MailAddress(_settings.FromAddress, _settings.FromName);
            recipient = new MailAddress(email);
        }
        catch (FormatException exception)
        {
            throw new EmailSenderConfigurationException("The configured email address is invalid.", exception);
        }

        using var message = new MailMessage(from, recipient)
        {
            Subject = subject,
            Body = body,
            IsBodyHtml = false
        };
        using var client = new SmtpClient(_settings.SmtpHost, _settings.SmtpPort)
        {
            EnableSsl = _settings.EnableSsl,
            DeliveryMethod = SmtpDeliveryMethod.Network,
            UseDefaultCredentials = false,
            Credentials = new NetworkCredential(_settings.Username, _settings.Password)
        };

        await client.SendMailAsync(message, cancellationToken);
    }

    private void ValidateSettings()
    {
        var missingSettings = new List<string>();
        if (string.IsNullOrWhiteSpace(_settings.SmtpHost))
        {
            missingSettings.Add("Email:SmtpHost");
        }

        if (string.IsNullOrWhiteSpace(_settings.Username))
        {
            missingSettings.Add("Email:Username");
        }

        if (string.IsNullOrWhiteSpace(_settings.Password))
        {
            missingSettings.Add("Email:Password");
        }

        if (string.IsNullOrWhiteSpace(_settings.FromAddress))
        {
            missingSettings.Add("Email:FromAddress");
        }

        if (_settings.SmtpPort is < 1 or > 65535)
        {
            missingSettings.Add("Email:SmtpPort");
        }

        if (missingSettings.Count > 0)
        {
            throw new EmailSenderConfigurationException(
                $"Missing or invalid SMTP settings: {string.Join(", ", missingSettings)}.");
        }
    }
}