# Overlay UI unification · 25 September 2026

`/panel/game-application` remains the visual reference. Its team-name editor and confirmation supplied the dialog treatment; its help tooltip and toast supplied the other overlay contracts.

| Interaction | Shared owner | Coverage |
| --- | --- | --- |
| Informational, editor and media dialogs | `AppDialog` | Board, current round, leaderboard, registration, quiz, setup, catalogues and development gallery. All now use the application treatment. `maxWidth`, `fullScreen` and `contentDensity` express layout needs without alternate visual skins. |
| Destructive/action confirmations | `ConfirmDialog`, `DiscardChangesDialog` | Application, board, setup, registration, modifier purchase, catalogues and administration. Both compose `AppDialog`; confirm actions use its large-button layout. |
| Short help and validation hints | `HelpTooltip`, `FieldHelp` | Application, board, registration, modifier controls and form fields. `FormTextField` no longer renders a raw MUI tooltip. Native explanatory hints on board controls, the quiz history timestamp and inherited roles also use the shared owner. `TabOption` routes its title through `HelpTooltip` so keyboard focus reaches it. |
| Transient notices, anchored menus and full-height panels | `AppToast`, `ActionMenu`, `SidePanel` | Their distinct interaction and placement remain in shared owners; features do not construct another snackbar, menu or drawer. |

The unused `standard` and `preview` dialog skins and their call-site switches were removed. The application dialog is the only modal-window appearance. Wide editor dialogs respect the requested maximum width and viewport margins; mobile media/editor dialogs retain their full-screen layout. Dialog content controls keep their own tones and states.

The [complete work review](frontend-work-review-2026-09-25.md) records verification commands, results, inspected viewports and remaining coverage limits. Application reference images were not changed.
