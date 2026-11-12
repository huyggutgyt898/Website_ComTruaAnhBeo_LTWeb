namespace ComTruaAnhBeo.Services;

public interface IEmailSender
{
    Task SendRegistrationCodeAsync(
        string email,
        string fullName,
        string code,
        CancellationToken cancellationToken);

    Task SendPasswordResetCodeAsync(
        string email,
        string fullName,
        string code,
        CancellationToken cancellationToken);
}