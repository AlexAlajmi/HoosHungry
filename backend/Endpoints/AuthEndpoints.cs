using System.Security.Cryptography;
using System.Text;

namespace backend;

public static class AuthEndpoints
{
    public static RouteGroupBuilder MapAuthEndpoints(this RouteGroupBuilder api)
    {
        api.MapPost("/auth/signup", SignupAsync);
        api.MapPost("/auth/login", LoginAsync);
        return api;
    }

    private static Task<IResult> SignupAsync(
        SignupRequest request,
        IHttpClientFactory httpClientFactory,
        SupabaseSettings settings,
        CancellationToken cancellationToken)
    {
        return MarketplaceData.ExecuteAsync(async () =>
        {
            if (string.IsNullOrWhiteSpace(request.Email))
                throw new InvalidOperationException("Email is required.");
            if (string.IsNullOrWhiteSpace(request.Name))
                throw new InvalidOperationException("Name is required.");
            if (string.IsNullOrWhiteSpace(request.Password))
                throw new InvalidOperationException("Password is required.");

            var client = httpClientFactory.CreateClient();

            var existing = await MarketplaceData.GetUserRowByEmailAsync(
                client, settings, request.Email, cancellationToken);
            if (existing is not null)
                throw new InvalidOperationException("An account with that email already exists.");

            var hash = HashPassword(request.Password);

            return await MarketplaceData.InsertUserAsync(
                client,
                settings,
                request.Email,
                hash,
                request.Name,
                request.Role,
                request.Headline,
                cancellationToken);
        });
    }

    private static Task<IResult> LoginAsync(
        LoginRequest request,
        IHttpClientFactory httpClientFactory,
        SupabaseSettings settings,
        CancellationToken cancellationToken)
    {
        return MarketplaceData.ExecuteAsync(async () =>
        {
            if (string.IsNullOrWhiteSpace(request.Email))
                throw new InvalidOperationException("Email is required.");
            if (string.IsNullOrWhiteSpace(request.Password))
                throw new InvalidOperationException("Password is required.");

            var client = httpClientFactory.CreateClient();

            var row = await MarketplaceData.GetUserRowByEmailAsync(
                client, settings, request.Email, cancellationToken);

            if (row is null)
                throw new InvalidOperationException("No account found with that email.");

            if (!VerifyPassword(request.Password, row.PasswordHash))
                throw new InvalidOperationException("Incorrect password.");

            return (object)MarketplaceData.ToUser(row);
        });
    }

    private static string HashPassword(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = Rfc2898DeriveBytes.Pbkdf2(
            Encoding.UTF8.GetBytes(password), salt, 100_000, HashAlgorithmName.SHA256, 32);
        return Convert.ToBase64String(salt) + "." + Convert.ToBase64String(hash);
    }

    private static bool VerifyPassword(string password, string stored)
    {
        var parts = stored.Split('.');
        if (parts.Length != 2) return false;

        var salt = Convert.FromBase64String(parts[0]);
        var expected = Convert.FromBase64String(parts[1]);
        var actual = Rfc2898DeriveBytes.Pbkdf2(
            Encoding.UTF8.GetBytes(password), salt, 100_000, HashAlgorithmName.SHA256, 32);

        return CryptographicOperations.FixedTimeEquals(expected, actual);
    }
}
