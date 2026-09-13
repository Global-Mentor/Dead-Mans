# Game registration

## Game lifecycle

`draft` → `ready` → `active` → `finished`

- **ready**: team registration (team slots, teams, invitations). Board is visible; cells are not opened.
- **active**: gameplay (`POST /api/game/cells/{cellId}/open`).

Admin transitions (`POST`, admin role):

- `/api/game/lifecycle/open-registration` — draft → ready
- Opening registration accepts an optional `{ gameId, expectedVersion }` body. The setup UI sends the reviewed draft identity and board version; stale drafts return `409` and replaced drafts return `404`. Empty-body requests remain supported for existing clients.
- `/api/game/lifecycle/start` — ready → active
- `GET /api/game/lifecycle/games/{gameId}/finish-preview` — authoritative completion preview
- `POST /api/game/lifecycle/games/{gameId}/finish` — active → finished with optimistic board versioning and an immutable result snapshot

Full finalization rules, warnings, ranking and idempotency are documented in
[`game-lifecycle.md`](game-lifecycle.md).

## Database

- `games`: `ReadyAtUtc`, `MinPlayersPerTeam`, `MaxPlayersPerTeam`
- `game_team_slots`: public / reserved team slots that define the game queue
- `game_teams`: `forming` | `confirmed` | `rejected` | `disbanded`; rejected/disbanded rows remain for history; confirmed teams can carry a pending admin disband request
- `game_team_members`: equal players (no captain role), with `JoinedAtUtc` / `LeftAtUtc` membership history
- `game_team_invitations`: unified admin/player invite flow tied to a game, optional team, and target team slot

Partial unique indexes: one `draft`, one `ready`, one `active` game at a time; one occupying team (`forming`/`confirmed`) per team slot; one active membership per player/game.

## Team names and application display

Player-created teams require a name of 3–18 characters after whitespace normalization; players cannot
clear an existing name. All creation and rename paths, including admin actions, reject
names equivalent to another forming/confirmed team in the same game. Comparison removes
all whitespace and ignores case; display names retain normalized word spacing. The
check runs inside the existing game roster row lock, preventing concurrent duplicates.
Rejected/disbanded historical names do not block reuse. Admin-created empty rosters may
remain unnamed until edited; no existing or historical teams are renamed automatically.

Each active forming-team membership stores an optional readiness timestamp. A player may mark only
their own membership ready, and only after the team has a valid name and every configured roster
place is filled (`member count == MaxPlayersPerTeam`). Team readiness is derived rather than stored:
the forming team is ready when its roster is full and every active member is ready. A player may
withdraw their own readiness while the team remains forming. When any member leaves or is moved out,
readiness is cleared for every member remaining in the source team; a newly joined member starts not
ready.

Readiness writes recheck the current game lifecycle and roster capacity after acquiring the game-row
lock. Both marking and withdrawing readiness require open registration; a request waiting behind
game deletion or closure cannot update the old roster. The request must explicitly contain the
`isReady` boolean; an empty or malformed body is rejected without changing readiness. Clearing a
forming team's name through the admin API clears every member's readiness; restoring the name does
not restore those confirmations. A nonempty rename preserves readiness.

Readiness informs the administrator but does not authorize confirmation. Administrators may confirm
an unready forming team when its roster still satisfies the configured `MinPlayersPerTeam` /
`MaxPlayersPerTeam` bounds and it has no pending invitations. Confirmation always requires a valid
team name. This requirement is rechecked inside the roster transaction, so a concurrent rename or
roster change cannot bypass it.

Renaming rechecks game state and, for player actions, current membership after acquiring
the game roster lock. A player who left or was removed while the request waited cannot
rename the former team. Player edits require open registration; administrators retain
access to forming teams in ready or active games.

The application separates confirmed teams from forming rosters. Its summary counts
confirmed + forming open + forming private = total. Slot numbers are hidden in this
player view. The player's own row has a stronger gradient, and roster status is shown
beside its actions. Registration changes resync through SignalR without a page reload.

Forming rosters appear first; the ready-to-participate group sits below them in a
collapsed disclosure with a localized team count. Creation/own-roster and team-list
panels have independent frames aligned at the top. A button above the player's team
name opens the name editor in a dialog until confirmation; cancelling discards the
draft, and a realtime confirmation closes the editor. Shared form fields display
styled validation hints and focus the first invalid field instead of using native
browser validation bubbles.

Leaving requires confirmation. The dialog stays open while the request is pending and
after a failed request, allowing a retry; it closes only after success or cancellation.

## Registration API

- `GET /api/game/registration` — snapshot for the ready game
- `POST /api/game/registration/teams` — create team on a public team slot
- `PATCH /api/game/registration/my-team/readiness` — mark or withdraw the current player's own readiness for a forming team
- `POST /api/game/registration/teams/{teamId}/join` — open team only
- `POST /api/game/registration/teams/leave` — while game is ready; confirmed teams cannot be left directly
- `POST /api/game/registration/my-team/disband-request` — confirmed team member asks an admin to disband the team
- `DELETE /api/game/registration/my-team/disband-request` — only the requesting player may withdraw it while still a member and registration remains open; the team remains confirmed. Another member receives `403 game_registration.disband_request_not_owned`. The player UI confirms both actions in a dialog.
- `GET /api/game/registration/teams` — compact team list for registration screens
- `GET /api/game/registration/admin` — moderator/admin workspace snapshot with available players
- `POST /api/game/registration/admin/teams` — moderator/admin creates an empty open or closed team on the first free queue position, or on an explicit team slot when needed by tooling
- `POST /api/game/registration/admin/teams/{teamId}/assign` — moderator/admin assigns a free player or moves a player between forming teams; confirmed rosters cannot be changed
- `POST /api/game/registration/admin/teams/{teamId}/members/{userId}/remove` — removes a player from a forming team; removing the last member automatically disbands the team, cancels pending invitations and frees its slot
- `POST /api/game/registration/admin/teams/{teamId}/move` — moderator/admin moves a team to another queue position, swapping with the occupying team when needed
- `POST /api/game/registration/teams/{teamId}/disband` — moderator/admin disbands a forming or confirmed team, including an empty team, during registration or an active game; closes memberships and pending team invitations. No player request is required. An active team/round returns `409 game_registration.team_active_in_game`; a team marked played or with any round (opening a card creates one, including later cancellation) returns `409 game_registration.team_already_played`.
- `POST /api/game/registration/teams/{teamId}/confirm` / `reject` — approve or reject a team for play
- `POST /api/game/registration/invitations` — create admin invitations for reserved or curated flows

Draft setup creates six default public team slots (`GameRegistrationDefaults`). Team size is enforced from the ready-game configuration, and the current baseline is 2 players per team.

## Panel routes

- `/panel/game-application` — player entry flow plus admin roster management when the current user has game setup capability
- `/panel/team-registrations` — dedicated moderator/admin registration workspace backed by the same registration snapshot and actions

## Current UI behavior

- Admins open registration from the game setup sidebar after saving the draft. The panel blocks unsaved edits, in-flight media operations, known remote changes and an existing ready/active game, then asks for publication confirmation and opens team management.
- Quiz questions are optional for both `draft → ready` and `ready → active`. A game with no selected questions can be published and started normally after its teams meet the start requirements.
- Draft saves, resets, media attachment/removal and publication share the catalog transaction lock. Storage uploads finish outside the transaction; attachment rechecks that the draft is still editable and cleans up the uploaded object if publication/reset won the race. Publication pins modifier revisions and question snapshots; opening registration and starting the game broadcast lifecycle changes so navigation and registration views refresh across the panel.

- Players choose between an open team and a closed team with clearer intent text.
- Open team means any eligible player can join until the configured team size is reached.
- Closed team means the roster is curated by invitation or by an admin assignment.
- Pending invitations for closed teams are attached to the team DTO and rendered alongside roster members with an awaiting-confirmation marker; they do not count as active members until accepted.
- Once a team is confirmed, players see a request-to-disband action instead of direct leave; an existing request is shown as pending.
- Moderators/admins work in a team-centric management panel with available players, explicit up/down team ordering, drag-and-drop team swaps, empty-team creation, and approve/reject actions in one place.
- Moderators/admins see pending disband requests in a prominent alert and in the team row, and confirm a dialog before disbanding a team. Trying to disband an active or played team displays an alert explaining the refusal. Server refusals also show a translated error message.
- Confirmed rosters have no individual removal or player drag controls and do not accept player drops. The API enforces the same rule for both the source and destination of a transfer, returning `409 game_registration.team_roster_locked` with a translated explanation. Queue reordering is limited to registration; stale requests after game start return a domain conflict.
- Disbanding closes recruitment and clears the pending disband request while preserving team, invitation and membership history. After game start, a narrow database exception permits this transition only for an inactive team that is not marked played and has never opened a card. All registration mutations acquire the game-row lock before any team, slot or invitation locks, serializing them with game start, round creation, active-team selection and played-state changes. Leaving a team rechecks confirmation and pending invitations under that lock. The team transition and membership closure commit together, enforced by deferred roster checks. Starting a game still requires a confirmed roster; all eligible teams may subsequently be disbanded.
- Leaving, removing or transferring the last member uses the same closure procedure. Automatic closure records the acting player for a voluntary exit and the administrator for a removal or transfer. Final results omit teams that never opened a card. A cancelled round preserves its team in history and prevents disbanding; an administrator may mark that team played to remove it from the remaining queue. Reverting the migration is refused if it would restore invariants incompatible with already committed empty rosters or finalizations.

## Readiness rollout compatibility

- Apply `20260913191016_AddTeamMemberReadiness` before directing traffic to the new backend.
  `Database:ApplyMigrationsOnStartup` is false by default; a normal application restart alone
  does not apply the migration. Existing memberships start with null readiness, so no players
  or teams are automatically marked ready.
- Deploy backend and frontend from the same release and drain old backend instances before
  enabling player traffic to readiness. Mixed backend versions are not supported once readiness
  is used: the old membership closure code does not clear `ready_at_utc`, so closing a ready
  membership can violate the new check constraint, and old roster mutations do not reset the
  other members' readiness.
- The existing `registrationChanged` SignalR event keeps its name and empty argument list.
  Player and admin snapshots and the team queue are invalidated on that event; reconnecting
  clients reload state. A publication failure does not roll back the committed HTTP mutation.
- Team readiness does not replace admin confirmation in game-start validation. Confirmed rosters
  remain eligible without every player having marked ready; confirmed membership changes remain
  locked. Existing unnamed historical/confirmed teams are not automatically renamed by this
  migration; the name requirement applies to new confirmations.
- For rollback, stop traffic to the new release first. Reverting the migration drops readiness
  timestamps, so preserve a backup if those values must survive. Restore the matching old backend
  and frontend together; do not run the old roster writer against populated readiness columns.
- Before release, run the real PostgreSQL migration, constraint and concurrency suite. CI provides
  PostgreSQL and runs this suite before image publication; local in-memory tests do not replace it.

## Known future work

- explicit registration settings in the game setup/global settings UI;
- clearer read-only history and audit presentation after registration closes.

## Layering and contracts

- **Transport**: `backend/openapi/deadmans.v1.yaml` documents `/api/game/registration` and `/api/game/lifecycle/*`. Regenerate frontend transport artifacts with `npm --prefix frontend run generate:transport`.
- **HTTP**: thin controllers (`GameRegistrationController`, `GameLifecycleController`); registration errors map via `Api/Mapping/GameRegistrationErrorMapping.cs` with stable `code` fields in `ErrorResponse`; DTOs via `Api/Mapping/GameRegistrationMapping.cs`.
- **Application**: `GameRegistrationService` / `GameLifecycleService` own registration rules and lifecycle preconditions; ports `IGameRegistrationService`, `IGameLifecycleService`.
- **Infrastructure**: `IGameRegistrationReadStore` + `IGameRegistrationPersistence`, `IGameLifecycleReadStore` + `IGameLifecyclePersistence`; team slot seeding via `GameTeamSlotInitializer` in `Infrastructure/Persistence/`.
- **History**: admin reject marks a team as `rejected`, closes active memberships, and cancels pending team invitations. Player leave marks `LeftAtUtc`; if the last active member leaves, the team becomes `disbanded`. Confirmed teams cannot be left directly; a member can store `DisbandRequestedAtUtc` / `DisbandRequestedByUserId`, and an admin disband records `DisbandedAtUtc` / `DisbandedByUserId`, closes active memberships, and cancels pending team invitations. Rows are preserved so future player/team/game history can be built from the same tables.
- **Frontend**: transport in `frontend/src/features/game-registration/api/`; UI in `game-application/` and `team-registrations/`. The admin panel is reused across both admin entry points. A missing ready-game snapshot (`404`) renders a normal unavailable state without disabled mock controls.
