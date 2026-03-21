namespace backend;

public static class MarketplaceApi
{
    public static IEndpointRouteBuilder MapMarketplaceApi(this IEndpointRouteBuilder app)
    {
        var api = app.MapGroup("/api");

        api.MapStateEndpoints();
        api.MapSellerEndpoints();
        api.MapOfferEndpoints();
        api.MapOrderEndpoints();
        api.MapWalletEndpoints();

        return app;
    }
}
