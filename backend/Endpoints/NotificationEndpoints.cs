namespace backend;

public static class NotificationEndpoints
{
    public static RouteGroupBuilder MapNotificationEndpoints(this RouteGroupBuilder api)
    {
        api.MapPost("/notifications/{notificationId}/dismiss", DismissNotificationAsync);
        return api;
    }

    private static Task<IResult> DismissNotificationAsync(
        string notificationId,
        IHttpClientFactory httpClientFactory,
        SupabaseSettings settings,
        CancellationToken cancellationToken)
    {
        return MarketplaceData.ExecuteAsync(async () =>
        {
            var client = httpClientFactory.CreateClient();
            var state = await MarketplaceData.LoadDashboardStateAsync(client, settings, cancellationToken);
            var notification = state.Notifications.SingleOrDefault(item => item.Id == notificationId)
                ?? throw new InvalidOperationException("Notification not found.");

            await MarketplaceData.PatchNotificationDismissedAsync(
                client,
                settings,
                notification.Id,
                cancellationToken
            );

            return await MarketplaceData.LoadDashboardStateAsync(client, settings, cancellationToken);
        });
    }
}
