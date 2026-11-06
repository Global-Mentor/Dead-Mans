# User profile

The authenticated user's profile is available at `/panel/profile` through the nickname menu. It shows the Twitch display name and avatar, participation counts, paginated games and personal quiz answers. The additional Twitch login is not displayed. Twitch identity fields come from the stored user record and are refreshed by the existing Twitch sign-in flow.

The stored user creation timestamp is not presented as a website registration date: Twitch quiz activity can create the user record before their first website sign-in.

## Private read API

- `GET /api/profile/me`: identity, separate `playerGameCount` and `quizGameCount`, answer counts and the `statistics` summary.
- `GET /api/profile/me/games?participation=player&page=1&pageSize=20`: games with personal round and answer counts. `participation` accepts `player` (default) or `quiz`; pagination and total counts apply to the selected group.
- `GET /api/profile/me/answers?gameId=...&page=1&pageSize=20`: personal answers, optionally filtered by game.

All endpoints derive the user ID from the authenticated session and require an active user. There is no target-user parameter or public profile endpoint. Pages contain at most 100 items; a page beyond the current result is clamped to the last available page (page 1 for empty results). Reads are implemented by `IUserProfileReader` and `DbUserProfileReader`; the OpenAPI contract generates frontend transport types. Query caches are scoped by the authenticated user ID.

## Participation and historical facts

A non-deleted, non-draft game belongs to the user's player history when it contains at least one of:

- Current team membership.
- A round participant snapshot for that user.

A game belongs to the user's quiz history when they submitted an answer to a closed question session in that game. One game can belong to both histories. Each group counts a game once, regardless of the number of rounds or answers. Open and skipped question sessions do not establish quiz participation.

A modifier activation or manual points award alone establishes neither player nor quiz participation. Current team membership can appear before the first completed round; past membership without a round participant snapshot does not count. Completed rounds count only completed rounds containing the user's participant snapshot. Team kills and bounty are not presented as individual statistics.

Answers are exposed only after their question session closes. Text, category, selected option, result, points and screenshot data come from saved session/submission snapshots, not the current question catalog. Changing or removing a catalog question must not rewrite this history. The selected screenshot option is localized using its saved option names. Finished games link to the existing game results page.

Results links include `focus=me`. The archive selects the signed-in user's team by stable user ID, preferring the saved current roster in that finished game and then the most recent round participant snapshot. An explicit team selection takes precedence. The history response exposes roster IDs only for teams displayed in the finished game's leaderboard, including legacy games without a finalization record. If the user has no matching team, ordinary leaderboard selection applies.

## Statistics

The `statistics` object aggregates the user's eligible history independently of the currently loaded page. All groups exclude deleted and draft games.

- The existing `finishedPlayerGameCount` counts finished player-participation games. `completedRoundCount` counts completed rounds containing the user's participant snapshot, including completed rounds in active games. `awardedQuizPoints` sums saved points from closed personal answers.
- `games` describes completed team rounds containing that user. Played games and teams are distinct IDs; teammates are distinct other users in those same round snapshots. Scores, kills (including saved modifier kill deltas) and bounties belong to the team round, not to individual player performance. Wins and podiums use saved final placements only. Each game counts once, taking the best placement if the user played for multiple teams. Games without a saved placement remain outside the ranked denominator; no placements are reconstructed for legacy games. Best placement and best round score are null when absent.
- `quiz` separates text and screenshot answers using the saved image snapshot, and groups categories by saved category name. Renamed categories intentionally retain separate historical names. Incorrect answers equal answers minus correct answers. The longest correct streak follows the user's closed answers by submission time and stable answer ID, crosses game boundaries, and resets on an incorrect answer. Unanswered questions are absent from this sequence. Per-game maximum correct answers and earned points use the complete history.
- `points` separates positive manual awards, absolute manual deductions, gross modifier spending, refunds and net spending. All are historical totals, not a shared spendable wallet. Available quiz balances remain game-specific. Manual corrections and refunds do not change earned quiz points.
- `modifiers` belongs to `ActivatedByUserId`, including orders entered by another administrator. Paid/free orders include cancelled orders; free orders have no financial ledger entry. Applied means consumed in a completed round with a saved result; archived applied orders remain included. Pending means neither cancelled nor applied. Most used groups applied orders by stable modifier ID, breaks count ties by ID, and displays the most recent saved name. Categories include all orders; outcomes include only applied orders and retain their distinct rule/scoring outcome codes.
- `activity` uses completed round finish times, closed-answer submission times and modifier activation times, including cancelled orders. Manual adjustments and mere membership are not activity events. First/last activity and distinct UTC active days span the eligible history. The 12 UTC calendar months ending in the current month come from the injected clock and include zero months. Game counts deduplicate games across all event types within each month.

Integer totals use 64-bit intermediates and saturate at the signed 32-bit API limits. `averageRoundScore`, `averageAnswerPoints` and `averagePaidOrderCost` are calculated on the server from original totals before saturation; an empty denominator returns zero. Empty histories return numeric zeros, empty category/outcome lists, null optional records/dates and 12 zero months.

A PostgreSQL repeatable-read transaction keeps the scalar summary and all groups on one snapshot if a quiz closes during the request. Each paginated read also uses one snapshot for identity validation, total count, page clamping and page rows, including when a question closes or a game is archived concurrently. The summary uses seven SQL queries without per-row queries. Identity, scalar counts, ledger groups, ranked placements and teammate counts are aggregated in SQL. The remaining projections load only the current user's thin round, closed-answer and activation facts, without question text, image contents, behavior documents or other users' history. Streak and activity calculations therefore use memory proportional to that user's history; this is not constant-size retrieval.

The Charts tab renders the same summary response; it does not fetch history pages or maintain a second statistics source. Monthly series use the saved activity counts, while answer distributions, point flows and category comparisons use lifetime eligible aggregates. Charts do not infer monthly point totals or placement trends from missing data.

## Extension boundary

The initial profile has no public lookup, achievement catalog, award tables or placeholder achievement panel. Stable user, game, question and question-session IDs and the existing persisted participation/result facts provide the basis for later features. Public profiles will need an explicit visibility policy and separate public response contract. Achievement rules, eligible historical events, duplicate-award protection and backfill policy should be defined together when the first actual achievements are selected. Profile reads must not award achievements or change game history.
