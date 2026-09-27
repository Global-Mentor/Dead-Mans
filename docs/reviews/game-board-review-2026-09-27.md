# Game board and commit preparation review

Scope: the pending board layout, compact team queue, authoritative team scores,
shared disclosure changes and modifier activation response handling.

## Reviewed behavior

| Area | Result |
| --- | --- |
| Scores | Queue scores use the same best-round-minus-penalties calculation as finalization. Only completed rounds count; zero and no completed round remain distinct. Finalization snapshots and the database schema are unchanged. |
| Transport | `GameTeamQueueItemDto.finalScore` is required and nullable. The API mapper and generated frontend contract agree. |
| Board layout | Matching gutters center the cards; the phase/team rail and queue stack when space is insufficient. Cards retain their 2:3 proportions and short windows can scroll. |
| Queue state | Expansion survives switching between stacked and wide layouts and failed background refreshes. A new game starts a new disclosure session. Round events invalidate the queue through the existing shared SignalR subscription. |
| Disclosure | The centered summary's arrow follows the native `open` attribute in controlled and uncontrolled modes. Keyboard and focus behavior remain native. |
| Modifier activation | Successful bodyless responses complete the command without a false error. Rejected commands retain their HTTP status and details for existing error handling. |
| Cleanup | Removed the unused promotion of a button-only texture recipe into the shared theme. Existing text-style failures were corrected mechanically without changing document meaning. |

## Regression coverage

- Responsive board and queue scenarios, keyboard expansion and retained state after resizing.
- Zero, positive, negative and absent queue scores; failed initial requests and failed refreshes.
- Backend score aggregation, cancelled-round exclusion and returning a scored team to the queue.
- Bodyless modifier activation success, retry after failure and preserved 403/409/500 errors.
- Shared lifecycle subscription cleanup and immediate queue invalidation on round changes.

## Commit boundaries

1. `chore(style): use ASCII hyphens in project text`: mechanical punctuation corrections in documentation and pagination translations.
2. `fix(game-modifiers): accept bodyless activation responses`: API adapter, command response tests and the activation/retry browser assertions.
3. `feat(game-board): show live team scores beside the centered board`: board geometry, compact queue, shared disclosure/matrix support, server calculation/contract, generated types, translations, realtime invalidation, tests and the updated UI contract.

The modifier and board changes share the browser test file and should be staged by
hunk. Keep each behavior's tests with its implementation. The local agent rules are
intentionally ignored by Git and are not part of these commits.

## Verification

| Check | Result |
| --- | --- |
| Frontend full gate | Passed formatting, TypeScript, ESLint, four-locale validation, architecture guards, coverage, Knip and the production build. All 487 tests in 106 files passed; statement coverage was 86.49%. The final gate includes the realtime review fix. |
| Backend full gate | Locked restore, formatting verification and Release build passed with no build warnings or errors. All 819 tests passed with no skips, including isolated PostgreSQL persistence tests. |
| Database model | EF reported no pending model changes. |
| Contracts | OpenAPI validation passed. Two consecutive transport generations produced identical artifacts; only the intended nullable score property changed in generated types. |
| Browser suite | 164 scenarios passed in installed Chrome. This includes protected application/invitation screenshot comparisons and separate production-bundle CSP/reconnect checks. No reference snapshots were updated. |
| Performance scenario | The one opt-in scenario skipped by the ordinary browser run was run separately and passed. Ten production-bundle dialog/scroll cycles at 390x640 took 2925 ms, including 156 ms of script execution and 14 ms of layout. This is a diagnostic measurement, not evidence of a before/after speedup or a board load test. |
| Instructions and text | Both changed project skills passed their validator. Text-style and whitespace checks passed. |

Fresh populated board screenshots were inspected at 390, 768 and 1440 pixels;
active-round screenshots were inspected at 320 and 1440 pixels. Cards, category
headers, score rows and the responsive context rail were readable in these
scenarios. Automated coverage additionally exercises widths from 320 to 2560,
short windows, long names, keyboard/touch interaction and responsive queue state.

The broad browser suite still logs MUI warnings for empty select fixtures,
SignalR negotiation failures in fixtures without a hub mock and ResizeObserver
notifications in leaderboard layout scenarios. Those logs were not suppressed;
the passing suite does not establish an application-wide clean console. They
remain outside this board/modifier change. Most browser scenarios use fixture
HTTP/WebSocket responses rather than a live backend; backend behavior is covered
separately by integration tests. Remote CI, image publication and deployment were
not run during local commit preparation.
