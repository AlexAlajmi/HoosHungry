namespace backend;

public static class SellerEndpoints
{
    public static RouteGroupBuilder MapSellerEndpoints(this RouteGroupBuilder api)
    {
        api.MapPost("/sellers/{sellerId}/availability", SetAvailabilityAsync);
        return api;
    }

    private static Task<IResult> SetAvailabilityAsync(
        string sellerId,
        SetAvailabilityRequest request,
        IHttpClientFactory httpClientFactory,
        SupabaseSettings settings,
        CancellationToken cancellationToken)
    {
        return MarketplaceData.ExecuteAsync(async () =>
        {
            var client = httpClientFactory.CreateClient();
            var state = await MarketplaceData.LoadDashboardStateAsync(client, settings, cancellationToken);
            var seller = state.Sellers.SingleOrDefault(user => user.Id == sellerId)
                ?? throw new InvalidOperationException("Seller not found.");

            seller.MealExchangeAvailable = request.IsAvailable;
            await MarketplaceData.PatchUserAsync(client, settings, seller, cancellationToken);
            await MarketplaceData.InsertNotificationAsync(
                client,
                settings,
                new NotificationItem
                {
                    Id = MarketplaceData.NewId("note"),
                    UserId = sellerId,
                    Title = request.IsAvailable
                        ? "Meal exchange availability is live"
                        : "Meal exchange availability paused",
                    Message = request.IsAvailable
                        ? "Buyers can now send offers for today's meal exchange."
                        : "You will not receive new buyer offers until you go live again.",
                    CreatedAtUtc = DateTime.UtcNow,
                },
                cancellationToken
            );

            return await MarketplaceData.LoadDashboardStateAsync(client, settings, cancellationToken);
        });
    }
}
