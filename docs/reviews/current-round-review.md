# Current-round frontend review

Reviewed on 24 September 2026. Scope: the uncommitted current-round screen, board navigation, player drawers, translations, realtime wiring and associated tests. Backend contracts and protected application controls were not changed.

## Corrections

- Moved the new navigation label out of a lazy feature dictionary. A direct visit to another panel route now has the translated round link before the board loads.
- Kept cached board/round content mounted on failed background requests, with retry feedback. This also preserves the board's observation of new rounds and the user's intentional return to the board.
- Matched round data to its game before rendering or enabling modifier actions. Delayed activation errors cannot patch a subsequent game's cache.
- Replaced duplicate purchase/cancellation handling with one feature composition. Confirmation awaits the request, retains errors for retry, checks current availability and ownership, and resets when its round or ordering session ends. Empty server error bodies have a safe localized fallback.
- Reused the quiz card and answer mutation across the quiz page and player drawers. Pending answers stay protected across navigation. Closing a question preserves its result; expiry disables answers and refreshes until the server result arrives. Modifier ordering suspends the quiz drawer.
- Added round/modifier refresh on hub reconnect and removed the extra modifier subscription from the round route.
- Removed the superseded round-only quiz panel, realtime wrapper, unused activation entry point and duplicate title translations.

## Component ownership

| Composition | Existing components reused | Responsibility |
| --- | --- | --- |
| `GameRoundPage` | `PageShell`, `PageStatePanel`, `InlineNotice`, `AppLinkButton` | Queries, phase selection, placement and recovery |
| `RoundOverview` | `FormSection`, `TeamIdentity`, `ImageFrame`, `ItemCard`, `StatusBadge`, `AsyncSection` | Card, roster and current-round modifier presentation |
| `RoundModifierDrawer` | `SidePanel`, `PanelTrigger`, `AsyncSection` | One ordering phase and its disclosure state |
| `RoundModifierPanel` | `Metric`, existing available/active modifier sections, `GameModifierActions` | Round filtering and composition |
| `GameModifierActions` | `ConfirmDialog`, `InlineNotice`, `AppToast` | Shared purchase/cancellation lifecycle |
| `GameQuizDrawer` / `PlayerQuizCard` | `SidePanel`, `PanelTrigger`, `CurrentQuizCard` | Question-session disclosure and shared answer submission |

No new generic control or visual variant was needed. New compositions select existing control APIs and own layout; they do not repaint child controls or introduce local radius recipes. The changed production-source audit found no temporary stubs, TODO markers or generator attribution.

## Protected application reference

Compared all 65 application/invitation reference images against their copies from before the review. The 11 changed images differ only in the authorized desktop navigation labels, within rows 7–50. Image dimensions and all pixels below the header are identical; the other 54 images are unchanged. Updated only those 11 references. Exact screenshot comparison remains enabled with `maxDiffPixels: 0`.

## Verification

Regression coverage includes manual current-card navigation for viewers and staff, player-only automatic navigation, explicit return to the board, failed purchase/retry, preserved quiz results, phase priority, retained content after a failed refresh, cold-route navigation translations, reconnect resynchronization and delayed mutation failure isolation.

- `npm --prefix frontend run check`: passed; 105 test files / 469 tests, format, TypeScript, ESLint, four-locale parity, hardcoded-text scan, UI architecture checks, Knip and production build.
- `npm --prefix frontend run test:e2e`: 136 passed; the separately invoked performance scenario was the only skipped test. Includes the 65 protected image comparisons, all panel routes in four languages, responsive layouts, keyboard/touch interactions and production CSP checks.
- After adding the final purchase lock during background synchronization: TypeScript, focused ESLint/format checks and all three affected round purchase/refresh browser scenarios passed again.
- `npm --prefix frontend run measure:ui`: passed on the final production bundle. At 390×640, ten application dialog/scroll cycles took 2,774.591 ms; measured script time was 134.627 ms, layout 12.138 ms, style recalculation 107.778 ms. This is the existing application benchmark, not a dedicated current-round benchmark or a cross-device performance guarantee. Local raw output: `.tmp/ui-audit/measurement-performance.json`.
- `git diff --check`: passed.

Browser checks use controlled API and realtime fixtures in Chromium. They verify frontend behavior, not a live multi-user backend deployment. Physical-device and other-browser checks are outside this run.
