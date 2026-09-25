# Frontend UI system

## Design contract

The application page is the visual reference for the shared component system. The [requirements](frontend-ux-ui-unification-prompt.md#согласованные-уточнения--23-сентября-2026) define its scope; the [migration review](../reviews/frontend-ui-composition-migration.md) records component replacements and verification.

- Extract reusable visual primitives and complete compositions from the protected application page. Preserve its appearance and functionality, including indirect theme effects. Refactoring and responsive improvements must preserve that contract.
- Reuse the existing suitable component exactly. Add a component only when no suitable one exists; add variants only for demonstrated semantic or behavioral needs. Page-specific legacy styling is not such a need.
- Pages own placement and available space. Standalone compositions own their internal layout, may reorder/stretch children, and select supported sizes and tones. They do not independently redefine a ready child control's visual design. Wrapping old markup does not complete migration.
- Width changes do not imply font scaling. A genuine size/density change coordinates text, icons, padding and gaps inside the component with readable text and usable interaction targets. Prefer reflow and intended wrapping to shrinking labels to fit. Implement responsive behavior once in the owning component.
- Delete superseded implementations and unused styles, exports, imports, dependencies and migration-only adapters after checking usage. Audit all composed presentation, not only interactive-control imports. Domain geometry is not an exemption for legacy surface styling.
- Completion requires a component replacement map plus source, visual and behavior checks across routes, states, roles and viewports, while retaining the protected application comparisons.

All application controls are composed through `src/shared/ui/index.ts`. MUI/Emotion is the implementation engine, not a second public control library. The language remains Alegreya typography, dark textured surfaces, brass accents and clear semantic actions. Application registration is a protected visual reference.

## Board scope and existing responsive work

“Game board” means only the board cards and their arrangement, not the entire `/panel/game-board` page. The site header and the component above the board are separate components. All three already contain responsive work by the owner: inspect and reuse it where appropriate, or improve/rework it when justified. They may remain standalone components; unlike application registration, their current presentation is not a protected visual reference. This does not exempt their controls or surfaces from the shared component system, legacy cleanup, or preservation of existing functionality and game semantics.

## Ownership and boundaries

| Owner | Responsibility |
| --- | --- |
| `shared/theme` | Palette, typography, control scale, materials, surface and side-panel tokens |
| `shared/ui/primitives/<family>` | Control appearance, internal slots, interaction and focus states; family theme overrides live beside implementations |
| `shared/ui/feedback` | Dialog composition, confirmations, notices, progress and help |
| `shared/ui/patterns` | Layout, navigation, lists, tables and reusable compositions |
| `shared/game-ui` | Reusable domain presentation: board matrix, participants, played cards, round score breakdown |
| Features | API/data, permissions, business state, translated labels, ordering and domain geometry |
| `app/theme/component-overrides.ts` | Assembles family overrides and the base document/material theme |

A page may use Box, Stack, Typography, icons, Collapse, ClickAwayListener and theme hooks as layout/implementation utilities. Interactive controls come from the common library. Do not add a feature-specific button, input, menu, dialog or badge implementation. First reuse a suitable existing component; introduce a common variant only for a demonstrated need that composition cannot satisfy, migrate consumers, and remove the superseded implementation. Generic shared UI must not import features, API, auth or game UI.

Page `sx` owns placement and external spacing. A component owns its internals. Do not reach into `.MuiDialog-*`, repaint supplied child buttons, copy surface recipes or append selector overrides to fix a variant. Shared theme files are the single source of corresponding MUI states. Board/card visuals may own domain geometry; this does not authorize a separate form theme.

`npm run check:ui-architecture` checks these boundaries, an explicit MUI foundation allowlist (including aliases/subpaths/re-exports and namespace/dynamic import restrictions), native controls outside the library, and control-slot/descendant-button repainting. These checks supplement source review; they do not prove visual or behavioral correctness. Its rule fixtures run before the repository scan.

## Component map and variants

| Family | Public components and contract |
| --- | --- |
| Buttons | `AppButton`, `AppLinkButton`, `ActionIcon`, `SurfaceButton` |
| Fields | `FormTextField`, `ControlledFormTextField`, `FormNumberField`, `ControlledFormNumberField`, `FieldGroup`, `FieldAdornment`, `FieldWithHelp`, `FilePickerInput` |
| Selection | `FormSelect`, `Combobox`, `FormCheckbox`, `FormSwitch`, `ChoiceLabel`, `ChoiceGroup`, `CheckboxGroup`, `ChoiceCard`, `SelectionTile`, `SelectionAction` |
| Surfaces/disclosure | `SectionCard`, `ItemCard`, `SectionDivider`, `AppAccordion`, `AppAccordionSummary`, `AppAccordionDetails` |
| Status/metrics | `StatusBadge`, `NotificationCount`, `Metric`, `SummaryMetrics`, `RankBadge` |
| Media | `ImageFrame` with loading/error states, contain/cover sizing and decorative backgrounds |
| Feedback | `InlineNotice`, `BusyIndicator`, `TaskProgress`, `HelpTooltip`, `FieldHelp`, `AppToast`, `PageStatePanel`, `CenteredProgress` |
| Dialogs | `AppDialog`, `ConfirmDialog`, `DiscardChangesDialog`, `useDirtyClose` |
| Layout | `PageShell`, `SectionHeader`, `AuthScreenShell`, `FormSection`, `SidePanel`, `DisclosureSection`, `NativeDisclosure`, `CatalogWorkspace` |
| Navigation | `SectionNavigation`, `PanelTrigger`, `NavigationButton`, `ActionMenu`, `ActionMenuItem`, `MenuGroupLabel`, `TabStrip`, `TabOption`, `ContentTabs`, `PagePagination` |
| Data/composition | `AsyncSection`, `ContentList`, `BulletList`, `RecordRow`, `RankingList`, `DataTable`, `DataTableRow`, `DataTableCell`, `SelectionRow` |

### Actions

`AppButton` uses explicit `tone`: primary, secondary, danger, dangerSecondary, ghost, warningGhost or success. `brand="twitch"` owns the provider sign-in appearance. Meaning must not depend on translated text or DOM position. `AppLinkButton` is an actual link with the same visual contract. `loading` exposes busy state; disable other actions that would invalidate a pending operation.

`ActionIcon` requires `aria-label`, defaults to a 44px target, and supports plain/framed/outlined appearance. `SurfaceButton` provides button semantics, keyboard focus and polymorphic link support for domain tiles. `NavigationButton` owns route/compact/profile/management/icon layout and active styling. It replaces the old layout-local navigation style recipes.

### Forms and selection

`FormTextField` supports standard/compact `density`, start/center `textAlign`, standard/matrixColumn/matrixRow `layout`, native validity and explicit `validationHint`. Helper and caller-provided descriptions remain attached to the actual input. Use `ControlledFormTextField` with React Hook Form. `FormSelect` supports normal and native select values and accessible naming. `Combobox` preserves autocomplete generics and uses `FormTextField` for its input slot.

`FieldGroup` owns the label, helper and fieldset composition; `labelAppearance` is standard/overline. `FieldWithHelp` combines any ready field and focus/touch help. `FormSection` is the protected application section: a framed surface, shared heading/separator, optional action, description, controls and content. It is reused by application, modifier lists, queue sections and catalogue forms. `FilePickerInput` owns the visually hidden file input used by a visible upload action.

`FormCheckbox` defaults to a comfortable target. `density="compact"` is a shared density option used by the application. `SelectionTile` is a real pressed-state button, not a clickable Box. `SelectionAction` adds success/error outcomes that remain readable when disabled. `ChoiceCard` and radio groups preserve their native selection semantics.

Mark required fields visibly. For schema-driven forms use `noValidate` and display schema errors through fields; for native validation preserve the field validity contract. Keep values mounted through errors, background refresh and viewport changes. Dirty forms use `useDirtyClose`; busy forms cannot close. A record identity change must reset its draft, while refresh of the same record must preserve edited values.

### Surfaces, navigation and data

`SectionCard` surfaces are panel, inset, accented, plain and muted. Muted is the readiness surface extracted from the application. `ItemCard` is the application team-card surface, with none/available/selected emphasis. Selectable records share that same visual recipe; they do not maintain another striped-card theme. Dashed borders are for a semantic placeholder. `AppAccordion` has panel/inset/plain surfaces and a warning tone. `DisclosureSection` is the application team-group composition: labelled trigger, decorative marker, stateful chevron and collapsible content. It supports controlled or local expansion, optional description/count and explicit expand/collapse labels; its appearance is shared by registration, catalogue tools, history and modifier administration. `NativeDisclosure` provides lightweight native details/summary, optional controlled expansion and pinned desktop content.

`ContentTabs` keeps panels mounted and connects tabs/panels with IDs. It is used to distinguish team and quiz rankings. `TabStrip` provides underline/framed/category appearances. `CatalogWorkspace` places tools first in DOM, to the right on desktop, and in a disclosure before the mobile results list. `RecordRow` moves actions below content on narrow screens.

`DataTable` retains the same row DOM while switching table/card presentation at the breakpoint; resizing cannot discard a role draft. `RankingList` renders accessible table rows and wrapping names. Callers own sorting and format values; the common component never calculates a score. `Metric` uses description-list semantics with a named group/status, optional keyboard/touch help, description and action. `SummaryMetrics` preserves the protected application count strip. `BulletList` preserves its participant-list geometry. `SectionNavigation` owns the existing sticky mobile shortcuts. Zero, missing data and a failed request remain distinct.

`StatusBadge` wraps by default; standard/compact density is explicit. `textFlow="singleLine"` preserves protected registration geometry where required. Do not infer a status from colour alone.

### Dialogs and asynchronous states

`AppDialog` uses the protected application dialog appearance everywhere. It owns title, content, actions and paper styling; `maxWidth` and `fullScreen` preserve space for editors and media previews, while `contentDensity` is comfortable or compact. Supplied buttons retain their own tones. Consumers may configure transition callbacks, but may not replace the dialog's visual slots. MUI supplies focus trapping/restoration and Escape handling. Use `SidePanel` for a full-height drawer with a fixed header, one scroll region, safe-area sizing and a labelled close action.

`ConfirmDialog` protects against repeated confirmation and closing while busy. The caller owns mutation errors and closes only after success. `DiscardChangesDialog` uses shared localized copy with `useDirtyClose`.

`InlineNotice` has standard/inline appearances and uses an alert for errors and a status for other messages. `HelpTooltip` supports keyboard and touch, including controlled validation hints in `FormTextField`. Use it for explanatory hover text instead of a native `title`; omit redundant hints when the complete text is already visible. `AsyncSection` distinguishes first loading/error from refresh failure: `hasData` retains the mounted content when a refresh fails; supply `retryAction` when a retry is available.

## Examples

An ordinary form (the caller owns validation, values and save state):

```tsx
import { AppButton, FormSection, FormTextField, InlineNotice } from '../../shared/ui'

<form noValidate onSubmit={handleSubmit(save)}>
  <FormSection title={t('editor.title')}>
    <FormTextField
      label={t('editor.name')}
      required
      value={name}
      onChange={(event) => setName(event.target.value)}
      error={Boolean(nameError)}
      helperText={nameError ?? t('editor.nameHint')}
      disabled={saving}
    />
    {saveError && <InlineNotice severity="error">{saveError}</InlineNotice>}
    <AppButton type="submit" loading={saving}>{t('common.actions.save')}</AppButton>
  </FormSection>
</form>
```

An explicit destructive confirmation:

```tsx
<ConfirmDialog
  open={confirmOpen}
  title={t('teams.removeTitle')}
  description={t('teams.removeDescription', { name: team.name })}
  confirmLabel={t('teams.remove')}
  cancelLabel={t('common.actions.cancel')}
  confirmTone="danger"
  isBusy={removeMutation.isPending}
  onClose={() => setConfirmOpen(false)}
  onConfirm={async () => {
    await removeMutation.mutateAsync(team.id)
    setConfirmOpen(false)
  }}
/>
```

Translation keys in examples are illustrative; production keys live in the four locale dictionaries. Render the mutation error in the owning view/dialog and retain its target identity. Do not report success optimistically for a failed operation.

## Protected reference and verification

`/panel/game-application` uses the common components with explicit density and text-flow options. Its agreed layout, wording and interaction remain unchanged. There are 45 baseline images for nine application states at five viewports and 20 invitation/search images at four widths. Baselines use fixed fixtures, time, locale and loaded fonts; comparisons use `maxDiffPixels: 0`. The owner-approved compact global header was incorporated on 24 September 2026. Before that update, all 65 original image comparisons passed with only the four header/navigation modules restored to their previous versions in an isolated test server, verifying that application content was preserved. Do not update these baselines to accept a refactor regression.

Run `npm --prefix frontend run check`, `npm --prefix frontend run test:e2e`, and `npm --prefix frontend run measure:ui` for substantial heavy-surface changes. The state gallery is development-only. Production tests verify it cannot enter the user build. See [verification matrix](../reviews/frontend-ui-composition-migration.md) for the actual run results, artifacts and device limitations.

## Interaction and state contracts

- `PanelTrigger` owns inline, floating edge and responsive edge appearances. `responsiveEdge` uses left/right tabs at `lg` and normal 44px actions below it. `GameBoardLayout` arranges regions; it no longer repaints nested buttons. Do not pass a local `sx` recipe to the trigger.
- `SelectionRow` is a full-width wrapping button with `selected` / `aria-pressed`, a visible selection marker and keyboard focus. Use it for archive records, modifier revisions and team choices; keep list data and ordering in the feature.
- `StatusBadge appearance="plain"` is unframed metadata. `ActionIcon appearance="outlined"` owns bounded reorder/navigation actions. Modifier activation actions use the standard 44px button instead of a separate 32px recipe.
- `FormSelect appearance="toolbar"` owns compact toolbar geometry and border treatment, including the locale selector. `FormSelect` resolves native mode at its owned select slot, so callback slots and mixed legacy/modern props produce the same native options and label association. The select slot itself belongs to the component. `FormTextField` combines native constraints with HTML-input slots and describes the actual custom helper-text ID.
- `SidePanel` exposes a named modal dialog and associated description. Side panels and dialogs suppress transition duration under reduced motion; common action buttons suppress their colour transitions.
- A draft belongs to a record/editing session. Round modifier inputs rebase by stable group/member identity, never array index; refreshed metadata stays authoritative. Changed membership/resolution kind resets that input contract. Closing the round editor also ends its discard-confirmation session. Category editors are keyed by category ID.
- Successful role mutations update every cached page with the returned user before refreshing. A refresh error must not visually undo the confirmed save or discard another user's draft.

```tsx
<PanelTrigger placement="responsiveEdge" side="left" aria-label={openLabel}
  aria-expanded={open} aria-controls={open ? panelId : undefined} onClick={openPanel}>
  {label}
</PanelTrigger>
<SelectionRow selected={selectedId === item.id} onClick={() => select(item.id)}>
  {item.label}
</SelectionRow>
```

## Surface checks

The architecture check also rejects local corner-radius recipes in features, layouts and shared game compositions; circles for intrinsic marks and the common theme radius remain valid. This is a guard against one concrete regression, not proof of complete visual migration. The preserved site header, board cards and board context remain independently owned responsive compositions. No page-specific compact-button variant was added.

## Game board compositions

- `ImageFrame` owns image loading/failure and resets on source changes. Card backgrounds are decorative and fail silently; preview and setup images show localized feedback. Consumers own the frame geometry, while the shared component owns the image fit and visibility. Media messages belong to the common locale bundle.
- `FormNumberField` composes the existing text field and action buttons for integer quantities. Manual input remains editable, including an empty value; native/schema validation remains authoritative. Step actions respect the current minimum/maximum and do not submit the form. `ControlledFormNumberField` integrates those edits with React Hook Form dirty tracking and reset. Use these fields for board result counts and manual quiz point adjustments.
- `TeamIdentity` shares team name, roster and a status slot between queue cards, the active team and compact selection rows. Features provide translated names/statuses and keep ordering and actions; the shared content does not depend on API types.
- The round assistant renders the flow model as a read-only sequence inside `NativeDisclosure`. Player-facing phase labels describe the current state: active team selection, card selection, card opened, modifier selection, game preparation, gameplay and result summary. The management panel keeps imperative actions separate: start modifier selection, close ordering, start the game, finish gameplay and open the result form in that order. Modifier selection appears to players only after the start action succeeds.
- Round result sections use `FormSection` and existing `Metric`/`RoundScoreBreakdown` presentations. Team selection and manual point adjustment use `AsyncSection` so background errors retain available content.
- `GameBoardCard` owns current-round media and the two-line played result. Card proportions stay at 2:3; `ViewportBoard` fits available space while preserving minimum readable widths. Wide matrices switch to category navigation when the container becomes too narrow. Short viewports scroll the page, while a standard desktop 5×5 board fits without scrolling.
- `GameBoardLayout` centers the cards themselves, accounting for the row-price gutter, and keeps the horizontal status bar aligned with them above the board. The team queue has its own `/panel/game-team-queue` page in primary navigation.
- `/panel/game-round` is a distinct view of the active game, linked directly after Board in the primary navigation. `RoundOverview` reads the authoritative active round, board cell and modifier state; the modifier drawer reuses the existing feature controls. Successfully opening a new card navigates only the staff client that submitted the command to the current round; other clients stay on the board and refresh the opened card from server state. The round screen has no direct modifier-ordering action. Admins use the edge management petal to start modifier ordering; moderators and players do not see that petal on this screen. Any user can open the round manually from its open card, the phase control or the primary navigation; other revealed cards retain their preview. `GameQuizDrawer` follows players on either game view, including between rounds, and reuses the existing answer card. Modifier ordering and an open quiz cannot display their drawers simultaneously.
- `GameModifierActions` owns purchase/cancellation confirmation for both the modifier page and the round drawer. Failed requests preserve the dialog and explain the error; the current game, round, availability and purchase ownership remain authoritative. A different round or closed ordering ends the confirmation session. `RoundModifierDrawer` starts a fresh disclosure session when ordering reopens.
- The round ordering drawer shows the available catalog as compact rows with name, cost, activation and a details dialog. The dialog holds descriptions, limits, conflicts, activators and cancellation of the user's own purchases. Standard mobile and desktop viewports fit the current catalog without scrolling; shorter screens retain the panel's accessible scroll fallback.
- `PlayerQuizCard` composes `CurrentQuizCard`; `useSubmitQuizAnswer` shares pending submissions and cache refresh between the quiz page and game drawers. The question petal appears while a question is open and disappears when that session closes. Expired questions disable answers while the common query waits for the server result.
- Board and round views retain cached content through refresh errors. Their shared realtime composition refreshes the active round and modifier state on reconnect. Navigation labels live in the eager navigation dictionary, independent of route translation bundles.
