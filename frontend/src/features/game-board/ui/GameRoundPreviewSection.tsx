import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { components } from '../../../shared/api/contracts/generated'
import { RoundScoreBreakdown } from '../../../shared/game-ui/index.ts'
import { BusyIndicator, InlineNotice, FormSection, Metric } from '../../../shared/ui/index.ts'

type GameRoundDetails = components['schemas']['GameRoundDetailsDto']
type ScorePreview = components['schemas']['GameRoundScorePreviewDto']
export type GameRoundPreviewStatus =
  'incomplete' | 'debouncing' | 'loading' | 'success' | 'error' | 'stale'

export interface GameRoundPreviewState {
  status: GameRoundPreviewStatus
  data: ScorePreview | null
  inputKey: string | null
  errorCode: string | null
}

export function GameRoundPreviewSection({
  state,
  score,
}: {
  state: GameRoundPreviewState
  score: GameRoundDetails['scoreDetails'] | null | undefined
}) {
  const { t } = useTranslation()

  return (
    <FormSection title={t('gameBoard.roundSummaryScoreTitle')}>
      <Stack spacing={1.25}>
        {state.status === 'incomplete' ? (
          <InlineNotice severity="warning" variant="outlined">
            {t('gameBoard.roundSummaryPreviewIncomplete')}
          </InlineNotice>
        ) : null}
        {state.status === 'debouncing' || state.status === 'loading' ? (
          <InlineNotice severity="info" variant="outlined" icon={<BusyIndicator size={18} />}>
            {t(
              state.status === 'debouncing'
                ? 'gameBoard.roundSummaryPreviewWaiting'
                : 'gameBoard.roundSummaryPreviewLoading',
            )}
          </InlineNotice>
        ) : null}
        {state.status === 'error' ? (
          <InlineNotice severity="error" variant="outlined">
            {t('gameBoard.roundSummaryPreviewFailed', {
              reason: state.errorCode ?? t('gameBoard.roundSummaryPreviewFailedFallback'),
            })}
          </InlineNotice>
        ) : null}
        {state.status === 'stale' ? (
          <InlineNotice severity="error" variant="outlined">
            {t('gameBoard.roundSummaryPreviewStale')}
          </InlineNotice>
        ) : null}
        {state.status === 'success' && score ? (
          <>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' },
                gap: 1,
              }}
            >
              <Metric
                label={t('gameBoard.roundSummaryScoreUnit')}
                value={t('gameBoard.roundSummaryScoreValue', { value: score.scoreUnit })}
              />
              <Metric
                label={t('gameBoard.roundSummaryKillsScore')}
                value={t('gameBoard.roundSummaryScoreValue', { value: score.killsScore })}
              />
              <Metric
                label={t('gameBoard.roundSummaryBountiesScore')}
                value={t('gameBoard.roundSummaryScoreValue', { value: score.bountyScore })}
              />
              <Metric
                label={t('gameBoard.roundSummaryModifierKills')}
                value={t('gameBoard.roundSummaryModifierKillsValue', {
                  kills: score.modifierKillDelta,
                  score: score.modifierKillScore,
                })}
              />
              <Metric
                label={t('gameBoard.roundSummaryModifierPoints')}
                value={t('gameBoard.roundSummaryScoreValue', { value: score.modifierScoreDelta })}
              />
              {score.emptyCardPenaltyScore ? (
                <Metric
                  label={t('gameBoard.roundSummaryEmptyCardPenalty')}
                  value={t('gameBoard.roundSummaryScoreValue', {
                    value: score.emptyCardPenaltyScore,
                  })}
                />
              ) : null}
              <Metric
                label={t('gameBoard.roundSummaryTotalKills')}
                value={String(score.totalKillCount)}
                emphasis="result"
              />
              <Metric
                label={t('gameBoard.roundSummaryFinalScore')}
                value={t('gameBoard.roundSummaryScoreValue', { value: score.finalScore })}
                emphasis="result"
              />
            </Box>
            <RoundScoreBreakdown score={score} />
            {state.data?.calculationTrace.length ? (
              <Stack spacing={0.75}>
                <Typography variant="caption" color="text.secondary">
                  {t('gameBoard.roundSummaryTraceTitle')}
                </Typography>
                {state.data.calculationTrace.map((trace) => (
                  <Stack
                    key={trace.modifierResultId}
                    direction="row"
                    spacing={1}
                    justifyContent="space-between"
                  >
                    <Typography variant="caption">
                      {trace.formulaCode ?? trace.resolutionKind}
                    </Typography>
                    <Typography variant="caption" fontWeight={700}>
                      {t('gameBoard.roundSummaryTraceDelta', {
                        points: trace.pointsDelta,
                        kills: trace.bonusKillsDelta,
                      })}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            ) : null}
          </>
        ) : null}
      </Stack>
    </FormSection>
  )
}
