using System.Text.Json.Serialization;

namespace backend;

public sealed class SupabaseSettings
{
    public string Url { get; set; } = string.Empty;
    public string ServiceRoleKey { get; set; } = string.Empty;
    public string Schema { get; set; } = "public";
}

public enum UserRole
{
    Seller,
    Buyer,
}

public enum OfferStatus
{
    Pending,
    Accepted,
    Declined,
}

public enum OrderStatus
{
    AwaitingConfirmation,
    Preparing,
    ReadySoon,
    ReadyForPickup,
    Completed,
    Declined,
}

public sealed class UserAccount
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public bool MealExchangeAvailable { get; set; }
    public decimal WalletBalance { get; set; }
    public string Headline { get; set; } = string.Empty;
}

public sealed class OfferRecord
{
    public string Id { get; set; } = string.Empty;
    public string RequestGroupId { get; set; } = string.Empty;
    public string BuyerId { get; set; } = string.Empty;
    public string BuyerName { get; set; } = string.Empty;
    public string SellerId { get; set; } = string.Empty;
    public string SellerName { get; set; } = string.Empty;
    public string Item { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public OfferStatus Status { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

public sealed class TrackingEvent
{
    public string Id { get; set; } = string.Empty;
    public OrderStatus Status { get; set; }
    public string Label { get; set; } = string.Empty;
    public string Detail { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? EstimatedReadyAtUtc { get; set; }
}

public sealed class OrderRecord
{
    public string Id { get; set; } = string.Empty;
    public string OfferId { get; set; } = string.Empty;
    public string RequestGroupId { get; set; } = string.Empty;
    public string InvoiceId { get; set; } = string.Empty;
    public string BuyerId { get; set; } = string.Empty;
    public string BuyerName { get; set; } = string.Empty;
    public string SellerId { get; set; } = string.Empty;
    public string SellerName { get; set; } = string.Empty;
    public string Item { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public decimal OfferedPrice { get; set; }
    public bool GrubhubConfirmed { get; set; }
    public bool FundsReleasedToSeller { get; set; }
    public OrderStatus Status { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? EstimatedReadyAtUtc { get; set; }
    public List<TrackingEvent> TrackingEvents { get; set; } = [];
}

public sealed class NotificationItem
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
}

public sealed class WithdrawalRecord
{
    public string Id { get; set; } = string.Empty;
    public string SellerId { get; set; } = string.Empty;
    public string SellerName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

public sealed class DemoMetrics
{
    public int AvailableSellerCount { get; set; }
    public int PendingOfferCount { get; set; }
    public int ActiveOrderCount { get; set; }
    public decimal SellerWalletTotal { get; set; }
    public decimal PlatformEscrowTotal { get; set; }
}

public sealed class MarketplaceDashboardState
{
    public List<UserAccount> Sellers { get; set; } = [];
    public List<UserAccount> Buyers { get; set; } = [];
    public List<OfferRecord> Offers { get; set; } = [];
    public List<OrderRecord> Orders { get; set; } = [];
    public List<NotificationItem> Notifications { get; set; } = [];
    public List<WithdrawalRecord> Withdrawals { get; set; } = [];
    public DemoMetrics Metrics { get; set; } = new();
}

public sealed class SetAvailabilityRequest
{
    public bool IsAvailable { get; set; }
}

public sealed class CreateOfferRequest
{
    public string BuyerId { get; set; } = string.Empty;
    public string Item { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public decimal Price { get; set; }
}

public sealed class OfferDecisionRequest
{
    public bool Accept { get; set; }
}

public sealed class ConfirmOrderRequest
{
    public string ConfirmationNote { get; set; } = "Meal exchange submitted in Grubhub.";
}

public sealed class TrackingUpdateRequest
{
    public OrderStatus Status { get; set; }
    public string Detail { get; set; } = string.Empty;
    public DateTime? EstimatedReadyAtUtc { get; set; }
}

public sealed class WithdrawFundsRequest
{
    public decimal Amount { get; set; }
}

public sealed class SignupRequest
{
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public string Headline { get; set; } = string.Empty;
}

public sealed class LoginRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public sealed class SupabaseUserRow
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("password_hash")]
    public string PasswordHash { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("role")]
    public string Role { get; set; } = string.Empty;

    [JsonPropertyName("meal_exchange_available")]
    public bool MealExchangeAvailable { get; set; }

    [JsonPropertyName("wallet_balance")]
    public decimal WalletBalance { get; set; }

    [JsonPropertyName("headline")]
    public string Headline { get; set; } = string.Empty;
}

public sealed class SupabaseOfferRow
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("request_group_id")]
    public string RequestGroupId { get; set; } = string.Empty;

    [JsonPropertyName("buyer_id")]
    public string BuyerId { get; set; } = string.Empty;

    [JsonPropertyName("seller_id")]
    public string SellerId { get; set; } = string.Empty;

    [JsonPropertyName("price")]
    public decimal Price { get; set; }

    [JsonPropertyName("item")]
    public string Item { get; set; } = string.Empty;

    [JsonPropertyName("location")]
    public string Location { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("created_at")]
    public DateTime CreatedAtUtc { get; set; }
}

public sealed class SupabaseOrderRow
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("offer_id")]
    public string OfferId { get; set; } = string.Empty;

    [JsonPropertyName("request_group_id")]
    public string RequestGroupId { get; set; } = string.Empty;

    [JsonPropertyName("invoice_id")]
    public string InvoiceId { get; set; } = string.Empty;

    [JsonPropertyName("buyer_id")]
    public string BuyerId { get; set; } = string.Empty;

    [JsonPropertyName("seller_id")]
    public string SellerId { get; set; } = string.Empty;

    [JsonPropertyName("item")]
    public string Item { get; set; } = string.Empty;

    [JsonPropertyName("location")]
    public string Location { get; set; } = string.Empty;

    [JsonPropertyName("offered_price")]
    public decimal OfferedPrice { get; set; }

    [JsonPropertyName("grubhub_confirmed")]
    public bool GrubhubConfirmed { get; set; }

    [JsonPropertyName("funds_released_to_seller")]
    public bool FundsReleasedToSeller { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("created_at")]
    public DateTime CreatedAtUtc { get; set; }

    [JsonPropertyName("estimated_ready_at_utc")]
    public DateTime? EstimatedReadyAtUtc { get; set; }
}

public sealed class SupabaseTrackingEventRow
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("order_id")]
    public string OrderId { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("detail")]
    public string Detail { get; set; } = string.Empty;

    [JsonPropertyName("created_at")]
    public DateTime CreatedAtUtc { get; set; }

    [JsonPropertyName("estimated_ready_at_utc")]
    public DateTime? EstimatedReadyAtUtc { get; set; }
}

public sealed class SupabaseNotificationRow
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("user_id")]
    public string UserId { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("created_at")]
    public DateTime CreatedAtUtc { get; set; }
}

public sealed class SupabaseWithdrawalRow
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("seller_id")]
    public string SellerId { get; set; } = string.Empty;

    [JsonPropertyName("amount")]
    public decimal Amount { get; set; }

    [JsonPropertyName("created_at")]
    public DateTime CreatedAtUtc { get; set; }
}
