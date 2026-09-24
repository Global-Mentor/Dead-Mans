import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type {
  GameQuestionCatalogItem,
  GameQuestionCategoryItem,
} from '../../../shared/api/contracts/index.ts'
import {
  AppButton,
  AsyncSection,
  FormTextField,
  RecordRow,
  SectionCard,
  SectionHeader,
  StatusBadge,
} from '../../../shared/ui/index.ts'
import { getQuestionDisplayOptions } from '../model/question-answer-normalize.ts'

interface QuestionCatalogListProps {
  search: string
  selectedCategory: GameQuestionCategoryItem | null
  questions: readonly GameQuestionCatalogItem[]
  isLoading: boolean
  isError: boolean
  onSearchChange: (search: string) => void
  onEdit: (question: GameQuestionCatalogItem) => void
  onDelete: (question: GameQuestionCatalogItem) => void
}

export function QuestionCatalogList({
  search,
  selectedCategory,
  questions,
  isLoading,
  isError,
  onSearchChange,
  onEdit,
  onDelete,
}: QuestionCatalogListProps) {
  const { t } = useTranslation()

  return (
    <SectionCard sx={{ height: '100%' }}>
      <SectionHeader
        headingLevel="h1"
        title={t('gameCatalog.questions.title')}
        description={
          selectedCategory
            ? `${t('gameCatalog.questions.description')} ${selectedCategory.name}.`
            : t('gameCatalog.questions.description')
        }
      />

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mt: 1.5 }}>
        <FormTextField
          value={search}
          label={t('gameCatalog.questions.searchLabel')}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </Stack>

      <AsyncSection
        isLoading={isLoading}
        isError={isError}
        hasData={questions.length > 0}
        isEmpty={questions.length === 0}
        loadingMessage={t('gameCatalog.questions.loading')}
        errorMessage={t('gameCatalog.questions.error')}
        emptyMessage={t('gameCatalog.questions.empty')}
      >
        <Stack spacing={1} sx={{ mt: 1.5 }}>
          {questions.map((question) => (
            <RecordRow
              key={question.questionId}
              actions={
                <>
                  <AppButton size="small" tone="secondary" onClick={() => onEdit(question)}>
                    {t('gameCatalog.actions.edit')}
                  </AppButton>
                  <AppButton size="small" tone="danger" onClick={() => onDelete(question)}>
                    {t('gameCatalog.actions.delete')}
                  </AppButton>
                </>
              }
            >
              <Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
                {question.text}
              </Typography>
              <QuestionCatalogMetaChips question={question} />
            </RecordRow>
          ))}
        </Stack>
      </AsyncSection>
    </SectionCard>
  )
}

function QuestionCatalogMetaChips({ question }: { question: GameQuestionCatalogItem }) {
  const { t } = useTranslation()
  const options = getQuestionDisplayOptions(question)

  return (
    <Stack direction="row" spacing={0.75} sx={{ mt: 1, flexWrap: 'wrap', rowGap: 0.75 }}>
      <StatusBadge
        color="info"
        label={t('gameCatalog.questions.categoryMeta', {
          category: question.categoryName,
        })}
      />
      <StatusBadge
        color="warning"
        label={t('gameCatalog.questions.rewardMeta', { reward: question.reward })}
      />
      {options.map((option, index) => (
        <StatusBadge
          key={`${question.questionId}-option-${index}`}
          color={option.isCorrect ? 'success' : 'default'}
          label={t('gameCatalog.questions.answerMeta', { answer: option.text })}
        />
      ))}
      <StatusBadge
        label={t('gameCatalog.questions.askedMeta', {
          asked: question.askedTotalCount,
        })}
      />
      <StatusBadge
        label={`${question.correctSubmissionTotalCount}/${question.submissionTotalCount} · ${question.correctPercentage}%`}
      />
      {question.isEnabled ? null : (
        <StatusBadge color="error" label={t('gameCatalog.questions.disabledBadge')} />
      )}
      {question.twitchCompatible ? null : (
        <StatusBadge color="error" label={t('gameCatalog.questions.twitchIncompatibleBadge')} />
      )}
    </Stack>
  )
}
