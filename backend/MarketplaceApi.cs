using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace backend;

public static class MarketplaceApi
{
    public static IEndpointRouteBuilder MapMarketplaceApi(this IEndpointRouteBuilder app)
    {
        var api = app.MapGroup("/api");

        api.MapGet("/demo/state", GetDashboardStateAsync);
        api.MapPost("/sellers/{sellerId}/availability", SetAvailabilityAsync);
        api.MapPost("/offers", CreateOfferAsync);
        api.MapPost("/offers/{offerId}/decision", DecideOfferAsync);
        api.MapPost("/orders/{orderId}/confirm", ConfirmOrderAsync);
        api.MapPost("/orders/{orderId}/tracking", UpdateTrackingAsync);
        api.MapPost("/wallets/{sellerId}/withdraw", WithdrawFundsAsync);

        return app;
    }

    private static Task<IResult> GetDashboardStateAsync(
        IHttpClientFactory httpClientFactory,
        SupabaseSettings settings,
        CancellationToken cancellationToken)
    {
        return ExecuteAsync(async () =>
        {
            var client = httpClientFactory.CreateClient();
            return await LoadDashboardStateAsync(client, settings, cancellationToken);
        });
    }

    private static Task<IResult> SetAvailabilityAsync(
        string sellerId,
        SetAvailabilityRequest request,
        IHttpClientFactory httpClientFactory,
        SupabaseSettings settings,
        CancellationToken cancellationToken)
    {
        return ExecuteAsync(async () =>
        {
            var client = httpClientFactory.CreateClient();
            var state = await LoadDashboardStateAsync(client, settings, cancellationToken);
            var seller =
                state.Sellers.SingleOrDefault(user => user.Id == sellerId)
                ?? throw new InvalidOperationException("Seller not found.");

            seller.MealExchangeAvailable = request.IsAvailable;
            await PatchUserAsync(client, settings, seller, cancellationToken);
            await InsertNotificationAsync(
                client,
                settings,
                new NotificationItem
                {
                    Id = NewId("note"),
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

            return await LoadDashboardStateAsync(client, settings, cancellationToken);
        });
    }

    private static Task<IResult> CreateOfferAsync(
        CreateOfferRequest request,
        IHttpClientFactory httpClientFactory,
        SupabaseSettings settings,
        CancellationToken cancellationToken)
    {
        return ExecuteAsync(async () =>
        {
            if (request.Price <= 0)
            {
                throw new InvalidOperationException("Offer price must be greater than zero.");
            }

            var client = httpClientFactory.CreateClient();
            var state = await LoadDashboardStateAsync(client, settings, cancellationToken);
            var buyer =
                state.Buyers.SingleOrDefault(user => user.Id == request.BuyerId)
                ?? throw new InvalidOperationException("Buyer not found.");
            var availableSellers = state.Sellers.Where(user => user.MealExchangeAvailable).ToList();

            if (availableSellers.Count == 0)
            {
                throw new InvalidOperationException(
                    "No sellers are currently marked as meal exchange available."
                );
            }

            var requestGroupId = NewId("request");
            var createdAtUtc = DateTime.UtcNow;
            var offers = availableSellers
                .Select(seller => new OfferRecord
                {
                    Id = NewId("offer"),
                    RequestGroupId = requestGroupId,
                    BuyerId = buyer.Id,
                    BuyerName = buyer.Name,
                    SellerId = seller.Id,
                    SellerName = seller.Name,
                    Price = request.Price,
                    Status = OfferStatus.Pending,
                    CreatedAtUtc = createdAtUtc,
                })
                .ToList();

            await InsertOffersAsync(client, settings, offers, cancellationToken);

            foreach (var offer in offers)
            {
                await InsertNotificationAsync(
                    client,
                    settings,
                    new NotificationItem
                    {
                        Id = NewId("note"),
                        UserId = offer.SellerId,
                        Title = "New meal exchange bid",
                        Message =
                            $"{buyer.Name} offered {request.Price:C} for a meal exchange today.",
                        CreatedAtUtc = DateTime.UtcNow,
                    },
                    cancellationToken
                );
            }

            await InsertNotificationAsync(
                client,
                settings,
                new NotificationItem
                {
                    Id = NewId("note"),
                    UserId = buyer.Id,
                    Title = "Offer broadcast sent",
                    Message =
                        $"Your {request.Price:C} meal exchange offer was sent to {availableSellers.Count} available seller(s).",
                    CreatedAtUtc = DateTime.UtcNow,
                },
                cancellationToken
            );

            return await LoadDashboardStateAsync(client, settings, cancellationToken);
        });
    }

    private static Task<IResult> DecideOfferAsync(
        string offerId,
        OfferDecisionRequest request,
        IHttpClientFactory httpClientFactory,
        SupabaseSettings settings,
        CancellationToken cancellationToken)
    {
        return ExecuteAsync(async () =>
        {
            var client = httpClientFactory.CreateClient();
            var state = await LoadDashboardStateAsync(client, settings, cancellationToken);
            var offer =
                state.Offers.SingleOrDefault(item => item.Id == offerId)
                ?? throw new InvalidOperationException("Offer not found.");

            if (offer.Status != OfferStatus.Pending)
            {
                throw new InvalidOperationException("Only pending offers can be updated.");
            }

            if (!request.Accept)
            {
                offer.Status = OfferStatus.Declined;
                await PatchOfferStatusAsync(client, settings, offer, cancellationToken);
                await InsertNotificationAsync(
                    client,
                    settings,
                    new NotificationItem
                    {
                        Id = NewId("note"),
                        UserId = offer.BuyerId,
                        Title = "Seller declined your offer",
                        Message =
                            $"{offer.SellerName} declined the {offer.Price:C} meal exchange offer.",
                        CreatedAtUtc = DateTime.UtcNow,
                    },
                    cancellationToken
                );

                return await LoadDashboardStateAsync(client, settings, cancellationToken);
            }

            var relatedOffers = state
                .Offers.Where(item => item.RequestGroupId == offer.RequestGroupId)
                .ToList();
            if (relatedOffers.Any(item => item.Id != offer.Id && item.Status == OfferStatus.Accepted))
            {
                throw new InvalidOperationException(
                    "A seller has already accepted this buyer request."
                );
            }

            offer.Status = OfferStatus.Accepted;
            await PatchOfferStatusAsync(client, settings, offer, cancellationToken);

            foreach (var sibling in relatedOffers.Where(item =>
                         item.Id != offer.Id && item.Status == OfferStatus.Pending))
            {
                sibling.Status = OfferStatus.Declined;
                await PatchOfferStatusAsync(client, settings, sibling, cancellationToken);
            }

            var seller =
                state.Sellers.SingleOrDefault(user => user.Id == offer.SellerId)
                ?? throw new InvalidOperationException("Seller not found.");
            seller.MealExchangeAvailable = false;
            await PatchUserAsync(client, settings, seller, cancellationToken);

            var order = new OrderRecord
            {
                Id = NewId("order"),
                OfferId = offer.Id,
                RequestGroupId = offer.RequestGroupId,
                InvoiceId = $"invoice-{offer.RequestGroupId}",
                BuyerId = offer.BuyerId,
                BuyerName = offer.BuyerName,
                SellerId = offer.SellerId,
                SellerName = offer.SellerName,
                OfferedPrice = offer.Price,
                GrubhubConfirmed = false,
                FundsReleasedToSeller = false,
                Status = OrderStatus.AwaitingConfirmation,
                CreatedAtUtc = DateTime.UtcNow,
            };

            await InsertOrderAsync(client, settings, order, cancellationToken);
            await InsertTrackingEventAsync(
                client,
                settings,
                order.Id,
                new TrackingEvent
                {
                    Id = NewId("track"),
                    Status = OrderStatus.AwaitingConfirmation,
                    Label = "Seller accepted",
                    Detail =
                        "Buyer funds are held in mock escrow. Waiting on meal exchange confirmation.",
                    CreatedAtUtc = DateTime.UtcNow,
                },
                cancellationToken
            );

            await InsertNotificationAsync(
                client,
                settings,
                new NotificationItem
                {
                    Id = NewId("note"),
                    UserId = offer.BuyerId,
                    Title = "Offer accepted",
                    Message = $"{offer.SellerName} accepted your {offer.Price:C} meal exchange request.",
                    CreatedAtUtc = DateTime.UtcNow,
                },
                cancellationToken
            );
            await InsertNotificationAsync(
                client,
                settings,
                new NotificationItem
                {
                    Id = NewId("note"),
                    UserId = offer.SellerId,
                    Title = "Confirm the meal exchange order",
                    Message =
                        "Use the mock Grubhub confirmation step to mark the meal exchange as placed.",
                    CreatedAtUtc = DateTime.UtcNow,
                },
                cancellationToken
            );

            return await LoadDashboardStateAsync(client, settings, cancellationToken);
        });
    }

    private static Task<IResult> ConfirmOrderAsync(
        string orderId,
        ConfirmOrderRequest request,
        IHttpClientFactory httpClientFactory,
        SupabaseSettings settings,
        CancellationToken cancellationToken)
    {
        return ExecuteAsync(async () =>
        {
            var client = httpClientFactory.CreateClient();
            var state = await LoadDashboardStateAsync(client, settings, cancellationToken);
            var order =
                state.Orders.SingleOrDefault(item => item.Id == orderId)
                ?? throw new InvalidOperationException("Order not found.");

            if (!order.GrubhubConfirmed)
            {
                order.GrubhubConfirmed = true;
                order.Status = OrderStatus.Preparing;
                order.EstimatedReadyAtUtc = DateTime.UtcNow.AddMinutes(12);
                order.FundsReleasedToSeller = true;
                await PatchOrderAsync(client, settings, order, cancellationToken);

                var seller =
                    state.Sellers.SingleOrDefault(user => user.Id == order.SellerId)
                    ?? throw new InvalidOperationException("Seller not found.");
                seller.WalletBalance += order.OfferedPrice;
                await PatchUserAsync(client, settings, seller, cancellationToken);

                await InsertTrackingEventAsync(
                    client,
                    settings,
                    order.Id,
                    new TrackingEvent
                    {
                        Id = NewId("track"),
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

                await InsertNotificationAsync(
                    client,
                    settings,
                    new NotificationItem
                    {
                        Id = NewId("note"),
                        UserId = order.BuyerId,
                        Title = "Order confirmed",
                        Message =
                            $"{order.SellerName} confirmed the meal exchange order. ETA is about 12 minutes.",
                        CreatedAtUtc = DateTime.UtcNow,
                    },
                    cancellationToken
                );
                await InsertNotificationAsync(
                    client,
                    settings,
                    new NotificationItem
                    {
                        Id = NewId("note"),
                        UserId = order.SellerId,
                        Title = "Funds released to wallet",
                        Message =
                            $"{order.OfferedPrice:C} moved from mock escrow into your HoosHungry wallet.",
                        CreatedAtUtc = DateTime.UtcNow,
                    },
                    cancellationToken
                );
            }

            return await LoadDashboardStateAsync(client, settings, cancellationToken);
        });
    }

    private static Task<IResult> UpdateTrackingAsync(
        string orderId,
        TrackingUpdateRequest request,
        IHttpClientFactory httpClientFactory,
        SupabaseSettings settings,
        CancellationToken cancellationToken)
    {
        return ExecuteAsync(async () =>
        {
            var client = httpClientFactory.CreateClient();
            var state = await LoadDashboardStateAsync(client, settings, cancellationToken);
            var order =
                state.Orders.SingleOrDefault(item => item.Id == orderId)
                ?? throw new InvalidOperationException("Order not found.");

            order.Status = request.Status;
            order.EstimatedReadyAtUtc = request.EstimatedReadyAtUtc;
            await PatchOrderAsync(client, settings, order, cancellationToken);

            await InsertTrackingEventAsync(
                client,
                settings,
                order.Id,
                new TrackingEvent
                {
                    Id = NewId("track"),
                    Status = request.Status,
                    Label = BuildTrackingLabel(request.Status),
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

            await InsertNotificationAsync(
                client,
                settings,
                new NotificationItem
                {
                    Id = NewId("note"),
                    UserId = order.BuyerId,
                    Title = "Meal tracking update",
                    Message = buyerMessage,
                    CreatedAtUtc = DateTime.UtcNow,
                },
                cancellationToken
            );
            await InsertNotificationAsync(
                client,
                settings,
                new NotificationItem
                {
                    Id = NewId("note"),
                    UserId = order.SellerId,
                    Title = "Tracking update sent",
                    Message = $"Buyer was notified: {buyerMessage}",
                    CreatedAtUtc = DateTime.UtcNow,
                },
                cancellationToken
            );

            return await LoadDashboardStateAsync(client, settings, cancellationToken);
        });
    }

    private static Task<IResult> WithdrawFundsAsync(
        string sellerId,
        WithdrawFundsRequest request,
        IHttpClientFactory httpClientFactory,
        SupabaseSettings settings,
        CancellationToken cancellationToken)
    {
        return ExecuteAsync(async () =>
        {
            if (request.Amount <= 0)
            {
                throw new InvalidOperationException("Withdrawal amount must be positive.");
            }

            var client = httpClientFactory.CreateClient();
            var state = await LoadDashboardStateAsync(client, settings, cancellationToken);
            var seller =
                state.Sellers.SingleOrDefault(user => user.Id == sellerId)
                ?? throw new InvalidOperationException("Seller not found.");

            if (seller.WalletBalance < request.Amount)
            {
                throw new InvalidOperationException(
                    "Seller wallet balance is too low for that withdrawal."
                );
            }

            seller.WalletBalance -= request.Amount;
            await PatchUserAsync(client, settings, seller, cancellationToken);
            await InsertWithdrawalAsync(
                client,
                settings,
                new WithdrawalRecord
                {
                    Id = NewId("withdraw"),
                    SellerId = seller.Id,
                    SellerName = seller.Name,
                    Amount = request.Amount,
                    CreatedAtUtc = DateTime.UtcNow,
                },
                cancellationToken
            );
            await InsertNotificationAsync(
                client,
                settings,
                new NotificationItem
                {
                    Id = NewId("note"),
                    UserId = seller.Id,
                    Title = "Withdrawal queued",
                    Message =
                        $"{request.Amount:C} will be moved from your HoosHungry wallet to your mocked bank balance.",
                    CreatedAtUtc = DateTime.UtcNow,
                },
                cancellationToken
            );

            return await LoadDashboardStateAsync(client, settings, cancellationToken);
        });
    }

    private static async Task<IResult> ExecuteAsync(Func<Task<object>> action)
    {
        try
        {
            return Results.Ok(await action());
        }
        catch (InvalidOperationException exception)
        {
            return Results.BadRequest(new { error = exception.Message });
        }
    }

    private static async Task<MarketplaceDashboardState> LoadDashboardStateAsync(
        HttpClient client,
        SupabaseSettings settings,
        CancellationToken cancellationToken)
    {
        EnsureSupabaseConfigured(settings);

        var usersTask = GetRowsAsync<SupabaseUserRow>(
            client,
            settings,
            "marketplace_users",
            new Dictionary<string, string> { ["select"] = "*", ["order"] = "name.asc" },
            cancellationToken
        );
        var offersTask = GetRowsAsync<SupabaseOfferRow>(
            client,
            settings,
            "offers",
            new Dictionary<string, string> { ["select"] = "*", ["order"] = "created_at.desc" },
            cancellationToken
        );
        var ordersTask = GetRowsAsync<SupabaseOrderRow>(
            client,
            settings,
            "orders",
            new Dictionary<string, string> { ["select"] = "*", ["order"] = "created_at.desc" },
            cancellationToken
        );
        var trackingTask = GetRowsAsync<SupabaseTrackingEventRow>(
            client,
            settings,
            "tracking_events",
            new Dictionary<string, string> { ["select"] = "*", ["order"] = "created_at.asc" },
            cancellationToken
        );
        var notificationsTask = GetRowsAsync<SupabaseNotificationRow>(
            client,
            settings,
            "notifications",
            new Dictionary<string, string>
            {
                ["select"] = "*",
                ["order"] = "created_at.desc",
                ["limit"] = "18",
            },
            cancellationToken
        );
        var withdrawalsTask = GetRowsAsync<SupabaseWithdrawalRow>(
            client,
            settings,
            "withdrawals",
            new Dictionary<string, string> { ["select"] = "*", ["order"] = "created_at.desc" },
            cancellationToken
        );

        await Task.WhenAll(
            usersTask,
            offersTask,
            ordersTask,
            trackingTask,
            notificationsTask,
            withdrawalsTask
        );

        var users = usersTask.Result.Select(ToUser).ToList();
        var userLookup = users.ToDictionary(user => user.Id, StringComparer.OrdinalIgnoreCase);
        var trackingByOrderId = trackingTask
            .Result.Select(ToTrackingPair)
            .GroupBy(item => item.OrderId, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                group => group.Key,
                group => group.Select(item => item.Event).ToList(),
                StringComparer.OrdinalIgnoreCase
            );

        var sellers = users.Where(user => user.Role == UserRole.Seller).ToList();
        var buyers = users.Where(user => user.Role == UserRole.Buyer).ToList();
        var offers = offersTask.Result.Select(row => ToOffer(row, userLookup)).ToList();
        var orders = ordersTask
            .Result.Select(row => ToOrder(row, userLookup, trackingByOrderId))
            .ToList();
        var notifications = notificationsTask.Result.Select(ToNotification).ToList();
        var withdrawals = withdrawalsTask
            .Result.Select(row => ToWithdrawal(row, userLookup))
            .ToList();

        return new MarketplaceDashboardState
        {
            Sellers = sellers,
            Buyers = buyers,
            Offers = offers,
            Orders = orders,
            Notifications = notifications,
            Withdrawals = withdrawals,
            Metrics = new DemoMetrics
            {
                AvailableSellerCount = sellers.Count(seller => seller.MealExchangeAvailable),
                PendingOfferCount = offers.Count(offer => offer.Status == OfferStatus.Pending),
                ActiveOrderCount = orders.Count(order =>
                    order.Status is not OrderStatus.Completed and not OrderStatus.Declined
                ),
                SellerWalletTotal = sellers.Sum(seller => seller.WalletBalance),
                PlatformEscrowTotal = orders
                    .Where(order => !order.FundsReleasedToSeller && order.Status != OrderStatus.Declined)
                    .Sum(order => order.OfferedPrice),
            },
        };
    }

    private static Task PatchUserAsync(
        HttpClient client,
        SupabaseSettings settings,
        UserAccount seller,
        CancellationToken cancellationToken)
    {
        return PatchRowsAsync<SupabaseUserRow>(
            client,
            settings,
            "marketplace_users",
            new Dictionary<string, string> { ["id"] = $"eq.{seller.Id}" },
            new
            {
                meal_exchange_available = seller.MealExchangeAvailable,
                wallet_balance = seller.WalletBalance,
                headline = seller.Headline,
            },
            cancellationToken
        );
    }

    private static Task InsertOffersAsync(
        HttpClient client,
        SupabaseSettings settings,
        IReadOnlyCollection<OfferRecord> offers,
        CancellationToken cancellationToken)
    {
        return InsertRowsAsync<SupabaseOfferRow>(
            client,
            settings,
            "offers",
            offers.Select(offer => new
            {
                id = offer.Id,
                request_group_id = offer.RequestGroupId,
                buyer_id = offer.BuyerId,
                seller_id = offer.SellerId,
                price = offer.Price,
                status = offer.Status.ToString(),
                created_at = offer.CreatedAtUtc,
            }),
            cancellationToken
        );
    }

    private static Task PatchOfferStatusAsync(
        HttpClient client,
        SupabaseSettings settings,
        OfferRecord offer,
        CancellationToken cancellationToken)
    {
        return PatchRowsAsync<SupabaseOfferRow>(
            client,
            settings,
            "offers",
            new Dictionary<string, string> { ["id"] = $"eq.{offer.Id}" },
            new { status = offer.Status.ToString() },
            cancellationToken
        );
    }

    private static Task InsertOrderAsync(
        HttpClient client,
        SupabaseSettings settings,
        OrderRecord order,
        CancellationToken cancellationToken)
    {
        return InsertRowsAsync<SupabaseOrderRow>(
            client,
            settings,
            "orders",
            new[]
            {
                new
                {
                    id = order.Id,
                    offer_id = order.OfferId,
                    request_group_id = order.RequestGroupId,
                    invoice_id = order.InvoiceId,
                    buyer_id = order.BuyerId,
                    seller_id = order.SellerId,
                    offered_price = order.OfferedPrice,
                    grubhub_confirmed = order.GrubhubConfirmed,
                    funds_released_to_seller = order.FundsReleasedToSeller,
                    status = order.Status.ToString(),
                    created_at = order.CreatedAtUtc,
                    estimated_ready_at_utc = order.EstimatedReadyAtUtc,
                },
            },
            cancellationToken
        );
    }

    private static Task PatchOrderAsync(
        HttpClient client,
        SupabaseSettings settings,
        OrderRecord order,
        CancellationToken cancellationToken)
    {
        return PatchRowsAsync<SupabaseOrderRow>(
            client,
            settings,
            "orders",
            new Dictionary<string, string> { ["id"] = $"eq.{order.Id}" },
            new
            {
                grubhub_confirmed = order.GrubhubConfirmed,
                funds_released_to_seller = order.FundsReleasedToSeller,
                status = order.Status.ToString(),
                estimated_ready_at_utc = order.EstimatedReadyAtUtc,
            },
            cancellationToken
        );
    }

    private static Task InsertTrackingEventAsync(
        HttpClient client,
        SupabaseSettings settings,
        string orderId,
        TrackingEvent trackingEvent,
        CancellationToken cancellationToken)
    {
        return InsertRowsAsync<SupabaseTrackingEventRow>(
            client,
            settings,
            "tracking_events",
            new[]
            {
                new
                {
                    id = trackingEvent.Id,
                    order_id = orderId,
                    status = trackingEvent.Status.ToString(),
                    label = trackingEvent.Label,
                    detail = trackingEvent.Detail,
                    created_at = trackingEvent.CreatedAtUtc,
                    estimated_ready_at_utc = trackingEvent.EstimatedReadyAtUtc,
                },
            },
            cancellationToken
        );
    }

    private static Task InsertNotificationAsync(
        HttpClient client,
        SupabaseSettings settings,
        NotificationItem notification,
        CancellationToken cancellationToken)
    {
        return InsertRowsAsync<SupabaseNotificationRow>(
            client,
            settings,
            "notifications",
            new[]
            {
                new
                {
                    id = notification.Id,
                    user_id = notification.UserId,
                    title = notification.Title,
                    message = notification.Message,
                    created_at = notification.CreatedAtUtc,
                },
            },
            cancellationToken
        );
    }

    private static Task InsertWithdrawalAsync(
        HttpClient client,
        SupabaseSettings settings,
        WithdrawalRecord withdrawal,
        CancellationToken cancellationToken)
    {
        return InsertRowsAsync<SupabaseWithdrawalRow>(
            client,
            settings,
            "withdrawals",
            new[]
            {
                new
                {
                    id = withdrawal.Id,
                    seller_id = withdrawal.SellerId,
                    amount = withdrawal.Amount,
                    created_at = withdrawal.CreatedAtUtc,
                },
            },
            cancellationToken
        );
    }

    private static async Task<List<T>> GetRowsAsync<T>(
        HttpClient client,
        SupabaseSettings settings,
        string table,
        IReadOnlyDictionary<string, string> query,
        CancellationToken cancellationToken)
    {
        using var request = CreateRequest(settings, HttpMethod.Get, table, query);
        using var response = await client.SendAsync(request, cancellationToken);
        return await ReadRowsAsync<T>(response, cancellationToken);
    }

    private static async Task<List<T>> InsertRowsAsync<T>(
        HttpClient client,
        SupabaseSettings settings,
        string table,
        object payload,
        CancellationToken cancellationToken)
    {
        using var request = CreateRequest(settings, HttpMethod.Post, table, null, payload);
        request.Headers.TryAddWithoutValidation("Prefer", "return=representation");
        using var response = await client.SendAsync(request, cancellationToken);
        return await ReadRowsAsync<T>(response, cancellationToken);
    }

    private static async Task<List<T>> PatchRowsAsync<T>(
        HttpClient client,
        SupabaseSettings settings,
        string table,
        IReadOnlyDictionary<string, string> query,
        object payload,
        CancellationToken cancellationToken)
    {
        using var request = CreateRequest(settings, HttpMethod.Patch, table, query, payload);
        request.Headers.TryAddWithoutValidation("Prefer", "return=representation");
        using var response = await client.SendAsync(request, cancellationToken);
        return await ReadRowsAsync<T>(response, cancellationToken);
    }

    private static HttpRequestMessage CreateRequest(
        SupabaseSettings settings,
        HttpMethod method,
        string table,
        IReadOnlyDictionary<string, string>? query,
        object? payload = null)
    {
        EnsureSupabaseConfigured(settings);

        var request = new HttpRequestMessage(method, BuildRequestUri(settings, table, query));
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", settings.ServiceRoleKey);
        request.Headers.TryAddWithoutValidation("apikey", settings.ServiceRoleKey);
        request.Headers.TryAddWithoutValidation("Accept-Profile", settings.Schema);
        request.Headers.TryAddWithoutValidation("Content-Profile", settings.Schema);

        if (payload is not null)
        {
            request.Content = new StringContent(
                JsonSerializer.Serialize(payload, CreateJsonOptions()),
                Encoding.UTF8,
                "application/json"
            );
        }

        return request;
    }

    private static Uri BuildRequestUri(
        SupabaseSettings settings,
        string table,
        IReadOnlyDictionary<string, string>? query)
    {
        var baseUrl = settings.Url.EndsWith('/') ? settings.Url : $"{settings.Url}/";
        var builder = new StringBuilder($"rest/v1/{table}");

        if (query is not null && query.Count > 0)
        {
            builder.Append('?');
            var first = true;
            foreach (var pair in query)
            {
                if (!first)
                {
                    builder.Append('&');
                }

                first = false;
                builder.Append(Uri.EscapeDataString(pair.Key));
                builder.Append('=');
                builder.Append(Uri.EscapeDataString(pair.Value));
            }
        }

        return new Uri(new Uri(baseUrl), builder.ToString());
    }

    private static async Task<List<T>> ReadRowsAsync<T>(
        HttpResponseMessage response,
        CancellationToken cancellationToken)
    {
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(
                $"Supabase request failed with {(int)response.StatusCode}: {body}"
            );
        }

        return JsonSerializer.Deserialize<List<T>>(body, CreateJsonOptions()) ?? [];
    }

    private static void EnsureSupabaseConfigured(SupabaseSettings settings)
    {
        if (!Uri.TryCreate(settings.Url, UriKind.Absolute, out _))
        {
            throw new InvalidOperationException("Supabase URL is missing or invalid. Set Supabase:Url.");
        }

        if (string.IsNullOrWhiteSpace(settings.ServiceRoleKey))
        {
            throw new InvalidOperationException(
                "Supabase service role key is missing. Set Supabase:ServiceRoleKey."
            );
        }
    }

    private static UserAccount ToUser(SupabaseUserRow row)
    {
        return new UserAccount
        {
            Id = row.Id,
            Name = row.Name,
            Role = ParseEnum<UserRole>(row.Role),
            MealExchangeAvailable = row.MealExchangeAvailable,
            WalletBalance = row.WalletBalance,
            Headline = row.Headline,
        };
    }

    private static OfferRecord ToOffer(
        SupabaseOfferRow row,
        IReadOnlyDictionary<string, UserAccount> users)
    {
        users.TryGetValue(row.BuyerId, out var buyer);
        users.TryGetValue(row.SellerId, out var seller);

        return new OfferRecord
        {
            Id = row.Id,
            RequestGroupId = row.RequestGroupId,
            BuyerId = row.BuyerId,
            BuyerName = buyer?.Name ?? row.BuyerId,
            SellerId = row.SellerId,
            SellerName = seller?.Name ?? row.SellerId,
            Price = row.Price,
            Status = ParseEnum<OfferStatus>(row.Status),
            CreatedAtUtc = row.CreatedAtUtc,
        };
    }

    private static OrderRecord ToOrder(
        SupabaseOrderRow row,
        IReadOnlyDictionary<string, UserAccount> users,
        IReadOnlyDictionary<string, List<TrackingEvent>> trackingByOrderId)
    {
        users.TryGetValue(row.BuyerId, out var buyer);
        users.TryGetValue(row.SellerId, out var seller);
        trackingByOrderId.TryGetValue(row.Id, out var trackingEvents);

        return new OrderRecord
        {
            Id = row.Id,
            OfferId = row.OfferId,
            RequestGroupId = row.RequestGroupId,
            InvoiceId = row.InvoiceId,
            BuyerId = row.BuyerId,
            BuyerName = buyer?.Name ?? row.BuyerId,
            SellerId = row.SellerId,
            SellerName = seller?.Name ?? row.SellerId,
            OfferedPrice = row.OfferedPrice,
            GrubhubConfirmed = row.GrubhubConfirmed,
            FundsReleasedToSeller = row.FundsReleasedToSeller,
            Status = ParseEnum<OrderStatus>(row.Status),
            CreatedAtUtc = row.CreatedAtUtc,
            EstimatedReadyAtUtc = row.EstimatedReadyAtUtc,
            TrackingEvents = trackingEvents ?? [],
        };
    }

    private static (string OrderId, TrackingEvent Event) ToTrackingPair(SupabaseTrackingEventRow row)
    {
        return (
            row.OrderId,
            new TrackingEvent
            {
                Id = row.Id,
                Status = ParseEnum<OrderStatus>(row.Status),
                Label = row.Label,
                Detail = row.Detail,
                CreatedAtUtc = row.CreatedAtUtc,
                EstimatedReadyAtUtc = row.EstimatedReadyAtUtc,
            }
        );
    }

    private static NotificationItem ToNotification(SupabaseNotificationRow row)
    {
        return new NotificationItem
        {
            Id = row.Id,
            UserId = row.UserId,
            Title = row.Title,
            Message = row.Message,
            CreatedAtUtc = row.CreatedAtUtc,
        };
    }

    private static WithdrawalRecord ToWithdrawal(
        SupabaseWithdrawalRow row,
        IReadOnlyDictionary<string, UserAccount> users)
    {
        users.TryGetValue(row.SellerId, out var seller);

        return new WithdrawalRecord
        {
            Id = row.Id,
            SellerId = row.SellerId,
            SellerName = seller?.Name ?? row.SellerId,
            Amount = row.Amount,
            CreatedAtUtc = row.CreatedAtUtc,
        };
    }

    private static TEnum ParseEnum<TEnum>(string value)
        where TEnum : struct
    {
        return Enum.TryParse<TEnum>(value, ignoreCase: true, out var parsed)
            ? parsed
            : throw new InvalidOperationException(
                $"Unsupported enum value '{value}' for {typeof(TEnum).Name}."
            );
    }

    private static string BuildTrackingLabel(OrderStatus status)
    {
        return status switch
        {
            OrderStatus.Preparing => "Kitchen preparing order",
            OrderStatus.ReadySoon => "Order nearing completion",
            OrderStatus.ReadyForPickup => "Ready for pickup",
            OrderStatus.Completed => "Exchange completed",
            OrderStatus.Declined => "Exchange cancelled",
            _ => "Order status updated",
        };
    }

    private static string NewId(string prefix) => $"{prefix}-{Guid.NewGuid():N}";

    private static JsonSerializerOptions CreateJsonOptions()
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        options.Converters.Add(new JsonStringEnumConverter());
        return options;
    }
}
