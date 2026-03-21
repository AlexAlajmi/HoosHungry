namespace backend;

public static class WalletEndpoints
{
    public static RouteGroupBuilder MapWalletEndpoints(this RouteGroupBuilder api)
    {
        api.MapPost("/wallets/{sellerId}/withdraw", WithdrawFundsAsync);
        return api;
    }

    private static Task<IResult> WithdrawFundsAsync(
        string sellerId,
        WithdrawFundsRequest request,
        IHttpClientFactory httpClientFactory,
        SupabaseSettings settings,
        CancellationToken cancellationToken)
    {
        return MarketplaceData.ExecuteAsync(async () =>
        {
            if (request.Amount <= 0)
            {
                throw new InvalidOperationException("Withdrawal amount must be positive.");
            }

            var client = httpClientFactory.CreateClient();
            var state = await MarketplaceData.LoadDashboardStateAsync(client, settings, cancellationToken);
            var seller = state.Sellers.SingleOrDefault(user => user.Id == sellerId)
                ?? throw new InvalidOperationException("Seller not found.");

            if (seller.WalletBalance < request.Amount)
            {
                throw new InvalidOperationException(
                    "Seller wallet balance is too low for that withdrawal.");
            }

            seller.WalletBalance -= request.Amount;
            await MarketplaceData.PatchUserAsync(client, settings, seller, cancellationToken);
            await MarketplaceData.InsertWithdrawalAsync(
                client,
                settings,
                new WithdrawalRecord
                {
                    Id = MarketplaceData.NewId("withdraw"),
                    SellerId = seller.Id,
                    SellerName = seller.Name,
                    Amount = request.Amount,
                    CreatedAtUtc = DateTime.UtcNow,
                },
                cancellationToken
            );
            await MarketplaceData.InsertNotificationAsync(
                client,
                settings,
                new NotificationItem
                {
                    Id = MarketplaceData.NewId("note"),
                    UserId = seller.Id,
                    Title = "Withdrawal queued",
                    Message =
                        $"{request.Amount:C} will be moved from your HoosHungry wallet to your mocked bank balance.",
                    CreatedAtUtc = DateTime.UtcNow,
                },
                cancellationToken
            );

            return await MarketplaceData.LoadDashboardStateAsync(client, settings, cancellationToken);
        });
    }
}
