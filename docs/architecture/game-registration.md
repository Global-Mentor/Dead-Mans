# Game registration

## Game lifecycle

`draft` → `ready` → `active` → `finished`

- **ready**: team registration (slots, teams, invitations). Board is visible; cells are not opened.
- **active**: gameplay (`POST /api/game/cells/{cellId}/open`).

Admin transitions (`POST`, admin role):

- `/api/game/lifecycle/open-registration` — draft → ready
- `/api/game/lifecycle/start` — ready → active
- `/api/game/lifecycle/finish` — active → finished

## Database

- `games`: `ReadyAtUtc`, `MinPlayersPerTeam`, `MaxPlayersPerTeam`
- `game_participation_slots`: public / reserved slots per game
- `game_teams`: `forming` | `confirmed` | `rejected` | `disbanded`; rejected/disbanded rows remain for history
- `game_team_members`: equal players (no captain role), with `JoinedAtUtc` / `LeftAtUtc` membership history
- `game_participation_invitations`: unified admin invite flow

Partial unique indexes: one `draft`, one `ready`, one `active` game at a time; one occupying team (`forming`/`confirmed`) per slot; one active membership per player/game.

## Registration API

- `GET /api/game/registration` — snapshot for the ready game
- `POST /api/game/registration/teams` — create team on a public slot
- `POST /api/game/registration/teams/{teamId}/join` — open room only
- `POST /api/game/registration/teams/leave` — while game is ready
- Admin: `GET /api/game/registration/teams`, confirm/reject, create invitations

Draft setup creates six default public slots (`GameRegistrationDefaults`).

## Panel routes

- `/panel/game-application` — players
- `/panel/team-registrations` — admin list and confirm/reject

## UI roadmap markers

Each registration-related page includes dashed **UI mockup** blocks and an info **Planned next** list when registration is not open yet (`404` on snapshot). Shared primitives: `PlannedFeatureFormShell`, `PlannedFeatureRoadmap` in `frontend/src/shared/ui/`.

## Layering and contracts

- **Transport**: `backend/openapi/deadmans.v1.yaml` documents `/api/game/registration` and `/api/game/lifecycle/*`. Regenerate frontend types with `npm --prefix frontend run generate:contracts`.
- **HTTP**: thin controllers (`GameRegistrationController`, `GameLifecycleController`); registration errors map via `Api/Mapping/GameRegistrationErrorMapping.cs` with stable `code` fields in `ErrorResponse`; DTOs via `Api/Mapping/GameRegistrationMapping.cs`.
- **Application**: `GameRegistrationService` / `GameLifecycleService` own registration rules and lifecycle preconditions; ports `IGameRegistrationService`, `IGameLifecycleService`.
- **Infrastructure**: `IGameRegistrationReadStore` + `IGameRegistrationPersistence`, `IGameLifecycleReadStore` + `IGameLifecyclePersistence`; slot seeding via `GameParticipationSlotInitializer` in `Infrastructure/Persistence/`.
- **History**: admin reject marks a team as `rejected`, closes active memberships, and cancels pending team invitations. Player leave marks `LeftAtUtc`; if the last active member leaves, the team becomes `disbanded`. Rows are preserved so future player/team/game history can be built from the same tables.
- **Frontend**: transport in `frontend/src/features/game-registration/api/`; UI in `game-application/` and `team-registrations/`. Planned roadmap blocks render only when registration is not open (`404` snapshot).
