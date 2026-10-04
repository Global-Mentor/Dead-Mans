import { Stack } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { StatusBadge } from '../../shared/ui/index.ts'

export function QuizQuestionMetadata({
  category,
  reward,
}: {
  category: string
  reward?: number | null
}) {
  const { t } = useTranslation()
  return (
    <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ minWidth: 0 }}>
      <StatusBadge
        density="tight"
        variant="outlined"
        label={t('gameQuiz.categoryValue', { category: category || t('gameQuiz.uncategorized') })}
      />
      {reward != null ? (
        <StatusBadge
          density="tight"
          variant="outlined"
          color="warning"
          label={t('gameQuiz.questionReward', { reward })}
        />
      ) : null}
    </Stack>
  )
}
