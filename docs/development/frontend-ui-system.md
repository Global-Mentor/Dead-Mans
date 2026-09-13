# Frontend UI system

The frontend keeps the Hunt-inspired visual language in one MUI + Emotion system. A page chooses
semantic variants and owns layout; it does not restyle a child control because that child happens to
be inside a particular container.

## Ownership boundaries

| Layer                   | Owns                                                                                         | Does not own                                         |
| ----------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Tokens                  | palette, typography, the small spacing/control-height scale, material textures               | page-specific geometry or one-off offsets            |
| MUI component style     | the visual identity and states of buttons, inputs, chips, alerts, menus and overlays         | feature layout                                       |
| Shared primitive        | a named surface/control contract and its slots                                               | hidden styling of arbitrary descendants              |
| Shared pattern/feedback | composition, spacing between parts, focus/async behaviour                                    | recolouring buttons or fields supplied by the caller |
| Feature/page            | grid/flex layout, responsive placement, external spacing and genuinely unique domain visuals | a second implementation of a shared visual variant   |

The source locations are:

- `src/shared/theme/tokens.ts`, `hunt-palette.ts` and `hunt-materials.ts` for tokens and materials;
- `src/app/theme/*-overrides.ts` for shared MUI component states;
- `src/shared/ui/primitives` for controls and surfaces;
- `src/shared/ui/patterns` and `src/shared/ui/feedback` for compositions;
- `features/<feature>/theme` only for feature-specific board/media geometry.

## Buttons and actions

Use `AppButton` for an action and `AppLinkButton` for navigation. `AppLinkButton` renders an actual
link and has the same visual contract as a button.

| `tone`            | Meaning                                               |
| ----------------- | ----------------------------------------------------- |
| `primary`         | save, continue or the main positive action            |
| `secondary`       | neutral alternative/cancel action with the worn frame |
| `danger`          | destructive or negative action                        |
| `dangerSecondary` | lower-emphasis destructive action                     |
| `ghost`           | low-emphasis neutral action                           |
| `warningGhost`    | low-emphasis warning action                           |
| `success`         | explicit successful/ready action                      |

Meaning is always supplied explicitly; never infer a tone from the label or DOM position. Use
`size="small"` for compact toolbars, the default for normal forms, and `size="large"` for paired
accented-dialog actions. Default, hover, active, keyboard focus, disabled and loading are defined in
the shared theme. `loading` also exposes `aria-busy`.

An `IconButton` may stay a direct MUI control when it is genuinely icon-only. It still inherits the
global focus indicator and must have an accessible name.

## Surfaces and disclosure

`SectionCard` is the ordinary content surface:

| `surface`  | Use                                                |
| ---------- | -------------------------------------------------- |
| `panel`    | normal textured section                            |
| `inset`    | nested/recessed content, without the paper texture |
| `accented` | deliberately highlighted card                      |
| `plain`    | neutral base for a feature-supplied status colour  |

Use `borderStyle="dashed"` only for a semantic placeholder/drop-zone boundary. Do not recreate the
surface background, texture, border and shadow together in a page `sx` block.

Use `AppAccordion` plus `AppAccordionSummary` for disclosure sections. `surface` chooses panel,
inset or plain disclosure; `tone="warning"` is the explicit warning variant. The shared summary owns
the MUI summary slot spacing and expand affordance.

## Fields

`FormTextField` is the standard text/multiline control. `density="compact"` changes density;
`textAlign="center"` is an independent alignment choice. Its validation tooltip remains connected to
the real input and native validity handling. `FormSelect` preserves caller `SelectProps` while adding
the supplied accessible name. `ControlledFormTextField` remains the React Hook Form adapter.

Autocomplete `renderInput` callbacks may use MUI `TextField` directly because MUI supplies required
params and ARIA wiring through that slot. Board setup cells may address `.MuiInputBase-*` locally:
their fixed matrix geometry is not an ordinary form density and must not broaden the global field
contract.

## Dialogs

`AppDialog` owns title/content/action composition and offers one `appearance`:

- `standard` for forms and ordinary messages;
- `accented` for the agreed high-emphasis confirmations, with divided sections and equal grid slots;
- `preview` for large card/media previews.

Callers provide ready `AppButton` actions. The dialog may arrange or stretch action slots, but it must
not select and repaint descendant buttons. `ConfirmDialog` adds duplicate-confirm protection, busy
close protection, loading state and explicit confirm/cancel tones. Failed async operations stay in the
same mounted dialog so the parent retains entered data and error state.

Do not pass `PaperProps` to `AppDialog`; add an intentional `appearance` only when composition and
overlay behaviour genuinely differ. Page-level `sx` on a dialog is for placement/size adjustments,
not a second button or surface theme.

## Headings, HTML and accessibility

`PageShell` composes page layout presets through `mergeSx`. `SectionHeader` renders a semantic
`header`; select `headingLevel="h1"` for the page title and the appropriate lower level for nested
sections while keeping the visual Typography variant independent.

Prefer native `main`, `section`, `article`, lists, tables, links and buttons. Do not put tooltips or
other focusable controls inside an accordion-summary button. Decorative diamonds/textures must be
`aria-hidden` or pseudo-elements and must not receive pointer events. MUI portals are expected: font,
focus and surface rules must therefore come from the theme/CssBaseline rather than a selector below
`#root`.

## Local `sx`

Good local uses are `gap`, grid definitions, responsive direction/placement, outer margins, truncation
that depends on a particular data column, and a value computed from feature data. Local slot access is
acceptable only in the component that owns that slot or for documented special geometry such as the
game setup matrix.

Do not use local `sx` to copy a complete shared surface/control, target another component's arbitrary
descendants, add `!important`, or raise specificity with `&&`. Compose object, callback and array
forms through `mergeSx`; later arguments win and arrays are flattened once.

## Adding a variant

Before adding a flag, identify at least one semantic role and its consumers. Extend the narrowest
existing contract, add state/DOM tests, migrate real consumers, and remove the superseded local
implementation. Avoid a universal component whose flags describe unrelated features.

For visual development, run the app and open the unlinked development-only route
`/panel/__ui-states`. It covers surfaces, button states/sizes, fields, selection, disclosure and an
accented dialog. `npm run check:ui-architecture` protects the concrete boundaries found in the 2026
audit. `npm run measure:ui` builds and profiles the explicit production-bundle modal/scroll scenario;
set `PERF_LABEL` to keep named reports under `.tmp/ui-audit`.
