namespace ComTruaAnhBeo.Services;

public sealed class EmailSenderConfigurationException : Exception
{
    public EmailSenderConfigurationException(string message)
        : base(message)
    {
    }

    public EmailSenderConfigurationException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}
