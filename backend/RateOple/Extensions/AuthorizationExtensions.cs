using RateOple.Constants.Constants;

namespace RateOple.Extensions;

public static class AuthorizationExtensions
{
    public static IServiceCollection AddAuthorizationPolicies(this IServiceCollection services)
    {
        services.AddAuthorization(options =>
        {
            options.AddPolicy(PolicyConstants.RequireAdmin, policy =>
                policy.RequireRole(RoleConstants.Admin, RoleConstants.SuperAdmin));

            options.AddPolicy(PolicyConstants.RequireModerator, policy =>
                policy.RequireRole(RoleConstants.Moderator, RoleConstants.Admin, RoleConstants.SuperAdmin));

            options.AddPolicy(PolicyConstants.CanModerateContent, policy =>
                policy.RequireRole(RoleConstants.Moderator, RoleConstants.Admin, RoleConstants.SuperAdmin));

            options.AddPolicy(PolicyConstants.CanManageGroups, policy =>
                policy.RequireRole(RoleConstants.Admin, RoleConstants.SuperAdmin));
        });

        return services;
    }
}