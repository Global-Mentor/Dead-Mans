import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { components } from '../../shared/api/contracts/generated'
import { ItemCard, NativeDisclosure, StatusBadge } from '../../shared/ui/index.ts'

import { QuizTextBlock } from './QuizTextBlock.tsx'

type ManualAward = components['schemas']['GameHistoryQuizManualAwardItemDto']

export function ManualAwardHistoryItem({
  award,
  currentUserId,
  tone = 'default',
}: {
  award: ManualAward
  currentUserId: string | null
  tone?: 'default' | 'alternate'
}) {
  const { t, i18n } = useTranslation()
  const isDeduction = award.operationType === 'deduct' || award.awardedPoints < 0
  return (
    <ItemCard
      leadingAccent
      tone={tone}
      emphasis={award.awardedToUserId === currentUserId ? 'selected' : 'none'}
      sx={{ px: 1.25, py: 0 }}
    >
      <NativeDisclosure
        indicator="chevron"
        density="compact"
        summary={
          <Stack component="span" direction="row" spacing={1} alignItems="center">
            <Typography
              component="span"
              variant="body2"
              sx={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}
            >
              {t(isDeduction ? 'gameQuiz.manualDeductionFor' : 'gameQuiz.manualAwardFor', {
                player: award.awardedToDisplayName,
              })}
            </Typography>
            <StatusBadge
              appearance="plain"
              density="compact"
              label={t('gameQuiz.pointsAdjusted', {
                value: `${award.awardedPoints > 0 ? '+' : ''}${award.awardedPoints.toLocaleString(i18n.resolvedLanguage)}`,
              })}
              color={isDeduction ? 'error' : 'success'}
            />
          </Stack>
        }
      >
        <Stack spacing={0.5} sx={{ pb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {new Date(award.awardedAtUtc).toLocaleString(i18n.resolvedLanguage)}
          </Typography>
          <QuizTextBlock>
            {t(
              isDeduction
                ? 'gameQuiz.manualDeductionDescription'
                : 'gameQuiz.manualAwardDescription',
              { player: award.awardedToDisplayName, moderator: award.awardedByDisplayName },
            )}
          </QuizTextBlock>
          {award.reason ? (
            <QuizTextBlock label={t('gameQuiz.adjustmentReasonHeading')} inline>
              {award.reason}
            </QuizTextBlock>
          ) : null}
        </Stack>
      </NativeDisclosure>
    </ItemCard>
  )
}
