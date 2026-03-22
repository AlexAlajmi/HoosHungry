namespace backend;

public static class OrderEndpoints
{
    public static RouteGroupBuilder MapOrderEndpoints(this RouteGroupBuilder api)
    {
        api.MapPost("/orders/{orderId}/confirm", ConfirmOrderAsync);
        api.MapPost("/orders/{orderId}/complete", CompleteOrderAsync);
        api.MapPost("/orders/{orderId}/tracking", UpdateTrackingAsync);
        return api;
    }

    private static Task<IResult> ConfirmOrderAsync(
        string orderId,
        ConfirmOrderRequest request,
        IHttpClientFactory httpClientFactory,
        SupabaseSettings settings,
        CancellationToken cancellationToken)
    {
        return MarketplaceData.ExecuteAsync(async () =>
        {
            var client = httpClientFactory.CreateClient();
            var state = await MarketplaceData.LoadDashboardStateAsync(client, settings, cancellationToken);
            var order = state.Orders.SingleOrDefault(item => item.Id == orderId)
                ?? throw new InvalidOperationException("Order not found.");

            if (!order.GrubhubConfirmed)
            {
                order.GrubhubConfirmed = true;
                order.Status = OrderStatus.Preparing;
                order.EstimatedReadyAtUtc = DateTime.UtcNow.AddMinutes(12);
                order.FundsReleasedToSeller = true;
                await MarketplaceData.PatchOrderAsync(client, settings, order, cancellationToken);

                var seller = state.Sellers.SingleOrDefault(user => user.Id == order.SellerId)
                    ?? throw new InvalidOperationException("Seller not found.");
                seller.WalletBalance += order.OfferedPrice;
                await MarketplaceData.PatchUserAsync(client, settings, seller, cancellationToken);

                await MarketplaceData.InsertTrackingEventAsync(
                    client,
                    settings,
                    order.Id,
                    new TrackingEvent
                    {
                        Id = MarketplaceData.NewId("track"),
                        Status = OrderStatus.Preparing,
                        Label = "Meal exchange confirmed",
                        Detail = string.IsNullOrWhiteSpace(request.ConfirmationNote)
                            ? "Seller submitted the meal exchange in the mock Grubhub flow."
                            : request.ConfirmationNote,
                        CreatedAtUtc = DateTime.UtcNow,
                        EstimatedReadyAtUtc = order.EstimatedReadyAtUtc,
                    },
                    cancellationToken
                );

                await MarketplaceData.InsertNotificationAsync(
                    client,
                    settings,
                    new NotificationItem
                    {
                        Id = MarketplaceData.NewId("note"),
                        UserId = order.BuyerId,
                        Title = "Order confirmed",
                        Message =
                            $"{order.SellerName} confirmed the meal exchange order. ETA is about 12 minutes.",
                        ActionType = "ViewOrder",
                        ActionTargetId = order.Id,
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
                        UserId = order.SellerId,
                        Title = "Funds released to wallet",
                        Message =
                            $"{order.OfferedPrice:C} moved from mock escrow into your HoosHungry wallet.",
                        CreatedAtUtc = DateTime.UtcNow,
                    },
                    cancellationToken
                );
            }

            return await MarketplaceData.LoadDashboardStateAsync(client, settings, cancellationToken);
        });
    }

    private static Task<IResult> UpdateTrackingAsync(
        string orderId,
        TrackingUpdateRequest request,
        IHttpClientFactory httpClientFactory,
        SupabaseSettings settings,
        CancellationToken cancellationToken)
    {
        return MarketplaceData.ExecuteAsync(async () =>
        {
            if (request.Status == OrderStatus.Completed)
            {
                throw new InvalidOperationException(
                    "Only the buyer can complete the exchange."
                );
            }

            var client = httpClientFactory.CreateClient();
            var state = await MarketplaceData.LoadDashboardStateAsync(client, settings, cancellationToken);
            var order = state.Orders.SingleOrDefault(item => item.Id == orderId)
                ?? throw new InvalidOperationException("Order not found.");

            order.Status = request.Status;
            order.EstimatedReadyAtUtc = request.EstimatedReadyAtUtc;
            await MarketplaceData.PatchOrderAsync(client, settings, order, cancellationToken);

            await MarketplaceData.InsertTrackingEventAsync(
                client,
                settings,
                order.Id,
                new TrackingEvent
                {
                    Id = MarketplaceData.NewId("track"),
                    Status = request.Status,
                    Label = MarketplaceData.BuildTrackingLabel(request.Status),
                    Detail = string.IsNullOrWhiteSpace(request.Detail)
                        ? "Seller posted a tracking update."
                        : request.Detail,
                    CreatedAtUtc = DateTime.UtcNow,
                    EstimatedReadyAtUtc = request.EstimatedReadyAtUtc,
                },
                cancellationToken
            );

            var buyerMessage = request.Status switch
            {
                OrderStatus.ReadySoon => $"{order.SellerName} says the meal should be ready soon.",
                OrderStatus.ReadyForPickup =>
                    $"{order.SellerName} says the meal exchange is ready for pickup.",
                OrderStatus.Completed => "Pickup has been marked complete.",
                _ => $"{order.SellerName} updated the meal status.",
            };

            await MarketplaceData.InsertNotificationAsync(
                client,
                settings,
                new NotificationItem
                {
                    Id = MarketplaceData.NewId("note"),
                    UserId = order.BuyerId,
                    Title = "Meal tracking update",
                    Message = buyerMessage,
                    ActionType = "ViewOrder",
                    ActionTargetId = order.Id,
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
                    UserId = order.SellerId,
                    Title = "Tracking update sent",
                    Message = $"Buyer was notified: {buyerMessage}",
                    ActionType = "ViewOrder",
                    ActionTargetId = order.Id,
                    CreatedAtUtc = DateTime.UtcNow,
                },
                cancellationToken
            );

            return await MarketplaceData.LoadDashboardStateAsync(client, settings, cancellationToken);
        });
    }

    private static Task<IResult> CompleteOrderAsync(
        string orderId,
        CompleteOrderRequest request,
        IHttpClientFactory httpClientFactory,
        SupabaseSettings settings,
        CancellationToken cancellationToken)
    {
        return MarketplaceData.ExecuteAsync(async () =>
        {
            var client = httpClientFactory.CreateClient();
            var state = await MarketplaceData.LoadDashboardStateAsync(client, settings, cancellationToken);
            var order = state.Orders.SingleOrDefault(item => item.Id == orderId)
                ?? throw new InvalidOperationException("Order not found.");

            if (!string.Equals(order.BuyerId, request.BuyerId, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Only the matched buyer can complete this exchange.");
            }

            if (order.Status != OrderStatus.ReadyForPickup)
            {
                throw new InvalidOperationException("The exchange can only be completed after it is ready for pickup.");
            }

            order.Status = OrderStatus.Completed;
            order.EstimatedReadyAtUtc = null;
            await MarketplaceData.PatchOrderAsync(client, settings, order, cancellationToken);

            await MarketplaceData.InsertTrackingEventAsync(
                client,
                settings,
                order.Id,
                new TrackingEvent
                {
                    Id = MarketplaceData.NewId("track"),
                    Status = OrderStatus.Completed,
                    Label = MarketplaceData.BuildTrackingLabel(OrderStatus.Completed),
                    Detail = string.IsNullOrWhiteSpace(request.CompletionNote)
                        ? "Buyer confirmed the meal exchange pickup."
                        : request.CompletionNote,
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
                    UserId = order.SellerId,
                    Title = "Buyer completed the exchange",
                    Message = $"{order.BuyerName} confirmed the pickup was completed.",
                    ActionType = "ViewOrder",
                    ActionTargetId = order.Id,
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
                    UserId = order.BuyerId,
                    Title = "Exchange completed",
                    Message = "You confirmed the meal exchange pickup.",
                    ActionType = "ViewOrder",
                    ActionTargetId = order.Id,
                    CreatedAtUtc = DateTime.UtcNow,
                },
                cancellationToken
            );

            return await MarketplaceData.LoadDashboardStateAsync(client, settings, cancellationToken);
        });
    }
}
