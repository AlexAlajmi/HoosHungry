namespace backend;

public static class StateEndpoints
{
    public static RouteGroupBuilder MapStateEndpoints(this RouteGroupBuilder api)
    {
        api.MapGet("/demo/state", GetDashboardStateAsync);
        return api;
    }

    private static Task<IResult> GetDashboardStateAsync(
        IHttpClientFactory httpClientFactory,
        SupabaseSettings settings,
        CancellationToken cancellationToken)
    {
        return MarketplaceData.ExecuteAsync(async () =>
        {
            var client = httpClientFactory.CreateClient();
            return await MarketplaceData.LoadDashboardStateAsync(client, settings, cancellationToken);
        });
    }
}
