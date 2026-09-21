# Database Architecture

Dead-Mans uses PostgreSQL as the source of truth. Local development can rebuild the
database from a clean EF Core baseline migration; object storage is intentionally
outside of database resets and keeps card images/media.

## Pre-release multiple-choice upgrade

`20260919151237_ConvertQuizToMultipleChoice` upgrades the existing database in
place. It deliberately resets pre-release games (including rosters, rounds,
history, finalizations, notifications, modifier purchases and the quiz ledger)
and the old free-text questions. This reset is approved only for the current
test-data rollout, not a template for future production migrations.

Users, roles, assignments and access audit, question categories, modifier
definitions/versions and media assets are retained. Storage objects are not
touched. The reset enumerates its tables explicitly and uses no `CASCADE`;
unexpected foreign-key dependencies abort it instead of deleting extra data.
The reset and schema conversion run in the same EF migration transaction.
Reapplying the completed migration is a no-op and must not reset new games.

Before rollout, verify the restore procedure against an earlier backup. At
cutover, stop all application instances and workers, take and record a final
backup of the now read-only database, apply the migrations once, then start the
new application. No database recreation or connection-string change is
required. Old game history is recoverable only from that cutover backup, not by
`Down`. Downgrading a populated new quiz is explicitly rejected. Test content is
loaded separately using `seed-local-test-data.ps1`; it is not inserted into
production by the migration.

## Naming

- Physical database names use `snake_case` for tables, columns, indexes, foreign
  keys and check constraints.
- EF entity names can stay domain-oriented (`GameRound`, `GameModifierActivation`),
  but storage names describe the product concept:
  - `game_rounds` stores played card rounds and their score snapshots.
  - `game_round_cell_media` stores immutable bucket/object identity, MIME type and size
    captured for a played round; delivery URLs are generated when data is read.
  - `game_modifier_activations` stores immutable, round-scoped modifier purchases,
    including owner/initiator, frozen definition revision, full BehaviorV2/catalog
    snapshot and cancellation/refund audit.
  - `game_enabled_modifiers` and `game_enabled_questions` store per-game enabled catalog rows;
    modifier rows also preserve the actor, timestamp and reason for a game-scoped emergency disable.
  - `game_team_slots`, `game_teams`, `game_team_members` and
    `game_team_invitations` store registration and queue state.

## Core Aggregates

- Auth and access: `users`, `roles`, `user_roles`.
- Game lifecycle: `games`, `game_boards`, `game_board_cells`,
  `game_board_cell_media`, `game_finalizations`, `game_team_final_results`.
- Teams and registration: `game_team_slots`, `game_teams`, `game_team_members`,
  `game_team_invitations`.
- Round history and leaderboard facts: `game_rounds`,
  `game_round_participants`, `game_round_cell_media`,
  `game_round_modifier_results`.
- Modifier catalog and runtime: `modifier_definitions`, append-only
  `modifier_definition_versions`, immutable conflict-name snapshots,
  `modifier_definition_version_conflicts`, `game_enabled_modifiers`,
  `game_modifier_activations`.
- Quiz catalog and runtime: `question_categories`, `question_definitions`,
  `question_options`, `game_enabled_questions`, `game_quiz_question_sessions`,
  `game_quiz_submissions`, `game_quiz_point_ledger_entries`.
- Media catalog: `media_assets`.

## Integrity Rules

- Historical facts are preserved. Round rows keep denormalized snapshots for card,
  team, participant, modifier and media details that leaderboards/history need.
  `game_rounds.empty_card_penalty_applied` stores the resolved fact that a
  completed card had no positive base or modifier score and therefore used its
  card value as a penalty; the penalty amount is derived from the round
  `base_score`.
- A `users` row is the durable Twitch principal. Its `twitch_user_id` cannot be
  changed and the row cannot be physically deleted; access is revoked with
  `is_active = false`. A quiz submission snapshot must identify the same active Twitch
  principal before the answer fact can be inserted. Email is neither
  requested from Twitch nor stored because no current product capability needs it.
- Every game completion preserves one authoritative `game_finalizations` record and one
  `game_team_final_results` row per confirmed team. The unique request ID provides
  idempotency; display names, team names, slots and rosters are copied into the snapshot.
  Deferred PostgreSQL checks reject `finished` without the complete timestamp-aligned
  snapshot, open round/quiz/modifier state, or aggregates that disagree with stored facts.
- Catalog deletes are soft/archive operations (`is_deleted`, `deleted_at_utc`,
  `is_archived`) so old game history remains readable.
- Foreign keys from historical facts to global catalogs use restrictive delete
  behavior unless the child is a draft/runtime-only value.
- Check constraints validate state machines, non-negative scores/counts, soft-delete
  timestamp semantics, native `text[]` board labels and complete board dimensions.
- Partial unique indexes enforce singleton active lifecycle states and prevent the
  same active user from occupying conflicting team membership/invitation states.
- `games.active_team_id` is protected by a composite FK to
  `game_teams(game_id, id)`, so a game cannot point at a team from another game.
- Registration rows enforce lifecycle facts:
  - `game_teams` status must match its confirmation/rejection/disband timestamps.
  - `game_team_invitations.pending` cannot have `responded_at_utc`; all terminal
    invitation statuses must have it.
  - a pending team invitation follows the team's current slot when an administrator
    moves or swaps teams; terminal invitations retain their slot snapshot as history.
    Deferred constraints reject a pending invitation whose slot differs from its team.
  - `game_team_members.left_at_utc` cannot be earlier than `joined_at_utc`.
  - publication requires exactly one complete board and at least one team slot;
    activation requires a settled roster of confirmed teams within the game's size limits;
    the published configuration and active/finished roster are immutable.
- Game-round and quiz-question history enforce resolution facts:
  - nonterminal round lifecycle is `awaiting_modifiers` → `preparing` →
    `in_progress` → `reviewing_results`; every mutation advances a monotonic
    `version` and lifecycle timestamps are checked against status;
  - partial unique index `ux_game_rounds_single_nonterminal_game` permits at most
    one nonterminal round per game, including races outside the application lock;
  - completed/cancelled `game_rounds` require final resolution data;
  - `created_at_utc` is the round selection time and `gameplay_started_at_utc` is the
    only gameplay-start timestamp;
  - an empty-card penalty can only be marked on completed rounds;
  - pending modifier results cannot have resolver data, terminal modifier results
    must have it;
  - each quiz question session owns one timer and uses `open`, `closed` or `skipped`;
    it is independent from `game_rounds`, so any number of questions can be asked during
    one played card round;
  - `(question_session_id, user_id)` is unique, so every user has at most one submission
    per question across all transports; both correct and incorrect choices are preserved;
  - correctness, option distribution and rewards become public only after the question
    timer closes, and each correct submission has at most one quiz-reward ledger entry;
  - the immutable point-ledger running balance is chained separately for each
    `(game_id, user_id)`, so every game starts at zero and points never carry over.
- Modifier purchase rows are never deleted to perform a refund:
  - status is `active`, `consumed` or `cancelled`;
  - `round_id` and owner/initiator IDs are mandatory;
  - a cancelled purchase keeps cancellation actor/time/reason and a refund in the
    inclusive range `0..activation_cost_snapshot`;
  - the current full-refund commands require `refund_amount = activation_cost_snapshot`,
    and timestamp/refund ordering is protected by database checks.
- Runtime facts are accepted only inside the active game lifetime. Round creation must
  match the exact open board cell, confirmed team/slot and frozen cell values; modifier
  activation must target its current `awaiting_modifiers` round; quiz and ledger writes
  are rejected before start and after finish.
- Modifier content is revisioned and snapshot-based:
  - `modifier_definitions.current_version_id` selects the current revision; unique
    `(modifier_id, revision)`, composite ownership FKs, positive revisions, and database
    immutability triggers protect historical rows;
  - the stable root contains identity, archive state and audit only; version content is never
    duplicated into mutable root columns or a mutable conflict projection;
  - `draft -> ready` pins the whole enabled set, and activation/runtime calculations resolve
    price, limit, compatibility, formula and display fields only from that game binding;
  - `modifier_definition_versions.behavior_v2_json` is strict schema version `2`; formulas are
    pinned by code/version with typed parameters, and normalized tags are stored separately;
  - activation rows freeze the revision, BehaviorV2, name, description, category, command,
    icon and tags at purchase time;
  - result rows copy only from the activation snapshot and require both a definition revision
    and BehaviorV2 snapshot. Missing or invalid snapshots fail closed instead of being silently
    recalculated from the current catalog.
- A modifier definition included in the active game is content-locked until that game
  finishes or is archived. Emergency disable is deliberately stored on
  `game_enabled_modifiers`, blocks only new activations for that game and cannot rewrite
  the first actor/time/reason audit; existing activations and snapshots remain unchanged.

## Concurrency Policy

- PostgreSQL remains the concurrency boundary for registration and lifecycle
  transitions.
- Team join/move operations lock affected team/slot rows with `SELECT ... FOR UPDATE`
  before validating capacity or occupancy.
- Game lifecycle transitions lock the target `games` row before validating and
  changing state. Every active-game mutation uses the same order: `game` first, then
  `round` / `quiz` / `cell`. After waiting for the game lock it rechecks that the game
  is still active.
- Round transitions, modifier activation and modifier cancellation subsequently share a
  `SELECT ... FOR UPDATE` lock on the target `game_rounds` row. Commands carrying
  `expectedRoundVersion` reject stale writers with `409`; already-applied refunds
  are recognized before that rejection and remain idempotent.
- Quiz submissions acquire compatible `FOR SHARE` lifecycle locks in game → question-session
  order. They query only the current user's submission; the unique `(question_session_id, user_id)`
  index arbitrates simultaneous choices across transports. A same-choice retry returns the
  original receipt even after closure, while a different choice returns `already_answered`.
- Quiz closure acquires `FOR UPDATE` locks in the same order, loads current submissions only
  after locking, and reads winner balances in one grouped query. A retry after a committed
  closure cannot award points again. Public reads return only the viewer's submission and
  aggregate option counts, never load all participant entities for an open question.
- Catalog create/update/archive and lifecycle publication/start share one transaction-scoped
  PostgreSQL advisory lock; each transition also locks its game row. Compatibility cascades are
  all-or-nothing and recheck
  every affected definition after the lock. Modifier activation locks the active game and ordering round,
  then rejects an emergency-disabled enabled row before charging points.
- Modifier-history reads are separate `AsNoTracking` projections. Revision and archive keyset
  indexes plus case-insensitive trigram GIN indexes keep pagination and bounded search predictable as
  the catalog grows; command-count and `EXPLAIN` regression tests guard against N+1 and plan drift.
- `game_round_transition_audits` is append-only lifecycle evidence keyed by
  `(round_id, sequence)`; unique `(round_id, resulting_round_version)` prevents two
  transitions from claiming the same version.
- Technical cancellation is one transaction: it terminally cancels the round, fully
  refunds every non-cancelled activation, retires the board cell as `cancelled`, clears
  the active team and advances both round and board versions. Structured reason fields
  and database checks keep cancellation records internally consistent.
- Whole-game finalization locks the game before deciding question deadlines.
  In that same transaction, expired quiz questions are settled as `closed` and
  rewarded; only still-live questions become `skipped`. The final totals include
  the new rewards. Then the immutable result is inserted, the active team is cleared, the game becomes
  `finished`, and the board version advances. A failed snapshot insert rolls back every
  one of those writes.
- Ledger inserts hold a shared lifecycle lock and a transaction-scoped advisory lock for
  exactly `(game_id, user_id)`. The same viewer's balance is serialized while independent
  Twitch viewers can accrue points concurrently.
- Partial unique indexes still act as the final guard for singleton draft/ready/active
  games, one active team per slot, one active team membership per user, and one
  pending invitation per user/game.

## PostgreSQL Tests

- Fast endpoint contract tests can keep using InMemory where database behavior is
  not under test.
- Persistence-boundary tests use a real temporary PostgreSQL database
  (`deadmans_tests_*`) created from the current EF migrations.
- The Postgres suite verifies representative FK/check failures and a concurrent
  last-slot team join scenario. It also races modifier activation against prepare and
  prepare against rebuild, and game completion against active-team selection. These
  prove that row locks plus versions prevent late purchases, post-finish mutations,
  lost transitions and misordered audit rows. A forced snapshot-insert failure verifies
  transactional rollback.
- A PostgreSQL catalog gate rejects unvalidated constraints, invalid indexes, tables
  without primary keys, foreign keys without a matching index prefix, unsafe timestamp
  types, unbounded `varchar`, nullable arrays, truncated relational names and database
  functions with unsafe execution settings.

## Migration Policy

### Twitch Bot connections and quiz delivery storage

`20260920180839_AddTwitchQuizIntegration` is additive: it creates three tables and
their indexes without deleting or rewriting games, answers or points.

- `twitch_quiz_connections` stores the shared bot and broadcaster grants by role,
  mapped by `TwitchBotConnection`. The historical SQL name remains unchanged. Tokens
  are encrypted with the environment's persistent ASP.NET Core Data Protection keys.
- `twitch_quiz_publications` stores the immutable question/option snapshot and the
  delivery state of each chat message. A session is opened only after both question
  messages are confirmed. Delivery recovery never repeats point settlement.
- `twitch_eventsub_receipts` deduplicates notification IDs and chat message IDs.
  These are technical receipts, not the source of truth for answers or points.

Workers and operator recovery actions serialize publication through a PostgreSQL
session advisory lock. The `sending` marker commits before the external request;
an interrupted delivery requires explicit recovery. Cancellation uses the same
game/session row-lock order as quiz settlement.

- `20260908003848_ProductionBaseline` is the immutable root of the supported
  migration chain. On an empty database it creates the product schema and seeds
  only technical access roles; later migrations advance that schema to the
  current release.
- Existing environments are upgraded in place by the complete ordered forward
  migration chain in this repository. Release artifacts, migration runner and
  application instances must use the same commit.
- Applied migrations are immutable. Every later schema change is delivered as a
  new forward migration with a tested rollback or restore plan. A migration may
  intentionally discard pre-release test data only when that exact reset and
  recovery boundary is documented and approved for the release.
- The EF migrations history table is `__ef_migrations_history`.
- When changing the physical schema, update this document and the retention policy
  in the same change.
- The empty-database bootstrap and restore gates are defined in
  `docs/runbooks/initial-production-database-rollout.md`; upgrades of populated
  environments follow the release-specific section in `deploy/README.md`.
