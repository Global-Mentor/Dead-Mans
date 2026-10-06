import { Box } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { GameModifierState } from '../../../shared/api/contracts/index.ts'
import {
  ParticipantNamesList,
  RoundBriefingPanel,
  RoundBriefingDivider,
} from '../../../shared/game-ui/index.ts'
import { AppButton, Metric, SectionDivider, StatusReadout } from '../../../shared/ui/index.ts'

interface ModifierStatusBarProps {
  state: GameModifierState
  currentTeamLabel: string
  currentTeamParticipantNames: readonly string[]
  currentTeamParticipantsEmptyLabel: string
  activeCardLabel: string
  canOpenActiveCard: boolean
  onOpenActiveCard: () => void
}

const summaryCellSx = {
  minWidth: 0,
  py: 0.5,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
} as const

const pairedColumnSx = {
  minWidth: 0,
  display: 'grid',
  gridTemplateRows: 'minmax(0, 1fr) auto minmax(0, 1fr)',
} as const

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
    <RoundBriefingPanel
      component="section"
      aria-label={t('gameModifiers.summaryTitle')}
      sx={{ px: 1, py: 0 }}
    >
      <Box
        data-testid="modifier-summary-row"
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 1,
          alignItems: 'stretch',
          '@media (min-width: 1000px)': {
            gridTemplateColumns:
              'minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr)',
          },
        }}
      >
        <Box sx={pairedColumnSx}>
          <Box data-testid="modifier-ordering-cell" sx={summaryCellSx}>
            <StatusReadout
              density="compact"
              label={t('gameModifiers.orderingStatusLabel')}
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
          </Box>
          <RoundBriefingDivider />
          <Box data-testid="modifier-round-spent-cell" sx={summaryCellSx}>
            <Metric
              appearance="summary"
              density="compact"
              emphasis="label"
              label={t('gameModifiers.summaryRoundSpentPoints')}
              value={t('gameModifiers.myPointsValue', { points: activeRoundSpentPoints })}
              help={t('gameModifiers.summaryRoundSpentPointsTooltip')}
            />
          </Box>
        </Box>
        <SectionDivider
          orientation="vertical"
          flexItem
          sx={{ display: { xs: 'none' }, '@media (min-width: 1000px)': { display: 'block' } }}
        />
        <Box sx={pairedColumnSx}>
          <Box data-testid="modifier-available-points-cell" sx={summaryCellSx}>
            <Metric
              appearance="summary"
              density="compact"
              label={t('gameModifiers.summaryAvailablePoints')}
              emphasis="label"
              value={t('gameModifiers.myPointsValue', { points: state.availableQuizPoints })}
              help={t('gameModifiers.summaryAvailablePointsTooltip')}
            />
          </Box>
          <RoundBriefingDivider />
          <Box data-testid="modifier-personal-spent-cell" sx={summaryCellSx}>
            <Metric
              appearance="summary"
              density="compact"
              emphasis="label"
              label={t('gameModifiers.summarySpentPoints')}
              value={t('gameModifiers.myPointsValue', { points: state.spentQuizPoints })}
              help={t('gameModifiers.summarySpentPointsTooltip')}
            />
          </Box>
        </Box>
        <SectionDivider
          orientation="vertical"
          flexItem
          sx={{ display: { xs: 'none' }, '@media (min-width: 1000px)': { display: 'block' } }}
        />
        <RoundBriefingDivider
          sx={{ gridColumn: '1 / -1', '@media (min-width: 1000px)': { display: 'none' } }}
        />
        <Box sx={{ ...summaryCellSx, '@media (max-width: 359px)': { gridColumn: '1 / -1' } }}>
          <Metric
            appearance="summary"
            density="compact"
            label={t('gameModifiers.summaryCurrentTeam')}
            value={currentTeamLabel}
            help={t('gameModifiers.summaryCurrentTeamTooltip')}
            description={
              <ParticipantNamesList
                names={currentTeamParticipantNames}
                emptyLabel={currentTeamParticipantsEmptyLabel}
                variant="body2"
                direction="column"
                dense
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
        <Box
          sx={{
            ...(canOpenActiveCard ? pairedColumnSx : summaryCellSx),
            '@media (max-width: 359px)': { gridColumn: '1 / -1' },
          }}
        >
          <Box sx={summaryCellSx}>
            <Metric
              appearance="summary"
              density="compact"
              label={t('gameModifiers.summaryActiveCard')}
              value={activeCardLabel}
              help={t('gameModifiers.summaryActiveCardTooltip')}
            />
          </Box>
          {canOpenActiveCard ? (
            <>
              <RoundBriefingDivider />
              <Box data-testid="modifier-preview-action" sx={summaryCellSx}>
                <AppButton
                  tone="secondary"
                  size="small"
                  aria-label={`${t('gameModifiers.previewCardAction')}: ${activeCardLabel}`}
                  onClick={onOpenActiveCard}
                >
                  {t('gameModifiers.previewCardAction')}
                </AppButton>
              </Box>
            </>
          ) : null}
        </Box>
      </Box>
    </RoundBriefingPanel>
  )
}
