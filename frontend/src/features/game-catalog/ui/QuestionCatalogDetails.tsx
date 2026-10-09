import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { GameQuestionCatalogItem } from '../../../shared/api/contracts/index.ts'
import {
  AppButton,
  InlineNotice,
  ItemCard,
  Metric,
  NativeDisclosure,
  SectionDivider,
  StatusBadge,
} from '../../../shared/ui/index.ts'
import { RoundBriefingPanel } from '../../../shared/game-ui/index.ts'
import { getQuestionDisplayOptions } from '../model/question-answer-normalize.ts'

export function QuestionCatalogDetails({
  question,
  onEdit,
  onDelete,
}: {
  question: GameQuestionCatalogItem
  onEdit: (question: GameQuestionCatalogItem) => void
  onDelete: (question: GameQuestionCatalogItem) => void
}) {
  const { t, i18n } = useTranslation()
  const number = (value: number) => new Intl.NumberFormat(i18n.resolvedLanguage).format(value)
  const percentage = new Intl.NumberFormat(i18n.resolvedLanguage, {
    maximumFractionDigits: 1,
  }).format(question.correctPercentage)
  return (
    <Stack
      gap={1.5}
      data-testid="question-catalog-details"
      sx={{ minWidth: 0, overflowWrap: 'anywhere' }}
    >
      <Stack
        direction="row"
        gap={1}
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
      >
        <Stack direction="row" gap={0.75} alignItems="center" flexWrap="wrap" sx={{ minWidth: 0 }}>
          <StatusBadge variant="outlined" label={question.categoryName} />
          <StatusBadge
            variant="outlined"
            color={question.isEnabled ? 'success' : 'error'}
            label={t(
              question.isEnabled
                ? 'gameCatalog.questions.catalog.enabled'
                : 'gameCatalog.questions.catalog.disabled',
            )}
          />
        </Stack>
        <Stack direction="row" gap={1} flexWrap="wrap" sx={{ ml: 'auto' }}>
          <AppButton tone="primary" onClick={() => onEdit(question)}>
            {t('gameCatalog.actions.edit')}
          </AppButton>
          <AppButton tone="danger" onClick={() => onDelete(question)}>
            {t('gameCatalog.actions.delete')}
          </AppButton>
        </Stack>
      </Stack>
      <RoundBriefingPanel component="section" sx={{ px: 1.5, py: 0.75 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
            gap: 1,
          }}
        >
          <Metric
            appearance="summary"
            density="compact"
            emphasis="label"
            label={t('gameCatalog.questions.fields.reward')}
            value={number(question.reward)}
          />
          <SectionDivider orientation="vertical" flexItem />
          <Metric
            appearance="summary"
            density="compact"
            emphasis="label"
            label={t('gameCatalog.questions.fields.priority')}
            value={number(question.priority ?? 0)}
            help={t('gameCatalog.questions.editor.priorityHelp')}
          />
        </Box>
      </RoundBriefingPanel>
      <RoundBriefingPanel
        component="section"
        header={
          <Typography component="h2" variant="h6" textAlign="center">
            {t('gameCatalog.questions.fields.text')}
          </Typography>
        }
        contentEmphasis="strong"
      >
        <Typography component="h3" variant="body2" textAlign="center">
          {question.text}
        </Typography>
      </RoundBriefingPanel>
      <Typography component="h2" variant="h6" textAlign="center">
        {t('gameCatalog.questions.fields.answers')}
      </Typography>
      <Box
        component="ul"
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 0.75,
          m: 0,
          p: 0,
          listStyle: 'none',
        }}
      >
        {getQuestionDisplayOptions(question)
          .sort((a, b) => Number(b.isCorrect) - Number(a.isCorrect))
          .map((option, index) => (
            <ItemCard
              component="li"
              key={option.optionId}
              leadingAccent={option.isCorrect ? 'success' : false}
              density="compact"
              sx={{ minWidth: 0 }}
            >
              <Stack gap={0.25}>
                <Stack
                  direction="row"
                  gap={0.75}
                  alignItems="center"
                  justifyContent="center"
                  flexWrap="wrap"
                >
                  <Typography variant="caption" color="text.secondary">
                    {t('gameCatalog.questions.catalog.optionNumber', { number: number(index + 1) })}
                    :
                  </Typography>
                  {option.isCorrect ? (
                    <StatusBadge
                      color="success"
                      density="tight"
                      label={t('gameCatalog.questions.fields.correctAnswer')}
                    />
                  ) : null}
                </Stack>
                <Typography variant="body2" textAlign="center">
                  {option.text}
                </Typography>
              </Stack>
            </ItemCard>
          ))}
      </Box>
      {question.twitchCompatible === false ? (
        <InlineNotice severity="warning">{t('gameCatalog.questions.twitchTooLong')}</InlineNotice>
      ) : null}
      <NativeDisclosure
        key={question.questionId}
        indicator="chevron"
        surface="panel"
        density="tight"
        summary={t('gameCatalog.questions.catalog.statistics')}
      >
        <Stack gap={0.5}>
          <Metric
            appearance="row"
            density="compact"
            label={t('gameCatalog.questions.catalog.asked')}
            value={number(question.askedTotalCount)}
          />
          <Metric
            appearance="row"
            density="compact"
            label={t('gameCatalog.questions.catalog.submissions')}
            value={number(question.submissionTotalCount)}
          />
          <Metric
            appearance="row"
            density="compact"
            label={t('gameCatalog.questions.catalog.correct')}
            value={number(question.correctSubmissionTotalCount)}
          />
          <Metric
            appearance="row"
            density="compact"
            label={t('gameCatalog.questions.catalog.accuracy')}
            value={
              question.submissionTotalCount > 0
                ? percentage + '%'
                : t('gameCatalog.questions.catalog.noSubmissions')
            }
          />
          {question.questionCode ? (
            <Metric
              appearance="row"
              density="compact"
              label={t('gameCatalog.questions.catalog.code')}
              value={question.questionCode}
            />
          ) : null}
        </Stack>
      </NativeDisclosure>
    </Stack>
  )
}
