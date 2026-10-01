import { Box, Stack } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { GameModifierState } from '../../../shared/api/contracts/index.ts'
import {
  ParticipantNamesList,
  RoundBriefingPanel,
  RoundBriefingDivider,
} from '../../../shared/game-ui/index.ts'
import { AppButton, Metric, SectionDivider } from '../../../shared/ui/index.ts'

interface ModifierStatusBarProps {
  state: GameModifierState
  currentTeamLabel: string
  currentTeamParticipantNames: readonly string[]
  currentTeamParticipantsEmptyLabel: string
  activeCardLabel: string
  canOpenActiveCard: boolean
  onOpenActiveCard: () => void
}

export function ModifierStatusBar({
  state,
  currentTeamLabel,
  currentTeamParticipantNames,
  currentTeamParticipantsEmptyLabel,
  activeCardLabel,
  canOpenActiveCard,
  onOpenActiveCard,
}: ModifierStatusBarProps) {
  const { t } = useTranslation()
  const activeRoundSpentPoints = state.activeModifiers.reduce(
    (total, activation) => total + activation.activationCost,
    0,
  )

  return (
    <RoundBriefingPanel component="section" aria-label={t('gameModifiers.summaryTitle')}>
      <Box
        data-testid="modifier-summary-row"
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 2,
          alignItems: 'start',
          '@media (min-width: 1000px)': {
            gridTemplateColumns:
              'minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr)',
          },
        }}
      >
        <Stack spacing={1.5} sx={{ minWidth: 0 }}>
          <Metric
            appearance="summary"
            label={t('gameModifiers.summaryTitle')}
            value={
              state.isOrderingOpen
                ? t('gameModifiers.orderingOpen')
                : t('gameModifiers.orderingClosed')
            }
            tone={state.isOrderingOpen ? 'success' : 'error'}
            help={
              state.isOrderingOpen
                ? t('gameModifiers.summaryOrderingStatusTooltip')
                : t('gameModifiers.orderingClosedSummary')
            }
          />
          <RoundBriefingDivider />
          <Metric
            appearance="summary"
            label={t('gameModifiers.summaryRoundSpentPoints')}
            value={t('gameModifiers.myPointsValue', { points: activeRoundSpentPoints })}
            help={t('gameModifiers.summaryRoundSpentPointsTooltip')}
          />
        </Stack>
        <SectionDivider
          orientation="vertical"
          flexItem
          sx={{ display: { xs: 'none' }, '@media (min-width: 1000px)': { display: 'block' } }}
        />
        <Stack spacing={1.5} sx={{ minWidth: 0 }}>
          <Metric
            appearance="summary"
            label={t('gameModifiers.summaryAvailablePoints')}
            emphasis="result"
            value={t('gameModifiers.myPointsValue', { points: state.availableQuizPoints })}
            help={t('gameModifiers.summaryAvailablePointsTooltip')}
          />
          <RoundBriefingDivider />
          <Metric
            appearance="summary"
            label={t('gameModifiers.summarySpentPoints')}
            value={t('gameModifiers.myPointsValue', { points: state.spentQuizPoints })}
            help={t('gameModifiers.summarySpentPointsTooltip')}
          />
        </Stack>
        <SectionDivider
          orientation="vertical"
          flexItem
          sx={{ display: { xs: 'none' }, '@media (min-width: 1000px)': { display: 'block' } }}
        />
        <RoundBriefingDivider
          sx={{ gridColumn: '1 / -1', '@media (min-width: 1000px)': { display: 'none' } }}
        />
        <Box sx={{ minWidth: 0, '@media (max-width: 359px)': { gridColumn: '1 / -1' } }}>
          <Metric
            appearance="summary"
            label={t('gameModifiers.summaryCurrentTeam')}
            value={currentTeamLabel}
            help={t('gameModifiers.summaryCurrentTeamTooltip')}
            description={
              <ParticipantNamesList
                names={currentTeamParticipantNames}
                emptyLabel={currentTeamParticipantsEmptyLabel}
                variant="body1"
                direction="column"
                decorated
              />
            }
          />
        </Box>
        <SectionDivider
          orientation="vertical"
          flexItem
          sx={{ display: { xs: 'none' }, '@media (min-width: 1000px)': { display: 'block' } }}
        />
        <Box sx={{ minWidth: 0, '@media (max-width: 359px)': { gridColumn: '1 / -1' } }}>
          <Metric
            appearance="summary"
            label={t('gameModifiers.summaryActiveCard')}
            value={activeCardLabel}
            action={
              canOpenActiveCard ? (
                <Stack spacing={1.5} sx={{ width: '100%', alignItems: 'center' }}>
                  <RoundBriefingDivider />
                  <AppButton
                    tone="secondary"
                    size="medium"
                    aria-label={`${t('gameModifiers.previewCardAction')}: ${activeCardLabel}`}
                    onClick={onOpenActiveCard}
                  >
                    {t('gameModifiers.previewCardAction')}
                  </AppButton>
                </Stack>
              ) : null
            }
            help={t('gameModifiers.summaryActiveCardTooltip')}
          />
        </Box>
      </Box>
    </RoundBriefingPanel>
  )
}
