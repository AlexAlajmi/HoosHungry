namespace backend;

public static class OfferEndpoints
{
    public static RouteGroupBuilder MapOfferEndpoints(this RouteGroupBuilder api)
    {
        api.MapPost("/offers", CreateOfferAsync);
        api.MapPost("/offers/{offerId}/decision", DecideOfferAsync);
        return api;
    }

    private static Task<IResult> CreateOfferAsync(
        CreateOfferRequest request,
        IHttpClientFactory httpClientFactory,
        SupabaseSettings settings,
        CancellationToken cancellationToken)
    {
        return MarketplaceData.ExecuteAsync(async () =>
        {
            if (request.Price <= 0)
            {
                throw new InvalidOperationException("Offer price must be greater than zero.");
            }
            if (string.IsNullOrWhiteSpace(request.Item))
            {
                throw new InvalidOperationException("Menu item is required.");
            }
            if (string.IsNullOrWhiteSpace(request.Location))
            {
                throw new InvalidOperationException("Pickup location is required.");
            }

            var client = httpClientFactory.CreateClient();
            var state = await MarketplaceData.LoadDashboardStateAsync(client, settings, cancellationToken);
            var buyer = state.Buyers.SingleOrDefault(user => user.Id == request.BuyerId)
                ?? throw new InvalidOperationException("Buyer not found.");
            var availableSellers = state.Sellers
                .Where(user => user.MealExchangeAvailable && user.Id != buyer.Id)
                .ToList();

            if (availableSellers.Count == 0)
            {
                throw new InvalidOperationException(
                    "No sellers are currently marked as meal exchange available.");
            }

            var requestGroupId = MarketplaceData.NewId("request");
            var createdAtUtc = DateTime.UtcNow;
            var offers = availableSellers.Select(seller => new OfferRecord
            {
                Id = MarketplaceData.NewId("offer"),
                RequestGroupId = requestGroupId,
                BuyerId = buyer.Id,
                BuyerName = buyer.Name,
                SellerId = seller.Id,
                SellerName = seller.Name,
                Item = request.Item.Trim(),
                Location = request.Location.Trim(),
                Price = request.Price,
                Status = OfferStatus.Pending,
                CreatedAtUtc = createdAtUtc,
            }).ToList();

            await MarketplaceData.InsertOffersAsync(client, settings, offers, cancellationToken);

            foreach (var offer in offers)
            {
                await MarketplaceData.InsertNotificationAsync(
                    client,
                    settings,
                    new NotificationItem
                    {
                        Id = MarketplaceData.NewId("note"),
                        UserId = offer.SellerId,
                        Title = "New meal exchange bid",
                        Message = $"{buyer.Name} offered {request.Price:C} for a meal exchange today.",
                        ActionType = "ReviewOffer",
                        ActionTargetId = offer.Id,
                        CreatedAtUtc = DateTime.UtcNow,
                    },
                    cancellationToken
                );
            }

            await MarketplaceData.InsertNotificationAsync(
                client,
                settings,
                new NotificationItem
                {
                    Id = MarketplaceData.NewId("note"),
                    UserId = buyer.Id,
                    Title = "Offer broadcast sent",
                    Message =
                        $"Your {request.Price:C} meal exchange offer was sent to {availableSellers.Count} available seller(s).",
                    ActionType = "OpenBuyerDashboard",
                    CreatedAtUtc = DateTime.UtcNow,
                },
                cancellationToken
            );

            return await MarketplaceData.LoadDashboardStateAsync(client, settings, cancellationToken);
        });
    }

    private static Task<IResult> DecideOfferAsync(
        string offerId,
        OfferDecisionRequest request,
        IHttpClientFactory httpClientFactory,
        SupabaseSettings settings,
        CancellationToken cancellationToken)
    {
        return MarketplaceData.ExecuteAsync(async () =>
        {
            var client = httpClientFactory.CreateClient();
            var state = await MarketplaceData.LoadDashboardStateAsync(client, settings, cancellationToken);
            var offer = state.Offers.SingleOrDefault(item => item.Id == offerId)
                ?? throw new InvalidOperationException("Offer not found.");

            if (offer.Status != OfferStatus.Pending)
            {
                throw new InvalidOperationException("Only pending offers can be updated.");
            }

            if (!request.Accept)
            {
                offer.Status = OfferStatus.Declined;
                await MarketplaceData.PatchOfferStatusAsync(client, settings, offer, cancellationToken);
                await MarketplaceData.InsertNotificationAsync(
                    client,
                    settings,
                new NotificationItem
                {
                    Id = MarketplaceData.NewId("note"),
                    UserId = offer.BuyerId,
                    Title = "Seller declined your offer",
                    Message = $"{offer.SellerName} declined the {offer.Price:C} meal exchange offer.",
                    ActionType = "OpenBuyerDashboard",
                    CreatedAtUtc = DateTime.UtcNow,
                },
                cancellationToken
            );

                return await MarketplaceData.LoadDashboardStateAsync(client, settings, cancellationToken);
            }

            var relatedOffers = state.Offers.Where(item => item.RequestGroupId == offer.RequestGroupId).ToList();
            if (relatedOffers.Any(item => item.Id != offer.Id && item.Status == OfferStatus.Accepted))
            {
                throw new InvalidOperationException(
                    "A seller has already accepted this buyer request.");
            }

            offer.Status = OfferStatus.Accepted;
            await MarketplaceData.PatchOfferStatusAsync(client, settings, offer, cancellationToken);

            foreach (var sibling in relatedOffers.Where(item =>
                         item.Id != offer.Id && item.Status == OfferStatus.Pending))
            {
                sibling.Status = OfferStatus.Declined;
                await MarketplaceData.PatchOfferStatusAsync(client, settings, sibling, cancellationToken);
            }

            var seller = state.Sellers.SingleOrDefault(user => user.Id == offer.SellerId)
                ?? throw new InvalidOperationException("Seller not found.");
            seller.MealExchangeAvailable = false;
            await MarketplaceData.PatchUserAsync(client, settings, seller, cancellationToken);

            var order = new OrderRecord
            {
                Id = MarketplaceData.NewId("order"),
                OfferId = offer.Id,
                RequestGroupId = offer.RequestGroupId,
                InvoiceId = $"invoice-{offer.RequestGroupId}",
                BuyerId = offer.BuyerId,
                BuyerName = offer.BuyerName,
                SellerId = offer.SellerId,
                SellerName = offer.SellerName,
                Item = offer.Item,
                Location = offer.Location,
                OfferedPrice = offer.Price,
                GrubhubConfirmed = false,
                FundsReleasedToSeller = false,
                Status = OrderStatus.AwaitingConfirmation,
                CreatedAtUtc = DateTime.UtcNow,
            };

            await MarketplaceData.InsertOrderAsync(client, settings, order, cancellationToken);
            await MarketplaceData.InsertTrackingEventAsync(
                client,
                settings,
                order.Id,
                new TrackingEvent
                {
                    Id = MarketplaceData.NewId("track"),
                    Status = OrderStatus.AwaitingConfirmation,
                    Label = "Seller accepted",
                    Detail =
                        "Buyer funds are held in mock escrow. Waiting on meal exchange confirmation.",
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
                    UserId = offer.BuyerId,
                    Title = "Offer accepted",
                    Message = $"{offer.SellerName} accepted your {offer.Price:C} meal exchange request.",
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
                    UserId = offer.SellerId,
                    Title = "Confirm the meal exchange order",
                    Message =
                        "Use the mock Grubhub confirmation step to mark the meal exchange as placed.",
                    ActionType = "ConfirmOrder",
                    ActionTargetId = order.Id,
                    CreatedAtUtc = DateTime.UtcNow,
                },
                cancellationToken
            );

            return await MarketplaceData.LoadDashboardStateAsync(client, settings, cancellationToken);
        });
    }
}
