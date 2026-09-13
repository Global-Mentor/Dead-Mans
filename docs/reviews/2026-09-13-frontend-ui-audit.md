# Frontend UI and HTML audit — 2026-09-13

## Scope and baseline

The audit started from commit `3d49a1c3ebabe3b4eaf601248300c435510e4f03` with a clean working
tree and no repository-local `AGENTS.md`. The inspected production frontend contained 686 `sx=`
attributes in 104 TSX files and one tracked CSS file. Those figures describe the search area; reducing
them was never the objective. After the migration there are 676 attributes in 108 files, including
the new dev-only gallery and shared primitives.

Baseline unit/type/lint/coverage/build checks passed before editing (83 files, 380 tests; 86.37%
statements, 88.50% branches, 87.80% functions, 86.53% lines). Browser baseline screenshots were
captured with deterministic Game Application data at 1440, 390 and existing 320 widths. No production
mutation was performed.

## Page map and verification depth

All 14 configured panel routes were inspected statically and traversed by the four-locale typography
test: game board, leaderboard, application, modifiers, quiz, game history, modifier history, setup,
admin modifiers, admin questions, modifier catalog, question catalog, team registrations and role
administration.

Filled browser fixtures cover the agreed Game Application flow at 1440×1000, 390×1000, 320×700 and
390×600; team management; question-catalog editing under production CSP; modifier-form validation;
and game-board realtime reconnect. Filled component tests cover the main board, setup, modifier,
history, registration and administration states. The typography route sweep deliberately uses empty
API responses, so it proves route/font/portal behaviour but not the visual correctness of every filled
page. Dedicated filled desktop/mobile screenshots are still absent for several older routes; this is
listed as a limitation rather than represented as complete visual coverage.

## Style-source and migration map

| Source / family                                         | Consumers reviewed                                                                             | Confirmed issue                                                                     | Implemented decision                                                                                                                         |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| global `MuiPaper` plus `huntPanelSx` plus `SectionCard` | all Paper-derived panels, menus, popovers, dialogs, toast/alerts                               | three competing owners of texture/background/border                                 | global Paper keeps shape only; `SectionCard.surface` exclusively owns content surfaces; overlay components keep their scoped overlay surface |
| `AppDialog` descendant button selectors                 | confirmation/form actions in application, setup, board and catalogs                            | the same secondary button changed inside a dialog; worn material duplicated         | neutral worn style moved to `MuiButton.outlinedPrimary`; dialog only lays out actions                                                        |
| `SectionCard.inset` and `variantStyle`                  | setup, registration, application, board                                                        | overlapping booleans admitted unclear combinations                                  | `surface` union (`panel`, `inset`, `accented`, `plain`) plus orthogonal `borderStyle`                                                        |
| `AppDialog.accented`, `dividers`, consumer `PaperProps` | My Team confirms, finish/preview/dev dialogs                                                   | invalid combinations and page-owned Paper internals                                 | `appearance` union (`standard`, `accented`, `preview`); preview styling lives in the dialog implementation                                   |
| four feature accordion implementations                  | history, management panel, modifier runtime/catalog, finish calculations                       | repeated borders, background, shadow, pseudo-element reset and summary slot spacing | `AppAccordion` and `AppAccordionSummary` with semantic surface/tone/density                                                                  |
| local modifier `SelectionCard`                          | modifier activation/impact steps                                                               | duplicate of shared `ChoiceCard`                                                    | migrated to `ChoiceCard`, removed duplicate implementation                                                                                   |
| direct ordinary MUI `TextField`/`Button`/`Paper`        | role/history search, registration dialogs, safety/quiz controls, modifier reasons, finish note | shared states and ARIA could diverge                                                | migrated to shared primitives; direct TextField remains only in Autocomplete render slots                                                    |
| hand-written `sx` array expansion and unsafe cast       | SectionCard, FormTextField, AppDialog, PageShell                                               | different precedence and nested-array behaviour                                     | typed `mergeSx` accepts object/callback/array, flattens entries and preserves source order                                                   |
| visual Typography variant used as heading contract      | page headers                                                                                   | visual role and HTML hierarchy were coupled/implicit                                | `SectionHeader.headingLevel`; page titles explicitly render `h1`                                                                             |
| Snackbar descendant `.MuiPaper-root` rule               | toast/Alert portal                                                                             | broad container-to-descendant override existed only to undo global Paper decoration | removed with the global Paper decoration; Alert owns feedback appearance                                                                     |

The remaining local `.MuiInputBase-*` rules are the fixed game-setup matrix geometry. Remaining
`.MuiChip-label` rules are feature-specific wrapping/truncation for history, board and long catalog
answers. These are intentional slot-level exceptions, not competing global component skins.

## HTML and accessibility findings

- `MainLayout` already rendered the panel content as `main`; this was preserved.
- Page headers now have explicit `h1` semantics while their visual variants remain unchanged.
- A focusable tooltip wrapper nested inside an AccordionSummary button was removed. The summary now
  carries the accessible description and the glyph is presentational.
- Link actions render as anchors through `AppLinkButton`; regular actions remain buttons. A regression
  test prevents nested/incorrect button rendering.
- Decorative dialog diamonds and button texture layers ignore pointer input and do not add accessible
  content.
- The gallery browser test rejects nested interactive elements, verifies horizontal overflow at
  1440/390/320 and 390 px at 125% scale, checks all EN/RU/UK/PL locales, and verifies Escape plus focus
  restoration. MUI retains the focus trap.
- `ConfirmDialog` blocks duplicate confirm calls, disables both actions while awaiting a promise and
  prevents busy dismissal. Parent-owned mutation errors/data remain mounted.
- Form labels/helper text continue through MUI's native ARIA associations; `FormSelect` no longer
  discards caller input props when it adds an accessible name.

No wrapper was removed merely to lower the `div` count. Layout/focus/portal wrappers with an actual
role were retained.

## Intentional visual differences

The Game Application layout, orange own-team highlight, diamonds, red withdraw/disband semantics and
responsive structure are preserved. The visible intentional changes are shared-system corrections:

- a neutral secondary/cancel button now has the same worn frame inside and outside dialogs;
- ordinary panels retain their texture, while inset/plain surfaces no longer inherit it accidentally;
- older feature accordions use consistent borders, spacing and disclosure glyphs;
- toast/Alert surfaces no longer receive then cancel a generic Paper texture;
- standard ConfirmDialog cancel actions are neutral secondary rather than context-dependent ghost
  actions; accented paired actions keep equal large slots.

Local artifacts are under `.tmp/ui-audit`: `baseline/application-1440.png` compared with
`after/application-1440.png`, and additional after screenshots for 390, 320, short viewport, dialog
states and `gallery-*`.

## Production performance profile

Chromium profiled the built bundles at 390×640. Each sample performed ten deterministic open/cancel
dialog transitions plus bottom/top scroll cycles. Values below are medians of three sequential local
runs; the baseline bundle was built from the starting commit while the same Playwright scenario served
both bundles.

| Metric                    | Baseline median | After median | Direction |
| ------------------------- | --------------: | -----------: | --------: |
| wall time                 |       3229.8 ms |    3184.5 ms |     −1.4% |
| CDP task duration         |         0.693 s |      0.863 s |    +24.4% |
| CDP script duration       |         0.183 s |      0.189 s |     +3.4% |
| CDP style duration        |         0.105 s |      0.159 s |    +51.4% |
| CDP layout duration       |        0.0160 s |     0.0169 s |     +5.4% |
| layout count              |              89 |           90 |        +1 |
| style recalculation count |             460 |          593 |    +28.9% |
| traced paint              |         84.6 ms |      69.5 ms |    −17.9% |

This does **not** prove an overall performance improvement. Wall time and paint improved slightly, but
task/style work regressed in this synthetic scenario; JS heap deltas were too GC-sensitive to treat as
a stable comparison. The agreed filters, blend modes, backdrop filter and fixed body texture were
therefore retained rather than removed based on assumption. The JSON inputs are
`.tmp/ui-audit/{baseline,baseline-2,baseline-3,after,after-2,after-3}-performance.json` and the reusable
scenario is `frontend/e2e/ui-performance.spec.ts`.

## Architecture enforcement and remaining limits

`scripts/check-ui-architecture.mjs` parses TypeScript syntax/objects and protects the concrete failure
modes found here: removed SectionCard props, consumer PaperProps on AppDialog, decorative global
MuiPaper styles, Snackbar-to-Paper selectors and AppDialog-to-Button selectors. It intentionally does
not ban MUI, local `sx` or all slot selectors.

The dev-only, unlinked `/panel/__ui-states` gallery is tree-shaken from production and gives the next
feature a ready set of surfaces, buttons, fields, selection cards, disclosure and dialog composition.
Remaining risks are the local style-cost regression above and the lack of filled browser screenshots
for every older route. Visual review should therefore continue feature by feature; these limitations do
not justify a second styling layer.
