import { QuizScreenshotImage, huntMapName, quizOptionText } from '../../../shared/game-ui/index.ts'
import { Box, Stack, Typography } from '@mui/material'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameQuestionCatalogItem } from '../../../shared/api/contracts/index.ts'
import { AppButton, ListPanel, SelectionRow, StatusBadge } from '../../../shared/ui/index.ts'

function screenshotTitle(question: GameQuestionCatalogItem, language: string) {
  const correct = question.options.find((option) => option.isCorrect)
  return question.image && question.screenshotLocationId && correct
    ? `${huntMapName(question.image.mapNames, language)} · ${quizOptionText(question.image, correct.optionId, correct.text, language)}`
    : null
}

export function QuestionCatalogList({
  screenshots = false,
  questions,
  totalCount,
  page = 1,
  pageSize = 40,
  onPageChange,
  onReturnToLoadedView,
  selectedId,
  onSelect,
}: {
  screenshots?: boolean
  questions: readonly GameQuestionCatalogItem[]
  totalCount: number
  page?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  onReturnToLoadedView?: () => void
  selectedId: string | null
  onSelect: (question: GameQuestionCatalogItem) => void
}) {
  const { t, i18n } = useTranslation()
  const prefix = useId()
  const number = new Intl.NumberFormat(i18n.resolvedLanguage).format
  return (
    <ListPanel
      title={t(screenshots ? 'gameCatalog.screenshots.list' : 'gameCatalog.questions.catalog.list')}
      data-testid="question-catalog-list"
      summary={
        <Typography variant="body2" color="text.secondary" role="status">
          {t('gameCatalog.workspace.results', {
            count: number(questions.length),
            total: number(totalCount),
          })}
        </Typography>
      }
      sx={{ height: '100%', minHeight: 0 }}
      tools={
        (totalCount > pageSize || page > 1 || onReturnToLoadedView) && onPageChange ? (
          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
            <AppButton
              tone="secondary"
              disabled={page <= 1 && !onReturnToLoadedView}
              onClick={() =>
                onReturnToLoadedView ? onReturnToLoadedView() : onPageChange(page - 1)
              }
            >
              {t('common.actions.back')}
            </AppButton>
            <Typography variant="body2" role="status">
              {t('gameCatalog.workspace.page', {
                page: number(page),
                total: number(Math.max(page, Math.ceil(totalCount / pageSize))),
              })}
            </Typography>
            <AppButton
              tone="secondary"
              disabled={Boolean(onReturnToLoadedView) || page * pageSize >= totalCount}
              onClick={() => onPageChange(page + 1)}
            >
              {t('common.actions.next')}
            </AppButton>
          </Stack>
        ) : null
      }
    >
      <Stack component="ul" gap={0.75} sx={{ m: 0, p: 0 }}>
        {questions.map((question, index) => (
          <Box component="li" key={question.questionId} sx={{ listStyle: 'none', minWidth: 0 }}>
            <SelectionRow
              selected={selectedId === question.questionId}
              selectionAppearance="outline"
              tone={index % 2 === 1 ? 'alternate' : 'default'}
              density="compact"
              aria-label={
                question.image
                  ? [question.text, screenshotTitle(question, i18n.language), question.questionCode]
                      .filter(Boolean)
                      .join(' · ')
                  : question.text
              }
              aria-describedby={prefix + '-' + question.questionId}
              onClick={() => onSelect(question)}
            >
              <Stack
                direction="row"
                gap={1.25}
                alignItems="center"
                sx={{ minWidth: 0, width: '100%' }}
              >
                <Stack gap={0.75} sx={{ minWidth: 0, flex: 1, overflowWrap: 'anywhere' }}>
                  <Typography component="span" variant="body1" fontWeight={700}>
                    {question.text}
                  </Typography>
                  {question.image && question.screenshotLocationId ? (
                    <Typography component="span" variant="body2" color="text.secondary">
                      {screenshotTitle(question, i18n.language)}
                    </Typography>
                  ) : null}
                  <Stack
                    component="span"
                    id={prefix + '-' + question.questionId}
                    direction="row"
                    gap={0.75}
                    alignItems="center"
                    flexWrap="wrap"
                  >
                    <StatusBadge density="tight" variant="outlined" label={question.categoryName} />
                    <StatusBadge
                      density="tight"
                      variant="outlined"
                      color="warning"
                      label={t('gameCatalog.questions.rewardMeta', {
                        reward: number(question.reward),
                      })}
                    />
                    {!question.isEnabled ? (
                      <StatusBadge
                        density="tight"
                        color="error"
                        label={t('gameCatalog.questions.catalog.disabled')}
                      />
                    ) : null}
                    {question.twitchCompatible === false ? (
                      <StatusBadge
                        density="tight"
                        color="warning"
                        label={t('gameCatalog.questions.twitchIncompatibleBadge')}
                      />
                    ) : null}
                  </Stack>
                </Stack>
                {question.image ? (
                  <Box sx={{ width: { xs: 96, sm: 128 }, flexShrink: 0 }}>
                    <QuizScreenshotImage image={question.image} thumbnail />
                  </Box>
                ) : null}
              </Stack>
            </SelectionRow>
          </Box>
        ))}
      </Stack>
    </ListPanel>
  )
}
