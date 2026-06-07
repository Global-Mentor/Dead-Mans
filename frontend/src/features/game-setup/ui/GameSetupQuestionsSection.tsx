import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { queryKeys } from '../../../shared/api/query-keys.ts'
import {
  fetchGameQuestionCatalog,
  setGameQuestionCategoryEnabled,
  setGameQuestionEnabled,
} from '../api/game-questions-data-access.ts'

function toCategoryTitle(category: string) {
  return category
    .split('_')
    .filter((part) => part.length > 0)
    .map((part) => `${part[0]!.toUpperCase()}${part.slice(1)}`)
    .join(' ')
}

export function GameSetupQuestionsSection() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const catalogQuery = useQuery({
    queryKey: queryKeys.gameQuestions.catalog({ search }),
    queryFn: () =>
      fetchGameQuestionCatalog({
        search,
        includeDisabled: true,
      }),
  })

  const toggleQuestionMutation = useMutation({
    mutationFn: ({ questionId, isEnabled }: { questionId: string; isEnabled: boolean }) =>
      setGameQuestionEnabled(questionId, isEnabled),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.gameQuestions.all })
    },
  })

  const toggleCategoryMutation = useMutation({
    mutationFn: ({ category, isEnabled }: { category: string; isEnabled: boolean }) =>
      setGameQuestionCategoryEnabled(category, isEnabled),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.gameQuestions.all })
    },
  })

  const questions = catalogQuery.data ?? []

  const categories = useMemo(() => {
    return Array.from(new Set(questions.map((question) => question.category))).sort((a, b) =>
      a.localeCompare(b),
    )
  }, [questions])

  const filteredQuestions = useMemo(() => {
    if (!activeCategory) {
      return questions
    }

    return questions.filter((question) => question.category === activeCategory)
  }, [activeCategory, questions])

  return (
    <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        {t('gameSetup.questions.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {t('gameSetup.questions.description')}
      </Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mt: 1.5 }}>
        <TextField
          size="small"
          fullWidth
          value={search}
          label={t('gameSetup.questions.searchLabel')}
          onChange={(event) => setSearch(event.target.value)}
        />
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', rowGap: 1 }}>
        <Chip
          label={t('gameSetup.questions.categoryAll')}
          color={activeCategory === null ? 'primary' : 'default'}
          onClick={() => setActiveCategory(null)}
        />
        {categories.map((category) => (
          <Chip
            key={category}
            label={toCategoryTitle(category)}
            color={activeCategory === category ? 'primary' : 'default'}
            onClick={() => setActiveCategory(category)}
          />
        ))}
      </Stack>

      {activeCategory ? (
        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
          <Button
            size="small"
            variant="outlined"
            disabled={toggleCategoryMutation.isPending}
            onClick={() => toggleCategoryMutation.mutate({ category: activeCategory, isEnabled: true })}
          >
            {t('gameSetup.questions.enableCategory')}
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="warning"
            disabled={toggleCategoryMutation.isPending}
            onClick={() => toggleCategoryMutation.mutate({ category: activeCategory, isEnabled: false })}
          >
            {t('gameSetup.questions.disableCategory')}
          </Button>
        </Stack>
      ) : null}

      {catalogQuery.isLoading ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          {t('gameSetup.questions.loading')}
        </Typography>
      ) : null}

      {catalogQuery.isError ? (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {t('gameSetup.questions.error')}
        </Alert>
      ) : null}

      {filteredQuestions.length === 0 && !catalogQuery.isLoading ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          {t('gameSetup.questions.empty')}
        </Typography>
      ) : null}

      {filteredQuestions.length > 0 ? (
        <Stack spacing={0.5} sx={{ mt: 1.5, maxHeight: 360, overflowY: 'auto', pr: 0.5 }}>
          {filteredQuestions.map((question) => (
            <Box
              key={question.questionId}
              sx={{
                border: (theme) => `1px solid ${theme.palette.divider}`,
                borderRadius: 1,
                p: 1,
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={question.isEnabled}
                    onChange={(event) =>
                      toggleQuestionMutation.mutate({
                        questionId: question.questionId,
                        isEnabled: event.target.checked,
                      })
                    }
                    disabled={toggleQuestionMutation.isPending}
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {question.text}
                  </Typography>
                }
                sx={{ alignItems: 'flex-start', m: 0 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4.5 }}>
                {t('gameSetup.questions.meta', {
                  category: question.category,
                  reward: question.reward,
                  asked: question.askedTotalCount,
                  correct: question.correctTotalCount,
                })}
              </Typography>
            </Box>
          ))}
        </Stack>
      ) : null}
    </Paper>
  )
}
