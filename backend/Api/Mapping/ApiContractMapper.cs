using backend.Api.Contracts;
using backend.Application.Abstractions.Auth;
using backend.Application.Contracts;

namespace backend.Api.Mapping;

public static class ApiContractMapper
{
    public static AuthSessionDto ToDto(this AuthSession session)
    {
        return new AuthSessionDto(
            session.UserId,
            session.DisplayName,
            session.Roles
                .Select(TryMapAuthRole)
                .Where(role => role.HasValue)
                .Select(role => role!.Value)
                .ToArray()
        );
    }

    public static GameSetupDraftUpdate ToUpdateModel(this UpdateGameSetupRequestDto request)
    {
        return new GameSetupDraftUpdate(
            request.ExpectedVersion,
            request.Title,
            request.RowLabels,
            request.ColLabels,
            request.Cells
                .Select(cell => new GameSetupCellUpdate(cell.Id, cell.Row, cell.Col, cell.Title, cell.Cost))
                .ToArray(),
            request.EnabledModifierCodes ?? Array.Empty<string>()
        );
    }

    public static GameSetupSnapshotDto ToSetupDto(this GameBoardSnapshot snapshot)
    {
        return new GameSetupSnapshotDto(
            snapshot.GameId,
            snapshot.Title,
            snapshot.Description,
            snapshot.Status,
            snapshot.Version,
            snapshot.Rows,
            snapshot.Cols,
            snapshot.RowLabels.ToArray(),
            snapshot.ColLabels.ToArray(),
            snapshot.Cells.Select(ToDto).ToArray(),
            snapshot.EnabledModifierCodes.ToArray()
        );
    }

    public static GameBoardCellMediaDto ToDto(this GameBoardCellMedia media)
    {
        return new GameBoardCellMediaDto(media.Url);
    }

    public static GameBoardSnapshotDto ToDto(this GameBoardSnapshot snapshot)
    {
        return new GameBoardSnapshotDto(
            snapshot.GameId,
            snapshot.Title,
            snapshot.Description,
            snapshot.Status,
            snapshot.Version,
            snapshot.Rows,
            snapshot.Cols,
            snapshot.RowLabels.ToArray(),
            snapshot.ColLabels.ToArray(),
            snapshot.Cells.Select(ToDto).ToArray(),
            snapshot.EnabledModifierCodes.ToArray(),
            snapshot.ActiveModifiers.Select(ToDto).ToArray()
        );
    }

    public static GameCellOpenedEventDto ToDto(this GameCellOpenedEvent @event)
    {
        return new GameCellOpenedEventDto(@event.GameId, @event.Version, ToDto(@event.Cell));
    }

    public static GameModifierDefinitionDto ToDto(this GameModifierDefinition definition)
    {
        return new GameModifierDefinitionDto(
            definition.Code,
            definition.Kind,
            definition.Category,
            definition.ScoringType,
            definition.Tier,
            definition.Name,
            definition.Description,
            definition.ActivationCost,
            definition.DefaultLimitPerGame,
            definition.IconEmoji,
            definition.ActivationCommand
        );
    }

    public static GameModifierActivationDto ToDto(this GameModifierActivation activation)
    {
        return new GameModifierActivationDto(
            activation.ModifierCode,
            activation.ActivatedByUserId,
            activation.ActivatedAtUtc
        );
    }

    public static GameModifierActivatedEventDto ToDto(this GameModifierActivatedEvent @event)
    {
        return new GameModifierActivatedEventDto(@event.GameId, @event.Version, @event.Activation.ToDto());
    }

    private static GameBoardCellDto ToDto(GameBoardCell cell)
    {
        return new GameBoardCellDto(
            cell.Id,
            cell.Row,
            cell.Col,
            cell.CellType,
            cell.Title,
            cell.Description,
            cell.Cost,
            cell.State.ToString().ToLowerInvariant(),
            cell.Media.Select(media => new GameBoardCellMediaDto(media.Url)).ToArray()
        );
    }

    private static AuthRole? TryMapAuthRole(string role)
    {
        return role switch
        {
            AuthRoleCodes.Admin => AuthRole.Admin,
            AuthRoleCodes.Moderator => AuthRole.Moderator,
            AuthRoleCodes.Viewer => AuthRole.Viewer,
            _ => null
        };
    }
}
