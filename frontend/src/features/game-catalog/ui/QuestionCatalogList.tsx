import { Box, Stack, Typography } from '@mui/material'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameQuestionCatalogItem } from '../../../shared/api/contracts/index.ts'
import { ListPanel, SelectionRow, StatusBadge } from '../../../shared/ui/index.ts'

export function QuestionCatalogList({
  questions,
  totalCount,
  selectedId,
  onSelect,
}: {
  questions: readonly GameQuestionCatalogItem[]
  totalCount: number
  selectedId: string | null
  onSelect: (question: GameQuestionCatalogItem) => void
}) {
  const { t, i18n } = useTranslation()
  const prefix = useId()
  const number = new Intl.NumberFormat(i18n.resolvedLanguage).format
  return (
    <ListPanel
      title={t('gameCatalog.questions.catalog.list')}
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
    >
      <Stack component="ul" gap={0.75} sx={{ m: 0, p: 0 }}>
        {questions.map((question, index) => (
          <Box component="li" key={question.questionId} sx={{ listStyle: 'none', minWidth: 0 }}>
            <SelectionRow
              selected={selectedId === question.questionId}
              selectionAppearance="outline"
              tone={index % 2 === 1 ? 'alternate' : 'default'}
              density="compact"
              aria-label={question.text}
              aria-describedby={prefix + '-' + question.questionId}
              onClick={() => onSelect(question)}
            >
              <Stack gap={0.75} sx={{ minWidth: 0, width: '100%' }}>
                <Typography component="span" variant="body1" fontWeight={700}>
                  {question.text}
                </Typography>
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
            </SelectionRow>
          </Box>
        ))}
      </Stack>
    </ListPanel>
  )
}
