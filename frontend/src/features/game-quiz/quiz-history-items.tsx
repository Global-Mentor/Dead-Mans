import { Box, Chip, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import type { components } from '../../shared/api/contracts/generated'

type ManualAward = components['schemas']['GameHistoryQuizManualAwardItemDto']

export function ManualAwardHistoryItem({
  award,
  currentUserId,
  alternate = false,
}: {
  award: ManualAward
  currentUserId: string | null
  alternate?: boolean
}) {
  const { t, i18n } = useTranslation()
  const isMyAward = award.awardedToUserId === currentUserId
  const isDeduction = award.operationType === 'deduct' || award.awardedPoints < 0

  return (
    <Box
      data-history-tone={alternate ? 'light' : 'dark'}
      sx={(theme) => ({
        px: 2,
        py: 1.5,
        backgroundColor: alternate
          ? alpha(theme.palette.common.white, isMyAward ? 0.07 : 0.055)
          : alpha(theme.palette.common.black, isMyAward ? 0.16 : 0.22),
      })}
    >
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            {t(isDeduction ? 'gameQuiz.manualDeductionLabel' : 'gameQuiz.manualAwardLabel')}
          </Typography>
          <Chip
            label={t('gameQuiz.pointsAdjusted', {
              value: `${award.awardedPoints > 0 ? '+' : ''}${award.awardedPoints}`,
            })}
            color={isDeduction ? 'error' : 'success'}
            size="small"
            sx={{ height: 20, fontSize: '0.68rem' }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            {formatHistoryTime(award.awardedAtUtc, i18n.resolvedLanguage)}
          </Typography>
        </Stack>

        <Typography variant="body2">
          {t(
            isDeduction ? 'gameQuiz.manualDeductionDescription' : 'gameQuiz.manualAwardDescription',
            {
              player: award.awardedToDisplayName,
              moderator: award.awardedByDisplayName,
            },
          )}
        </Typography>
        {award.reason ? (
          <Typography variant="caption" color="text.secondary">
            {t('gameQuiz.manualAdjustmentReason', { reason: award.reason })}
          </Typography>
        ) : null}
      </Stack>
    </Box>
  )
}

function formatHistoryTime(value: string, locale?: string) {
  return new Date(value).toLocaleString(locale)
}
