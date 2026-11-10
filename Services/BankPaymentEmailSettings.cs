namespace ComTruaAnhBeo.Services;

public sealed class BankPaymentEmailSettings
{
    public bool Enabled { get; set; }
    public string ImapHost { get; set; } = string.Empty;
    public int ImapPort { get; set; } = 993;
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string BankSenderAddress { get; set; } = string.Empty;
    public int PollIntervalSeconds { get; set; } = 15;
}
