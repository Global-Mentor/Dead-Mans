import { Box, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { GameModifierState } from '../../../shared/api/contracts/index.ts'
import { ParticipantNamesList } from '../../../shared/game-ui/index.ts'
import {
  AppButton,
  FieldAdornment,
  FormSection,
  FormTextField,
  Metric,
} from '../../../shared/ui/index.ts'

interface ModifierStatusBarProps {
  state: GameModifierState
  search: string
  onSearchChange: (value: string) => void
  currentTeamLabel: string
  currentTeamParticipantNames: readonly string[]
  currentTeamParticipantsEmptyLabel: string
  activeCardLabel: string
  canOpenActiveCard: boolean
  onOpenActiveCard: () => void
}

export function ModifierStatusBar({
  state,
  search,
  onSearchChange,
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
    <FormSection title={t('gameModifiers.summaryTitle')}>
      <Box
        data-testid="modifier-summary-row"
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            sm: 'repeat(4, minmax(0, 1fr))',
          },
          gap: 0.75,
          '@media (min-width: 1100px)': {
            gridTemplateColumns: '1.15fr repeat(3, minmax(105px, 0.8fr)) 1.65fr 1.45fr',
          },
        }}
      >
        <Metric
          label={t('gameModifiers.summaryTitle')}
          value={
            state.isOrderingOpen
              ? t('gameModifiers.orderingOpen')
              : t('gameModifiers.orderingClosed')
          }
          tone={state.isOrderingOpen ? 'success' : 'error'}
          description={
            state.isOrderingOpen ? null : (
              <Typography variant="body2" color="text.secondary">
                {t('gameModifiers.orderingClosedSummary')}
              </Typography>
            )
          }
          help={t('gameModifiers.summaryOrderingStatusTooltip')}
        />
        <Metric
          label={t('gameModifiers.summaryAvailablePoints')}
          emphasis="result"
          value={t('gameModifiers.myPointsValue', { points: state.availableQuizPoints })}
          help={t('gameModifiers.summaryAvailablePointsTooltip')}
        />
        <Metric
          label={t('gameModifiers.summarySpentPoints')}
          value={t('gameModifiers.myPointsValue', { points: state.spentQuizPoints })}
          help={t('gameModifiers.summarySpentPointsTooltip')}
        />
        <Metric
          label={t('gameModifiers.summaryRoundSpentPoints')}
          value={t('gameModifiers.myPointsValue', { points: activeRoundSpentPoints })}
          help={t('gameModifiers.summaryRoundSpentPointsTooltip')}
        />
        <Metric
          label={t('gameModifiers.summaryCurrentTeam')}
          value={currentTeamLabel}
          help={t('gameModifiers.summaryCurrentTeamTooltip')}
          description={
            <ParticipantNamesList
              names={currentTeamParticipantNames}
              emptyLabel={currentTeamParticipantsEmptyLabel}
              variant="caption"
              direction="row"
            />
          }
        />
        <Metric
          label={t('gameModifiers.summaryActiveCard')}
          value={activeCardLabel}
          help={t('gameModifiers.summaryActiveCardTooltip')}
          action={
            canOpenActiveCard ? (
              <AppButton tone="ghost" size="small" onClick={onOpenActiveCard}>
                {t('common.actions.viewCard')}
              </AppButton>
            ) : null
          }
        />
      </Box>

      <FormTextField
        value={search}
        label={t('common.modifiers.searchLabel')}
        onChange={(event) => onSearchChange(event.target.value)}
        slotProps={{
          input: {
            endAdornment: search ? (
              <FieldAdornment position="end">
                <AppButton tone="ghost" size="small" onClick={() => onSearchChange('')}>
                  {t('gameModifiers.clearSearch')}
                </AppButton>
              </FieldAdornment>
            ) : null,
          },
        }}
        sx={{ mt: 0.75 }}
      />
    </FormSection>
  )
}
