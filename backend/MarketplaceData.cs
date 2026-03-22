using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace backend;

public static class MarketplaceData
{
    public static async Task<IResult> ExecuteAsync(Func<Task<object>> action)
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

    public static async Task<MarketplaceDashboardState> LoadDashboardStateAsync(
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
                ["dismissed"] = "eq.false",
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
        var trackingByOrderId = trackingTask.Result
            .Select(ToTrackingPair)
            .GroupBy(item => item.OrderId, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                group => group.Key,
                group => group.Select(item => item.Event).ToList(),
                StringComparer.OrdinalIgnoreCase
            );

        // A single account can participate as either buyer or seller in the UI,
        // so expose every user in both lists and use availability to determine
        // who is currently open to receiving seller requests.
        var sellers = users.ToList();
        var buyers = users.ToList();
        var offers = offersTask.Result.Select(row => ToOffer(row, userLookup)).ToList();
        var orders = ordersTask.Result.Select(row => ToOrder(row, userLookup, trackingByOrderId)).ToList();
        var notifications = notificationsTask.Result.Select(ToNotification).ToList();
        var withdrawals = withdrawalsTask.Result.Select(row => ToWithdrawal(row, userLookup)).ToList();

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
                    order.Status is not OrderStatus.Completed and not OrderStatus.Declined),
                SellerWalletTotal = sellers.Sum(seller => seller.WalletBalance),
                PlatformEscrowTotal = orders
                    .Where(order => !order.FundsReleasedToSeller && order.Status != OrderStatus.Declined)
                    .Sum(order => order.OfferedPrice),
            },
        };
    }

    public static Task PatchUserAsync(
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

    public static Task InsertOffersAsync(
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
                item = offer.Item,
                location = offer.Location,
                price = offer.Price,
                status = offer.Status.ToString(),
                created_at = offer.CreatedAtUtc,
            }),
            cancellationToken
        );
    }

    public static Task PatchOfferStatusAsync(
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

    public static Task InsertOrderAsync(
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
                    item = order.Item,
                    location = order.Location,
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

    public static Task PatchOrderAsync(
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

    public static Task InsertTrackingEventAsync(
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

    public static Task InsertNotificationAsync(
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
                    action_type = notification.ActionType,
                    action_target_id = notification.ActionTargetId,
                    dismissed = notification.Dismissed,
                    created_at = notification.CreatedAtUtc,
                },
            },
            cancellationToken
        );
    }

    public static Task PatchNotificationDismissedAsync(
        HttpClient client,
        SupabaseSettings settings,
        string notificationId,
        CancellationToken cancellationToken)
    {
        return PatchRowsAsync<SupabaseNotificationRow>(
            client,
            settings,
            "notifications",
            new Dictionary<string, string> { ["id"] = $"eq.{notificationId}" },
            new { dismissed = true },
            cancellationToken
        );
    }

    public static Task InsertWithdrawalAsync(
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

    public static async Task<SupabaseUserRow?> GetUserRowByEmailAsync(
        HttpClient client,
        SupabaseSettings settings,
        string email,
        CancellationToken cancellationToken)
    {
        var rows = await GetRowsAsync<SupabaseUserRow>(
            client,
            settings,
            "marketplace_users",
            new Dictionary<string, string> { ["email"] = $"eq.{email}", ["limit"] = "1" },
            cancellationToken
        );
        return rows.Count > 0 ? rows[0] : null;
    }

    public static async Task<UserAccount> InsertUserAsync(
        HttpClient client,
        SupabaseSettings settings,
        string email,
        string passwordHash,
        string name,
        UserRole role,
        string headline,
        CancellationToken cancellationToken)
    {
        var rows = await InsertRowsAsync<SupabaseUserRow>(
            client,
            settings,
            "marketplace_users",
            new[]
            {
                new
                {
                    id = NewId("user"),
                    email,
                    password_hash = passwordHash,
                    name,
                    role = role.ToString(),
                    meal_exchange_available = false,
                    wallet_balance = 0m,
                    headline,
                },
            },
            cancellationToken
        );
        return ToUser(rows[0]);
    }

    public static string BuildTrackingLabel(OrderStatus status)
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

    public static string NewId(string prefix) => $"{prefix}-{Guid.NewGuid():N}";

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

    public static UserAccount ToUser(SupabaseUserRow row)
    {
        return new UserAccount
        {
            Id = row.Id,
            Email = row.Email,
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
            Item = row.Item,
            Location = row.Location,
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
            Item = row.Item,
            Location = row.Location,
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
            ActionType = row.ActionType,
            ActionTargetId = row.ActionTargetId,
            Dismissed = row.Dismissed,
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

    private static JsonSerializerOptions CreateJsonOptions()
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        options.Converters.Add(new JsonStringEnumConverter());
        return options;
    }
}
