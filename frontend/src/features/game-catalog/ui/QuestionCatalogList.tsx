import { Box, Stack, Typography } from '@mui/material'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  GameQuestionCatalogItem,
  GameQuestionCategoryItem,
} from '../../../shared/api/contracts/index.ts'
import {
  AppButton,
  AsyncSection,
  FormSelect,
  RecordRow,
  SectionCard,
  SurfaceButton,
  StatusBadge,
} from '../../../shared/ui/index.ts'
import { CatalogQuestionPreview } from './CatalogQuestionPreview.tsx'

interface QuestionCatalogListProps {
  search: string
  selectedCategory: GameQuestionCategoryItem | null
  questions: readonly GameQuestionCatalogItem[]
  isLoading: boolean
  isError: boolean
  onResetFilters: () => void
  onEdit: (question: GameQuestionCatalogItem) => void
  onDelete: (question: GameQuestionCatalogItem) => void
  onRetry: () => void
}
export function QuestionCatalogList({
  search,
  selectedCategory,
  questions,
  isLoading,
  isError,
  onResetFilters,
  onEdit,
  onDelete,
  onRetry,
}: QuestionCatalogListProps) {
  const { t } = useTranslation()
  const [state, setState] = useState('all')
  const [preview, setPreview] = useState<GameQuestionCatalogItem | null>(null)
  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return questions.filter(
      (question) =>
        (!selectedCategory || question.categoryId === selectedCategory.id) &&
        (state === 'all' || question.isEnabled === (state === 'enabled')) &&
        (!query ||
          [
            question.text,
            question.categoryName,
            question.questionCode,
            ...question.options.map((option) => option.text),
          ].some((value) => value?.toLocaleLowerCase().includes(query))),
    )
  }, [questions, search, selectedCategory, state])
  return (
    <SectionCard
      sx={{ flex: '1 1 0%', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}
    >
      <Stack
        direction="row"
        gap={1}
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        sx={{ flexShrink: 0 }}
      >
        <Typography variant="body2" color="text.secondary" role="status">
          {t('gameCatalog.workspace.results', { count: visible.length, total: questions.length })}
        </Typography>
        <FormSelect
          label={t('gameCatalog.workspace.status')}
          value={state}
          onChange={setState}
          options={[
            { value: 'all', label: t('gameCatalog.workspace.all') },
            { value: 'enabled', label: t('gameCatalog.workspace.enabled') },
            { value: 'disabled', label: t('gameCatalog.questions.disabledBadge') },
          ]}
          sx={{ width: { xs: '100%', sm: 220 }, flexShrink: 0 }}
        />
      </Stack>
      <Box
        role="region"
        aria-label={t('gameCatalog.questions.title')}
        tabIndex={0}
        sx={{
          flex: '1 1 0%',
          minHeight: 0,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          scrollbarWidth: 'thin',
          scrollbarGutter: 'stable both-edges',
        }}
      >
        <AsyncSection
          isLoading={isLoading}
          isError={isError}
          hasData={questions.length > 0}
          isEmpty={visible.length === 0}
          loadingMessage={t('gameCatalog.questions.loading')}
          errorMessage={t('gameCatalog.questions.error')}
          emptyMessage={t('gameCatalog.questions.empty')}
        >
          <Stack gap={0.75}>
            {visible.map((question) => (
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
                <SurfaceButton
                  onClick={() => setPreview(question)}
                  aria-label={t('gameCatalog.workspace.previewItem', { name: question.text })}
                  sx={{ display: 'block', width: '100%', textAlign: 'left' }}
                >
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    sx={{
                      overflowWrap: 'anywhere',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {question.text}
                  </Typography>
                </SurfaceButton>
                <Stack
                  direction="row"
                  gap={1}
                  alignItems="center"
                  flexWrap="wrap"
                  sx={{ mt: 0.75 }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {question.categoryName} ·{' '}
                    {t('gameCatalog.questions.rewardMeta', { reward: question.reward })}
                  </Typography>
                  {!question.isEnabled ? (
                    <StatusBadge
                      size="small"
                      color="error"
                      label={t('gameCatalog.questions.disabledBadge')}
                    />
                  ) : null}
                  {question.twitchCompatible === false ? (
                    <StatusBadge
                      size="small"
                      color="warning"
                      label={t('gameCatalog.questions.twitchIncompatibleBadge')}
                    />
                  ) : null}
                </Stack>
              </RecordRow>
            ))}
          </Stack>
        </AsyncSection>
        {isError ? (
          <AppButton tone="secondary" onClick={onRetry}>
            {t('gameCatalog.workspace.retry')}
          </AppButton>
        ) : null}
        {!visible.length && (search || selectedCategory || state !== 'all') ? (
          <AppButton
            tone="ghost"
            onClick={() => {
              onResetFilters()
              setState('all')
            }}
          >
            {t('gameCatalog.workspace.reset')}
          </AppButton>
        ) : null}
      </Box>
      <CatalogQuestionPreview question={preview} onClose={() => setPreview(null)} onEdit={onEdit} />
    </SectionCard>
  )
}
