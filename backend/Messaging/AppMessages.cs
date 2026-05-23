namespace backend.Messaging;

/// <summary>
/// API error payloads, exception messages, and Microsoft.Extensions.Logging message templates in one place.
/// </summary>
public static class AppMessages
{
    public static class Client
    {
        public const string AuthenticationRequired = "Authentication is required.";
        public const string AccessDenied = "You do not have access to this resource.";
        public const string AuthCookieMissingClaims = "Auth cookie is missing required user claims.";
        public const string UserMissingOrInactive = "User no longer exists or is inactive.";
        public const string LogoutRequiresApiClientHeader =
            "Logout must be initiated from the application.";
        public const string NoActiveOrFinishedGame = "No active or finished game was found.";
        public const string UnableToLoadCurrentGame = "Unable to load the current game.";
        public const string GameCellNotFound = "Requested game cell was not found.";
        public const string UnableToOpenGameCell = "Unable to open the requested game cell.";
        public const string NoDraftGameForSetup = "No draft game is available for setup.";
        public const string DraftGameAlreadyExists = "A draft game is already being configured.";
        public const string InvalidGameSetupTitle = "Game title must be between 1 and 200 characters.";
        public const string UnableToLoadGameSetup = "Unable to load the game setup.";
        public const string UnableToCreateGameSetup = "Unable to create the game setup.";
        public const string UnableToSaveGameSetup = "Unable to save the game setup.";
        public const string UnableToDeleteGameSetup = "Unable to delete the game setup.";
        public const string InvalidGameSetupSaveRequest =
            "Game setup could not be saved. Check the title, rows, columns, and card fields.";
        public const string GameSetupCellNotFound = "Requested game setup cell was not found.";
        public const string GameSetupCellMediaNotFound = "Requested game setup cell media was not found.";
        public const string InvalidGameSetupCellMediaUpload =
            "Cell image must be a supported image file up to 5 MB.";
        public const string UnableToUploadGameSetupCellMedia = "Unable to upload the game setup cell image.";
        public const string UnableToDeleteGameSetupCellMedia = "Unable to delete the game setup cell image.";
        public const string GameSetupDraftVersionConflict =
            "The draft was changed by another session. Reload the latest setup and try again.";
    }

    public static class ErrorCodes
    {
        public const string InvalidGameSetupTitle = "game_setup.invalid_title";
        public const string GameSetupDraftVersionConflict = "game_setup.stale_version";
    }

    public static class Exceptions
    {
        public const string AuthRequiresApplicationDbContext =
            "Authentication requires a configured ApplicationDbContext. Set ConnectionStrings:DefaultConnection for the backend or override ApplicationDbContext explicitly for tests.";

        public const string AuthRequiresEfProvider =
            "Authentication requires a configured EF Core provider. Set ConnectionStrings:DefaultConnection for the backend or override ApplicationDbContext explicitly for tests.";

        public const string ViewerRoleMissing = "Viewer role was not found in roles table.";

        public static string TwitchTokenExchangeFailed(int statusCode, string error) =>
            $"Twitch token exchange failed with status {statusCode}: {error}";

        public const string TwitchTokenResponseEmpty = "Twitch token response is empty.";

        public static string TwitchUserRequestFailed(int statusCode, string error) =>
            $"Twitch user request failed with status {statusCode}: {error}";

        public const string TwitchUsersResponseEmpty = "Twitch users response is empty.";

        public const string TwitchUsersResponseNoUser = "Twitch users response contains no user.";
    }

    public static class Logs
    {
        public const string ApplicationTerminatedUnexpectedly = "Application terminated unexpectedly.";

        public const string ApplicationDbContextNotRegistered =
            "ApplicationDbContext is not registered. Auth requires a configured database.";

        public const string EfProviderNameEmpty = "EF Core provider name is empty; database is not configured.";

        public const string FailedToOpenDatabaseOnStartup =
            "Failed to open database connection during startup validation.";

        public const string AuthPersistenceValidated =
            "Auth persistence validated: database provider is {ProviderName}.";

        public const string TwitchOAuthErrorQuery =
            "Twitch OAuth returned error query parameter: {OAuthError}.";

        public const string TwitchOAuthMissingCode = "Twitch OAuth callback missing authorization code.";
        public const string TwitchOAuthMissingState = "Twitch OAuth callback missing state parameter.";
        public const string TwitchOAuthStateCookieMissing = "Twitch OAuth state cookie is missing.";
        public const string TwitchOAuthStateMismatch = "Twitch OAuth state did not match state cookie.";

        public const string TwitchUserSignedIn =
            "User signed in via Twitch. UserId: {UserId}, IsNewUser: {IsNewUser}.";

        public const string TwitchInactiveUserSignIn =
            "Inactive user attempted Twitch sign-in. UserId: {UserId}.";

        public const string TwitchAuthCallbackFailed =
            "Twitch authentication callback failed before redirect.";

        public const string TwitchAuthTokenExchangeFailed =
            "Twitch authentication failed during token exchange or persistence.";

        public const string TwitchTokenExchangeHttpFailed =
            "Twitch token exchange failed with status {StatusCode}.";

        public const string TwitchHelixUsersRequestFailed =
            "Twitch Helix users request failed with status {StatusCode}.";

        public const string TwitchHelixNoUserEntries =
            "Twitch Helix users response contained no user entries.";

        public const string DbGameBoardLoadError = "Database error while loading current game board.";

        public const string GameHasNoBoardRow = "Game {GameId} has no board row; cannot build snapshot.";

        public const string NoActiveOrFinishedGameRow = "No active or finished game row found.";

        public const string GameBoardSnapshotResolved =
            "Resolved game board snapshot. GameId: {GameId}, Status: {Status}, CellCount: {CellCount}.";

        public const string DbAuthUserResolveError = "Database error while resolving auth user {UserId}.";

        public const string ViewerRoleMissingFromTable =
            "Viewer role '{ViewerRoleCode}' is missing from the roles table.";

        public const string RoleClaimsSkipHydrationMissingGuid =
            "Role claims: skip hydration, NameIdentifier missing or not a GUID.";

        public const string RoleClaimsSkipHydrationInactiveUser =
            "Role claims: skip hydration for user {UserId} (missing or inactive).";

        public const string GameNoBoardForGet = "No active or finished game with a board was found.";
        public const string GameBoardLoadFailed = "Failed to load current game board.";
        public const string GameCellNotFoundForOpen = "Cannot open game cell because it was not found. CellId: {CellId}.";
        public const string GameCellAlreadyOpen = "Game cell is already open. CellId: {CellId}.";
        public const string GameCellOpened = "Game cell opened. CellId: {CellId}.";
        public const string GameCellOpenFailed = "Failed to open game cell. CellId: {CellId}.";
        public const string RealtimeGameCellOpenedPublishFailed =
            "Failed to publish game cell opened realtime event. CellId: {CellId}.";
        public const string RealtimeGameSetupDraftChangedPublishFailed =
            "Failed to publish game setup draft changed realtime event.";

        public const string AuthSessionMissingClaim =
            "Auth session request missing or invalid NameIdentifier claim.";

        public const string AuthSessionUserGone =
            "Auth session not found or user inactive; signing out. UserId: {UserId}.";

        public const string UserSignedOut = "User signed out.";

        public const string GameSetupDraftNotFound = "No draft game with a board was found for setup.";
        public const string GameSetupDraftLoadFailed = "Failed to load draft game setup.";
        public const string GameSetupDraftCreateFailed = "Failed to create draft game setup.";
        public const string GameSetupDraftAlreadyExists = "Draft game setup already exists.";
        public const string GameSetupDraftCreated =
            "Draft game setup created. GameId: {GameId}, CellCount: {CellCount}.";
        public const string GameSetupDraftSaved =
            "Draft game setup saved. GameId: {GameId}, BoardVersion: {BoardVersion}.";
        public const string GameSetupDraftVersionConflict =
            "Draft game setup save rejected due to version conflict. GameId: {GameId}, ExpectedVersion: {ExpectedVersion}, CurrentVersion: {CurrentVersion}.";
        public const string GameSetupDraftSaveFailed = "Failed to save draft game setup.";
        public const string GameSetupDraftDeleted = "Draft game setup deleted. GameId: {GameId}.";
        public const string GameSetupDraftDeleteFailed = "Failed to delete draft game setup.";
        public const string GameSetupDraftMediaStorageCleanupFailed =
            "Failed to clean up draft game setup media in object storage. GameId: {GameId}, Prefix: {Prefix}.";
        public const string GameSetupCellMediaUploadFailed =
            "Failed to upload draft game setup cell media. CellId: {CellId}.";
        public const string GameSetupCellMediaStorageUploadFailed =
            "Failed to upload draft game setup cell media to storage. CellId: {CellId}, GameId: {GameId}.";
        public const string GameSetupCellMediaDeleteFailed =
            "Failed to delete draft game setup cell media. CellId: {CellId}.";
        public const string GameSetupCellMediaObjectCleanupFailed =
            "Failed to clean up draft game setup cell media object. CellId: {CellId}, Bucket: {Bucket}, ObjectKey: {ObjectKey}.";
    }
}
