import { Box, Stack, useMediaQuery } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameBoardCell, GameModifierState } from '../../shared/api/contracts/index.ts'
import { useAuth } from '../../shared/auth/use-auth.ts'
import {
  AppButton,
  FieldAdornment,
  FormTextField,
  FormSelect,
  TabStrip,
  TabOption,
  InlineNotice,
  PageShell,
  PageStatePanel,
} from '../../shared/ui/index.ts'
import { currentGameBoardQueryOptions, GameQuizDrawer } from '../game-board/index.ts'
import { GameBoardCardPreviewDialog } from '../game-board/ui/GameBoardCardPreviewDialog.tsx'
import { formatTeamNameWithFallback } from '../game-registration/model/team-name.ts'
import { activeGameRoundQueryOptions } from '../game-rounds/api/game-rounds-queries.ts'
import { gameModifierStateQueryOptions } from './api/game-modifier-queries.ts'
import {
  groupActiveGameModifiers,
  groupAvailableGameModifiers,
} from './model/game-modifier-groups.ts'
import { deriveModifierRoundSummaryMeta } from './model/modifier-round-summary.ts'
import { modifierCategoryCodes, type ModifierCategoryCode } from './model/modifier-categories.ts'
import { matchesModifierSearch } from './model/modifier-search.ts'
import { ActiveModifiersSection } from './ui/ActiveModifiersSection.tsx'
import { AvailableModifiersSection } from './ui/AvailableModifiersSection.tsx'
import { ModifierRuntimePanel } from './ui/ModifierRuntimePanel.tsx'
import { ModifierStatusBar } from './ui/ModifierStatusBar.tsx'
import { GameModifierActions } from './ui/GameModifierActions.tsx'
import { useModifierViewport } from './use-modifier-viewport.ts'

export function GameModifiersPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage
  const { user } = useAuth()
  const stateQuery = useQuery(gameModifierStateQueryOptions)
  const snapshotQuery = useQuery(currentGameBoardQueryOptions)
  const activeRoundQuery = useQuery(activeGameRoundQueryOptions)
  const { pageRef, sectionsGridRef, toolsRef } = useModifierViewport()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<ModifierCategoryCode | 'all'>('all')
  const [selectedPanel, setSelectedPanel] = useState('available')
  const wide = useMediaQuery('(min-width: 1000px)')
  const panelId = useId()
  const [previewCell, setPreviewCell] = useState<GameBoardCell | null>(null)
  const state: GameModifierState | null = stateQuery.data ?? null
  const snapshot = snapshotQuery.data ?? null
  const activeRound =
    activeRoundQuery.data?.gameId === snapshot?.gameId ? (activeRoundQuery.data ?? null) : null
  const activeCard = activeRound
    ? (snapshot?.cells.find((cell) => cell.id === activeRound.cellId) ?? null)
    : null
  const isEmpty = !stateQuery.isLoading && !stateQuery.isError && state == null
  const availableDefinitionsById = useMemo(
    () => new Map(state?.availableModifiers.map((item) => [item.modifier.id, item.modifier]) ?? []),
    [state],
  )
  const modifierNamesById = useMemo(() => {
    const names = new Map(
      state?.availableModifiers.map((item) => [item.modifier.id, item.modifier.name]) ?? [],
    )

    for (const activeModifier of state?.activeModifiers ?? []) {
      names.set(activeModifier.modifierId, activeModifier.modifierName)
    }

    return names
  }, [state])
  const activeModifierIds = useMemo(
    () => new Set(state?.activeModifiers.map((item) => item.modifierId) ?? []),
    [state?.activeModifiers],
  )
  const filteredAvailableModifiers = useMemo(
    () =>
      (state?.availableModifiers ?? []).filter(
        (availability) =>
          (category === 'all' || availability.modifier.category === category) &&
          matchesModifierSearch(
            availability.modifier,
            search,
            [
              t(`common.modifiers.categories.${availability.modifier.category}`),
              t(`gameCatalog.modifiers.wizard.kinds.${availability.modifier.behaviorV2.kind}`),
              t(
                `gameCatalog.modifiers.roundSummaryType.${
                  deriveModifierRoundSummaryMeta(availability.modifier).type
                }`,
              ),
              availability.modifier.behaviorV2.requiresHostMonitoring
                ? t('gameModifiers.hostControlTag')
                : '',
            ],
            locale,
          ),
      ),
    [category, locale, search, state?.availableModifiers, t],
  )
  const availableGroups = state
    ? groupAvailableGameModifiers(filteredAvailableModifiers, locale)
    : []
  const activeGroups = useMemo(
    () => groupActiveGameModifiers(state?.activeModifiers ?? [], locale),
    [locale, state?.activeModifiers],
  )
  const hasSearch = search.trim().length > 0 || category !== 'all'
  const hasAdminPanel = user?.roles.includes('admin') ?? false
  const currentTeamLabel = activeRoundQuery.isLoading
    ? t('gameModifiers.summaryContextLoading')
    : activeRoundQuery.isError
      ? t('gameModifiers.summaryContextUnavailable')
      : activeRound
        ? formatTeamNameWithFallback(
            activeRound.teamName,
            t('common.teamWithSlot', { slot: activeRound.teamSlotIndex }),
          )
        : t('gameModifiers.summaryNoCurrentTeam')
  const currentTeamParticipantNames =
    activeRound?.participants.map((participant) => participant.displayName) ?? []
  const currentTeamParticipantsEmptyLabel = activeRoundQuery.isLoading
    ? t('gameModifiers.summaryContextLoading')
    : activeRoundQuery.isError
      ? t('gameModifiers.summaryContextUnavailable')
      : t('gameModifiers.summaryNoParticipants')
  const activeCardLabel =
    activeRoundQuery.isLoading || (activeRound !== null && snapshotQuery.isLoading)
      ? t('gameModifiers.summaryContextLoading')
      : activeRoundQuery.isError || (activeRound !== null && snapshotQuery.isError)
        ? t('gameModifiers.summaryContextUnavailable')
        : activeRound
          ? activeCard?.title?.trim() || t('gameModifiers.summaryUntitledCard')
          : t('gameModifiers.summaryNoActiveCard')

  if (stateQuery.isLoading || (stateQuery.isError && !state) || isEmpty) {
    return (
      <PageStatePanel
        title={t('common.entities.modifiers')}
        message={t(
          stateQuery.isLoading
            ? 'gameModifiers.loading'
            : stateQuery.isError
              ? 'gameModifiers.errorLoading'
              : 'gameModifiers.noGame',
        )}
        showSpinner={stateQuery.isLoading}
        tone={stateQuery.isError ? 'error' : 'default'}
        actions={
          stateQuery.isError ? (
            <AppButton onClick={() => void stateQuery.refetch()}>
              {t('common.actions.retry')}
            </AppButton>
          ) : undefined
        }
      />
    )
  }

  return (
    <GameModifierActions
      state={state}
      roundId={activeRound?.status === 'awaiting_modifiers' ? activeRound.roundId : null}
      disabled={
        stateQuery.isError ||
        activeRoundQuery.isError ||
        snapshotQuery.isError ||
        stateQuery.isFetching ||
        activeRoundQuery.isFetching ||
        snapshotQuery.isFetching ||
        state?.gameId !== snapshot?.gameId ||
        activeRound?.status !== 'awaiting_modifiers'
      }
    >
      {(actions) => (
        <PageShell
          ref={pageRef}
          data-testid="game-modifiers-page"
          sx={{
            maxWidth: 1440,
            width: { xs: '100%', md: hasAdminPanel ? 'calc(100% - 72px)' : '100%' },
            mx: 'auto',
            p: { xs: 0, md: 0 },
            maxHeight: 'var(--modifier-page-height)',
            overflowY: 'auto',
            minHeight: 0,
          }}
        >
          {state ? (
            <>
              {stateQuery.isError ? (
                <InlineNotice
                  severity="warning"
                  action={
                    <AppButton size="small" onClick={() => void stateQuery.refetch()}>
                      {t('common.actions.retry')}
                    </AppButton>
                  }
                >
                  {t('gameModifiers.errorLoading')}
                </InlineNotice>
              ) : null}
              <ModifierStatusBar
                state={state}
                currentTeamLabel={currentTeamLabel}
                currentTeamParticipantNames={currentTeamParticipantNames}
                currentTeamParticipantsEmptyLabel={currentTeamParticipantsEmptyLabel}
                activeCardLabel={activeCardLabel}
                canOpenActiveCard={activeCard !== null}
                onOpenActiveCard={() => {
                  if (activeCard) {
                    setPreviewCell(activeCard)
                  }
                }}
              />

              <ModifierRuntimePanel
                key={`${activeRound?.roundId ?? 'none'}:${activeRound?.roundVersion ?? 0}:${activeRound?.serverNowUtc ?? 'unsynced'}`}
                round={activeRound}
                isOffline={activeRoundQuery.isError || snapshotQuery.isError}
              />

              <Box sx={{ mt: 1.5, display: wide ? 'none' : 'block' }}>
                <TabStrip
                  value={selectedPanel}
                  onChange={(_, value: string) => setSelectedPanel(value)}
                  variant="fullWidth"
                  aria-label={t('common.entities.modifiers')}
                >
                  <TabOption
                    value="available"
                    id={`${panelId}-available-tab`}
                    aria-controls={`${panelId}-available-panel`}
                    label={t('gameModifiers.catalogTab')}
                  />
                  <TabOption
                    value="active"
                    id={`${panelId}-active-tab`}
                    aria-controls={`${panelId}-active-panel`}
                    label={t('gameModifiers.activeTab', { count: state.activeModifiers.length })}
                  />
                </TabStrip>
              </Box>
              <Box
                ref={sectionsGridRef}
                data-testid="modifier-sections-grid"
                sx={{
                  mt: 1.5,
                  display: 'grid',
                  gridTemplateAreas: '"panel"',
                  gridTemplateColumns: 'minmax(0, 1fr)',
                  gap: 2,
                  alignItems: 'start',
                  '--modifier-panel-header-height': '0px',
                  '@media (min-width: 1000px)': {
                    '--modifier-panel-header-height':
                      'calc(var(--modifier-tools-height, 56px) + 12px)',
                    gridTemplateAreas: '"available active"',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  },
                }}
              >
                <Box
                  id={`${panelId}-available-panel`}
                  role={wide ? undefined : 'tabpanel'}
                  aria-labelledby={wide ? undefined : `${panelId}-available-tab`}
                  hidden={!wide && selectedPanel !== 'available'}
                  sx={{
                    gridArea: 'panel',
                    minWidth: 0,
                    '@media (min-width: 1000px)': { gridArea: 'available' },
                  }}
                >
                  <AvailableModifiersSection
                    tools={
                      <Stack ref={toolsRef} direction={{ xs: 'column', sm: 'row' }} gap={1.25}>
                        <FormTextField
                          value={search}
                          label={t('common.modifiers.searchLabel')}
                          onChange={(event) => setSearch(event.target.value)}
                          sx={{ flex: 1, minWidth: 0 }}
                          slotProps={{
                            input: {
                              endAdornment: search ? (
                                <FieldAdornment position="end">
                                  <AppButton
                                    tone="ghost"
                                    size="small"
                                    onClick={() => setSearch('')}
                                  >
                                    {t('gameModifiers.clearSearch')}
                                  </AppButton>
                                </FieldAdornment>
                              ) : null,
                            },
                          }}
                        />
                        <FormSelect
                          value={category}
                          label={t('gameModifiers.categoryFilter')}
                          onChange={setCategory}
                          options={[
                            { value: 'all', label: t('gameModifiers.allCategories') },
                            ...modifierCategoryCodes.map((value) => ({
                              value,
                              label: t(`common.modifiers.categories.${value}`),
                            })),
                          ]}
                          sx={{ width: { xs: '100%', sm: 210 }, flexShrink: 0 }}
                        />
                      </Stack>
                    }
                    groups={availableGroups}
                    modifierNamesById={modifierNamesById}
                    activeModifierIds={activeModifierIds}
                    hasSearch={hasSearch}
                    isBusy={actions.isBusy}
                    pendingModifierId={actions.pendingModifierId}
                    onActivate={actions.requestActivation}
                  />
                </Box>
                <Box
                  id={`${panelId}-active-panel`}
                  role={wide ? undefined : 'tabpanel'}
                  aria-labelledby={wide ? undefined : `${panelId}-active-tab`}
                  hidden={!wide && selectedPanel !== 'active'}
                  sx={{
                    gridArea: 'panel',
                    minWidth: 0,
                    '@media (min-width: 1000px)': { gridArea: 'active' },
                  }}
                >
                  <ActiveModifiersSection
                    groups={activeGroups}
                    activationsCount={state.activeModifiers.length}
                    definitionsById={availableDefinitionsById}
                    currentUserId={user?.id ?? null}
                    canSelfCancel={state.isOrderingOpen}
                    isCancelling={actions.isBusy}
                    onSelfCancel={actions.requestSelfCancel}
                  />
                </Box>
              </Box>
            </>
          ) : null}

          <GameBoardCardPreviewDialog
            cell={previewCell}
            playResult={{ round: null, isLoading: false, isError: false }}
            onClose={() => setPreviewCell(null)}
          />
          {snapshot?.status === 'active' ? (
            <GameQuizDrawer
              gameId={snapshot.gameId}
              side="left"
              showForManagers
              suspended={actions.isConfirming}
            />
          ) : null}
        </PageShell>
      )}
    </GameModifierActions>
  )
}
