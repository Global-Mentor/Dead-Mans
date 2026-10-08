import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { GameQuestionCatalogItem } from '../../../shared/api/contracts/index.ts'
import { AppButton, AppDialog, ItemCard, Metric, StatusBadge } from '../../../shared/ui/index.ts'
import { getQuestionDisplayOptions } from '../model/question-answer-normalize.ts'

export function CatalogQuestionPreview({
  question,
  onClose,
  onEdit,
}: {
  question: GameQuestionCatalogItem | null
  onClose: () => void
  onEdit: (question: GameQuestionCatalogItem) => void
}) {
  const { t } = useTranslation()
  return (
    <AppDialog
      open={question !== null}
      title={t('gameCatalog.workspace.preview')}
      onClose={onClose}
      actions={
        <>
          <AppButton tone="ghost" onClick={onClose}>
            {t('common.actions.close')}
          </AppButton>
          <AppButton
            onClick={() => {
              if (question) {
                onEdit(question)
                onClose()
              }
            }}
          >
            {t('gameCatalog.actions.edit')}
          </AppButton>
        </>
      }
    >
      {question ? (
        <Stack gap={1.5}>
          <Typography sx={{ overflowWrap: 'anywhere' }}>{question.text}</Typography>
          <Stack direction="row" gap={1} flexWrap="wrap">
            <StatusBadge label={question.categoryName} />
            <StatusBadge
              label={t('gameCatalog.questions.rewardMeta', { reward: question.reward })}
            />
            {!question.isEnabled ? (
              <StatusBadge color="error" label={t('gameCatalog.questions.disabledBadge')} />
            ) : null}
          </Stack>
          {getQuestionDisplayOptions(question).map((option, index) => (
            <ItemCard key={index} leadingAccent={option.isCorrect ? 'success' : false}>
              <Stack
                direction="row"
                gap={1}
                alignItems="center"
                justifyContent="space-between"
                flexWrap="wrap"
              >
                <Typography sx={{ overflowWrap: 'anywhere' }}>{option.text}</Typography>
                {option.isCorrect ? (
                  <StatusBadge
                    color="success"
                    label={t('gameCatalog.questions.fields.correctAnswer')}
                  />
                ) : null}
              </Stack>
            </ItemCard>
          ))}
          <Metric
            appearance="row"
            density="compact"
            label={t('gameCatalog.questions.askedMeta', { asked: question.askedTotalCount })}
            value={
              question.correctSubmissionTotalCount +
              '/' +
              question.submissionTotalCount +
              ' · ' +
              question.correctPercentage +
              '%'
            }
          />
          {question.twitchCompatible === false ? (
            <StatusBadge
              color="warning"
              label={t('gameCatalog.questions.twitchIncompatibleBadge')}
            />
          ) : null}
        </Stack>
      ) : null}
    </AppDialog>
  )
}
