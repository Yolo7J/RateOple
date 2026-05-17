using RateOple.Core.Email;

namespace RateOple.Core.Tests.Email;

public class FakeEmailSenderTests
{
    [Fact]
    public async Task SendAsync_StoresEmailsInSendOrder()
    {
        var sender = new FakeEmailSender();

        await sender.SendAsync("first@example.test", "First", "<p>First</p>");
        await sender.SendAsync("second@example.test", "Second", "<p>Second</p>");

        Assert.Collection(
            sender.Sent,
            first =>
            {
                Assert.Equal("first@example.test", first.To);
                Assert.Equal("First", first.Subject);
                Assert.Equal("<p>First</p>", first.HtmlBody);
            },
            second =>
            {
                Assert.Equal("second@example.test", second.To);
                Assert.Equal("Second", second.Subject);
                Assert.Equal("<p>Second</p>", second.HtmlBody);
            });
    }
}
