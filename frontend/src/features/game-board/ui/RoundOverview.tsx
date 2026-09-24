import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type {
  GameBoardCell,
  GameBoardSnapshot,
  GameModifierState,
} from '../../../shared/api/contracts/index.ts'
import type { components } from '../../../shared/api/contracts/generated'
import { resolveBackendMediaUrl } from '../../../shared/api/media-url.ts'
import { TeamIdentity } from '../../../shared/game-ui/index.ts'
import {
  AppButton,
  AsyncSection,
  FormSection,
  ImageFrame,
  ItemCard,
  StatusBadge,
} from '../../../shared/ui/index.ts'
import { groupActiveGameModifiers } from '../../game-modifiers/model/game-modifier-groups.ts'
import { formatTeamNameWithFallback } from '../../game-registration/model/team-name.ts'
import { buildGameManagementFlow } from '../model/game-management-flow.ts'

type GameRoundDetails = components['schemas']['GameRoundDetailsDto']

export function RoundOverview({
  snapshot,
  round,
  cell,
  modifiers,
  modifiersLoading,
  modifiersError,
  onRetryModifiers,
}: {
  snapshot: GameBoardSnapshot
  round: GameRoundDetails
  cell: GameBoardCell | null
  modifiers: GameModifierState | null
  modifiersLoading: boolean
  modifiersError: boolean
  onRetryModifiers: () => void
}) {
  const { t, i18n } = useTranslation()
  const flow = buildGameManagementFlow(snapshot, round)
  const currentStep = flow.steps.find((step) => step.state === 'current')
  const active =
    modifiers?.gameId === round.gameId
      ? modifiers.activeModifiers.filter((item) => item.roundId === round.roundId)
      : []
  const groups = groupActiveGameModifiers(active, i18n.resolvedLanguage)
  const mediaUrl = resolveBackendMediaUrl(cell?.media[0]?.url)
  const cardTitle =
    cell?.title?.trim() || round.cellTitle?.trim() || t('gameBoard.roundSummaryCardFallback')

  return (
    <Stack spacing={1.5} data-testid="current-round-overview">
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Typography component="h1" variant="h5">
          {t('navigation.items.gameRound.label')}
        </Typography>
        <StatusBadge
          color="primary"
          label={currentStep ? t(currentStep.titleKey) : t(flow.summaryKey)}
        />
      </Stack>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) minmax(0, 1fr)' },
          gap: 1.5,
          alignItems: 'start',
        }}
      >
        <FormSection title={t('gameBoard.currentRoundScreen.card')}>
          <Stack spacing={1.25}>
            {mediaUrl ? (
              <ImageFrame
                src={mediaUrl}
                alt={cardTitle}
                loadingLabel={t('common.media.loading')}
                errorLabel={t('common.media.error')}
                fit="contain"
                sx={{ aspectRatio: '2 / 3', maxHeight: 'min(44vh, 420px)' }}
              />
            ) : null}
            <Typography variant="h6" sx={{ overflowWrap: 'anywhere' }}>
              {cardTitle}
            </Typography>
            {cell?.description || round.cellDescription ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
              >
                {cell?.description || round.cellDescription}
              </Typography>
            ) : null}
            <StatusBadge label={t('gameBoard.cellCostLabel', { cost: round.baseScore })} />
          </Stack>
        </FormSection>
        <Stack spacing={1.5}>
          <FormSection title={t('gameBoard.currentRoundScreen.team')}>
            <TeamIdentity
              name={formatTeamNameWithFallback(
                round.teamName,
                t('common.teamWithSlot', { slot: round.teamSlotIndex }),
              )}
              participants={round.participants.map((participant) => participant.displayName)}
              emptyLabel={t('gameBoard.roundSummaryNoParticipants')}
            />
          </FormSection>
          <FormSection title={t('gameBoard.currentRoundScreen.modifiers')}>
            <AsyncSection
              isLoading={modifiersLoading}
              isError={modifiersError}
              hasData={modifiers !== null}
              isEmpty={groups.length === 0}
              loadingMessage={t('gameModifiers.loading')}
              errorMessage={t('gameModifiers.errorLoading')}
              emptyMessage={t(
                modifiers ? 'gameBoard.currentRoundScreen.noModifiers' : 'gameModifiers.noGame',
              )}
              retryAction={
                <AppButton size="small" onClick={onRetryModifiers}>
                  {t('common.actions.retry')}
                </AppButton>
              }
            >
              <Stack spacing={0.75} component="ul" sx={{ m: 0, p: 0 }}>
                {groups.map((group) => (
                  <ItemCard key={group.modifierId} component="li" sx={{ listStyle: 'none' }}>
                    <Stack
                      direction="row"
                      spacing={1}
                      justifyContent="space-between"
                      flexWrap="wrap"
                    >
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{ overflowWrap: 'anywhere' }}
                      >
                        {group.modifierName}
                      </Typography>
                      <StatusBadge
                        color="success"
                        label={t('gameModifiers.activeGroupCount', {
                          count: group.activationsCount,
                        })}
                      />
                    </Stack>
                  </ItemCard>
                ))}
              </Stack>
            </AsyncSection>
          </FormSection>
        </Stack>
      </Box>
    </Stack>
  )
}
