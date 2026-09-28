import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { components } from '../../shared/api/contracts/generated'
import { ItemCard, StatusBadge } from '../../shared/ui/index.ts'

type ManualAward = components['schemas']['GameHistoryQuizManualAwardItemDto']

export function ManualAwardHistoryItem({
  award,
  currentUserId,
}: {
  award: ManualAward
  currentUserId: string | null
}) {
  const { t, i18n } = useTranslation()
  const isDeduction = award.operationType === 'deduct' || award.awardedPoints < 0

  return (
    <ItemCard emphasis={award.awardedToUserId === currentUserId ? 'selected' : 'none'}>
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            {t(isDeduction ? 'gameQuiz.manualDeductionLabel' : 'gameQuiz.manualAwardLabel')}
          </Typography>
          <StatusBadge
            label={t('gameQuiz.pointsAdjusted', {
              value: `${award.awardedPoints > 0 ? '+' : ''}${award.awardedPoints}`,
            })}
            color={isDeduction ? 'error' : 'success'}
            size="small"
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
    </ItemCard>
  )
}

function formatHistoryTime(value: string, locale?: string) {
  return new Date(value).toLocaleString(locale)
}
