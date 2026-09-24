import { Box, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameBoardCell, GameModifierState } from '../../shared/api/contracts/index.ts'
import { useAuth } from '../../shared/auth/use-auth.ts'
import { AppButton, InlineNotice, PageShell, PageStatePanel } from '../../shared/ui/index.ts'
import { currentGameBoardQueryOptions } from '../game-board/index.ts'
import { GameBoardCardPreviewDialog } from '../game-board/ui/GameBoardCardPreviewDialog.tsx'
import { formatTeamNameWithFallback } from '../game-registration/model/team-name.ts'
import { activeGameRoundQueryOptions } from '../game-rounds/api/game-rounds-queries.ts'
import { gameModifierStateQueryOptions } from './api/game-modifier-queries.ts'
import {
  groupActiveGameModifiers,
  groupAvailableGameModifiers,
} from './model/game-modifier-groups.ts'
import { deriveModifierRoundSummaryMeta } from './model/modifier-round-summary.ts'
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
  const sectionsGridRef = useModifierViewport()
  const [search, setSearch] = useState('')
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
      (state?.availableModifiers ?? []).filter((availability) =>
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
    [locale, search, state?.availableModifiers, t],
  )
  const availableGroups = state
    ? groupAvailableGameModifiers(filteredAvailableModifiers, locale)
    : []
  const activeGroups = useMemo(() => {
    if (!state) {
      return []
    }

    return groupActiveGameModifiers(state.activeModifiers, locale).filter((group) => {
      const definition = availableDefinitionsById.get(group.modifierId)
      if (!definition) {
        return group.modifierName
          .toLocaleLowerCase(locale)
          .includes(search.trim().toLocaleLowerCase(locale))
      }

      return matchesModifierSearch(
        definition,
        search,
        [
          t(`common.modifiers.categories.${definition.category}`),
          t(`gameCatalog.modifiers.wizard.kinds.${definition.behaviorV2.kind}`),
          t(
            `gameCatalog.modifiers.roundSummaryType.${deriveModifierRoundSummaryMeta(definition).type}`,
          ),
          definition.behaviorV2.requiresHostMonitoring ? t('gameModifiers.hostControlTag') : '',
        ],
        locale,
      )
    })
  }, [availableDefinitionsById, locale, search, state, t])
  const hasSearch = search.trim().length > 0
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
          data-testid="game-modifiers-page"
          sx={{
            maxWidth: 1800,
            width: { xs: '100%', md: hasAdminPanel ? 'calc(100% - 72px)' : '100%' },
            ml: { xs: 0, md: 'auto' },
            mr: { xs: 0, md: hasAdminPanel ? 9 : 0 },
            px: { xs: 0, sm: 0 },
          }}
        >
          <Typography
            component="h1"
            sx={{
              position: 'absolute',
              width: '1px',
              height: '1px',
              p: 0,
              m: -1,
              overflow: 'hidden',
              clipPath: 'inset(50%)',
              whiteSpace: 'nowrap',
            }}
          >
            {t('common.entities.modifiers')}
          </Typography>

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
                search={search}
                onSearchChange={setSearch}
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

              <Box
                ref={sectionsGridRef}
                data-testid="modifier-sections-grid"
                sx={{
                  mt: 1,
                  display: 'grid',
                  gridTemplateAreas: { xs: '"available" "active"' },
                  gridTemplateColumns: 'minmax(0, 1fr)',
                  gap: 1,
                  alignItems: 'start',
                  '@media (min-width: 1000px)': {
                    gridTemplateAreas: '"available active"',
                    gridTemplateColumns: 'minmax(0, 1.42fr) minmax(280px, 0.78fr)',
                  },
                }}
              >
                <Box sx={{ gridArea: 'available', minWidth: 0 }}>
                  <AvailableModifiersSection
                    groups={availableGroups}
                    modifierNamesById={modifierNamesById}
                    activeModifierIds={activeModifierIds}
                    hasSearch={hasSearch}
                    isBusy={actions.isBusy}
                    pendingModifierId={actions.pendingModifierId}
                    onActivate={actions.requestActivation}
                  />
                </Box>
                <Box sx={{ gridArea: 'active', minWidth: 0 }}>
                  <ActiveModifiersSection
                    groups={activeGroups}
                    activationsCount={state.activeModifiers.length}
                    definitionsById={availableDefinitionsById}
                    currentUserId={user?.id ?? null}
                    canSelfCancel={state.isOrderingOpen}
                    isCancelling={actions.isBusy}
                    hasSearch={hasSearch}
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
        </PageShell>
      )}
    </GameModifierActions>
  )
}
