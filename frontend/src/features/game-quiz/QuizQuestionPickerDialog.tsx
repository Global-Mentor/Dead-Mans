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
  SelectionRow,
  StatusBadge,
} from '../../shared/ui/index.ts'
type AvailableQuestion = components['schemas']['AvailableGameQuizQuestionDto']

type Props = {
  open: boolean
  questions: readonly AvailableQuestion[]
  launchDisabled: boolean
  unavailableReason?: string
  loading?: boolean
  error?: boolean
  onRetry?: () => void
  onClose: () => void
  onSelect: (questionId: string) => void | Promise<unknown>
}

const allCategories = '__all__'

export function QuizQuestionPickerDialog({
  open,
  questions,
  launchDisabled,
  unavailableReason,
  loading = false,
  error = false,
  onRetry,
  onClose,
  onSelect,
}: Props) {
  const { t, i18n } = useTranslation()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(allCategories)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitFailed, setSubmitFailed] = useState(false)
  const submittingRef = useRef(false)
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
    setSelectedId(null)
    setSubmitFailed(false)
    onClose()
  }
  const selectedQuestion = visibleQuestions.find((question) => question.questionId === selectedId)
  const pending = submitting
  const startSelected = async () => {
    if (!selectedQuestion || launchDisabled || pending || submittingRef.current || loading || error)
      return
    submittingRef.current = true
    setSubmitting(true)
    setSubmitFailed(false)
    try {
      await onSelect(selectedQuestion.questionId)
      close()
    } catch {
      setSubmitFailed(true)
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <AppDialog
      open={open}
      onClose={pending ? undefined : close}
      maxWidth="md"
      slotProps={{ transition: { onEntered: () => searchRef.current?.focus() } }}
      title={t('gameQuiz.questionPickerTitle')}
      description={t('gameQuiz.questionPickerDescription')}
      actions={
        <>
          <AppButton tone="ghost" onClick={close} disabled={pending}>
            {t('common.actions.close')}
          </AppButton>
          <AppButton
            loading={submitting}
            disabled={launchDisabled || pending || loading || error || !selectedQuestion}
            onClick={() => void startSelected()}
          >
            {t('gameQuiz.startSelected')}
          </AppButton>
        </>
      }
    >
      <Stack spacing={1.5}>
        {unavailableReason ? (
          <InlineNotice severity="info">{unavailableReason}</InlineNotice>
        ) : null}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <FormTextField
            autoFocus
            inputRef={searchRef}
            fullWidth
            size="small"
            label={t('gameQuiz.questionSearchLabel')}
            placeholder={t('gameQuiz.questionSearchPlaceholder')}
            value={query}
            disabled={pending}
            onChange={(event) => {
              setQuery(event.target.value)
              setSelectedId(null)
              setSubmitFailed(false)
            }}
          />
          <FormSelect
            size="small"
            label={t('gameQuiz.questionCategoryLabel')}
            value={category}
            options={[
              { value: allCategories, label: t('gameQuiz.allQuestionCategories') },
              ...categories.map((item) => ({ value: item, label: item })),
            ]}
            disabled={pending}
            onChange={(value) => {
              setCategory(String(value))
              setSelectedId(null)
              setSubmitFailed(false)
            }}
            sx={{ width: { xs: '100%', sm: 240 }, flexShrink: 0 }}
          />
        </Stack>

        {submitFailed ? (
          <InlineNotice severity="error">{t('gameQuiz.questionStartError')}</InlineNotice>
        ) : null}
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
                <Box
                  component="li"
                  key={question.questionId}
                  sx={{ listStyle: 'none', overflowWrap: 'anywhere' }}
                >
                  <SelectionRow
                    selected={selectedId === question.questionId}
                    disabled={pending}
                    onClick={() => {
                      setSelectedId(question.questionId)
                      setSubmitFailed(false)
                    }}
                  >
                    <Stack component="span" spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
                      <StatusBadge
                        component="span"
                        density="compact"
                        appearance="plain"
                        label={question.categoryName}
                      />
                      <Typography component="span" variant="body1" fontWeight={700}>
                        {question.text}
                      </Typography>
                      {selectedId === question.questionId ? (
                        <Typography component="span" variant="caption" color="primary.light">
                          {t('gameQuiz.questionSelected')}
                        </Typography>
                      ) : null}
                    </Stack>
                  </SelectionRow>
                </Box>
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
