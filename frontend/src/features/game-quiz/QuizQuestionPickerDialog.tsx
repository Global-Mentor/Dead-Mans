import { Box, Stack, Typography } from '@mui/material'
import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { components } from '../../shared/api/contracts/generated'
import {
  AppButton,
  AppDialog,
  BusyIndicator,
  FormSelect,
  FormTextField,
  InlineNotice,
  ItemCard,
  StatusBadge,
} from '../../shared/ui/index.ts'
type AvailableQuestion = components['schemas']['AvailableGameQuizQuestionDto']

type Props = {
  open: boolean
  questions: readonly AvailableQuestion[]
  busy: boolean
  loading?: boolean
  error?: boolean
  onRetry?: () => void
  onClose: () => void
  onSelect: (questionId: string) => void
}

const allCategories = '__all__'

export function QuizQuestionPickerDialog({
  open,
  questions,
  busy,
  loading = false,
  error = false,
  onRetry,
  onClose,
  onSelect,
}: Props) {
  const { t, i18n } = useTranslation()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(allCategories)
  const searchRef = useRef<HTMLInputElement>(null)

  const categories = useMemo(
    () =>
      [...new Set(questions.map((question) => question.categoryName))].sort((left, right) =>
        left.localeCompare(right, i18n.resolvedLanguage),
      ),
    [i18n.resolvedLanguage, questions],
  )
  const visibleQuestions = useMemo(() => {
    const normalizedQuery = normalizeSearch(query)
    return questions.filter(
      (question) =>
        (category === allCategories || question.categoryName === category) &&
        (normalizedQuery === '' || normalizeSearch(question.text).includes(normalizedQuery)),
    )
  }, [category, query, questions])

  const close = () => {
    setQuery('')
    setCategory(allCategories)
    onClose()
  }

  return (
    <AppDialog
      open={open}
      onClose={busy ? undefined : close}
      maxWidth="md"
      slotProps={{ transition: { onEntered: () => searchRef.current?.focus() } }}
      title={t('gameQuiz.questionPickerTitle')}
      description={t('gameQuiz.questionPickerDescription')}
      actions={
        <AppButton tone="ghost" onClick={close} disabled={busy}>
          {t('common.actions.close')}
        </AppButton>
      }
    >
      <Stack spacing={1.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <FormTextField
            autoFocus
            inputRef={searchRef}
            fullWidth
            size="small"
            label={t('gameQuiz.questionSearchLabel')}
            placeholder={t('gameQuiz.questionSearchPlaceholder')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <FormSelect
            size="small"
            label={t('gameQuiz.questionCategoryLabel')}
            value={category}
            options={[
              { value: allCategories, label: t('gameQuiz.allQuestionCategories') },
              ...categories.map((item) => ({ value: item, label: item })),
            ]}
            onChange={(value) => setCategory(String(value))}
            sx={{ width: { xs: '100%', sm: 240 }, flexShrink: 0 }}
          />
        </Stack>

        {!loading && !error ? (
          <Typography variant="caption" color="text.secondary" aria-live="polite">
            {t('gameQuiz.questionPickerResults', { count: visibleQuestions.length })}
          </Typography>
        ) : null}

        {loading ? (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <BusyIndicator size={24} aria-label={t('gameQuiz.loading')} />
          </Box>
        ) : error ? (
          <InlineNotice
            severity="error"
            action={
              onRetry ? (
                <AppButton tone="ghost" size="small" onClick={onRetry}>
                  {t('gameQuiz.retryQuestions')}
                </AppButton>
              ) : undefined
            }
          >
            {t('gameQuiz.questionsLoadError')}
          </InlineNotice>
        ) : (
          <Stack
            component="ul"
            spacing={0.75}
            sx={{
              m: 0,
              p: 0,
              maxHeight: 'min(52vh, 520px)',
              overflowY: 'auto',
              scrollbarGutter: 'stable',
            }}
          >
            {visibleQuestions.length === 0 ? (
              <Typography
                component="li"
                variant="body2"
                color="text.secondary"
                sx={{ listStyle: 'none', py: 2, textAlign: 'center' }}
              >
                {t(
                  questions.length === 0
                    ? 'gameQuiz.noQuestionsAvailable'
                    : 'gameQuiz.noQuestionsMatched',
                )}
              </Typography>
            ) : (
              visibleQuestions.map((question) => (
                <ItemCard
                  component="li"
                  key={question.questionId}
                  sx={{ listStyle: 'none', overflowWrap: 'anywhere' }}
                >
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <StatusBadge size="small" label={question.categoryName} sx={{ mb: 0.5 }} />
                      <Typography variant="body2" fontWeight={700}>
                        {question.text}
                      </Typography>
                    </Box>
                    <AppButton
                      size="small"
                      disabled={busy}
                      onClick={() => {
                        close()
                        onSelect(question.questionId)
                      }}
                      sx={{ flexShrink: 0 }}
                    >
                      {t('gameQuiz.selectQuestion')}
                    </AppButton>
                  </Stack>
                </ItemCard>
              ))
            )}
          </Stack>
        )}
      </Stack>
    </AppDialog>
  )
}

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase().normalize('NFKD')
}
