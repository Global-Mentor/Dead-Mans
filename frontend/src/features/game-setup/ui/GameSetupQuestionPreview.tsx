import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { GameQuestionCatalogItem } from '../../../shared/api/contracts/index.ts'
import { AppButton, AppDialog, ItemCard, StatusBadge } from '../../../shared/ui/index.ts'

export function GameSetupQuestionPreview({
  question,
  onClose,
}: {
  question: GameQuestionCatalogItem | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  return (
    <AppDialog
      open={question !== null}
      title={t('gameSetup.questions.previewTitle')}
      onClose={onClose}
      actions={
        <AppButton tone="secondary" onClick={onClose}>
          {t('common.actions.close')}
        </AppButton>
      }
    >
      {question ? (
        <Stack spacing={2}>
          <Typography sx={{ overflowWrap: 'anywhere' }}>{question.text}</Typography>
          <Stack direction="row" gap={1} flexWrap="wrap">
            <StatusBadge label={question.categoryName} />
            <StatusBadge label={t('gameSetup.questions.reward', { count: question.reward })} />
          </Stack>
          <Stack spacing={1}>
            {[...question.options]
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((option) => (
                <ItemCard
                  key={option.optionId}
                  leadingAccent={option.isCorrect ? 'success' : false}
                >
                  <Stack
                    direction="row"
                    gap={1}
                    flexWrap="wrap"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Typography sx={{ overflowWrap: 'anywhere', minWidth: 0 }}>
                      {option.text}
                    </Typography>
                    {option.isCorrect ? (
                      <StatusBadge color="success" label={t('gameSetup.questions.correctAnswer')} />
                    ) : null}
                  </Stack>
                </ItemCard>
              ))}
          </Stack>
        </Stack>
      ) : null}
    </AppDialog>
  )
}
