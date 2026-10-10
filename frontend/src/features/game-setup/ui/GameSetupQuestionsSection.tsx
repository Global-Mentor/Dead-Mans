import { Box, Stack, Typography } from '@mui/material'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppButton,
  AsyncSection,
  FormSelect,
  FormTextField,
  SectionCard,
  SectionHeader,
} from '../../../shared/ui/index.ts'
import type { GameSetupDraftState } from '../model/game-setup-draft.ts'
import { useGameSetupQuestionsCatalog } from '../use-game-setup-questions-catalog.ts'
import { GameSetupQuestionRow } from './GameSetupQuestionRow.tsx'
import { GameSetupQuestionDuration } from './GameSetupQuestionDuration.tsx'
import { GameSetupQuestionPreview } from './GameSetupQuestionPreview.tsx'

interface GameSetupQuestionsSectionProps {
  draft: GameSetupDraftState
  onToggle: (questionId: string, enabled: boolean) => void
  onBulkSetEnabled: (questionIds: readonly string[], enabled: boolean) => void
  onDurationChange: (seconds: number) => void
  onDurationCommit: () => void
  isSaving: boolean
  actions?: ReactNode
}

export function GameSetupQuestionsSection({
  draft,
  onToggle,
  onBulkSetEnabled,
  onDurationChange,
  onDurationCommit,
  isSaving,
  actions,
}: GameSetupQuestionsSectionProps) {
  const { t } = useTranslation()
  const {
    search,
    setSearch,
    activeCategory,
    setActiveCategory,
    catalogQuery,
    categories,
    filteredQuestions,
  } = useGameSetupQuestionsCatalog()
  const [selection, setSelection] = useState('all')
  const [previewId, setPreviewId] = useState<string | null>(null)
  const enabledIds = new Set(draft.enabledQuestionIds)
  const visibleQuestions = filteredQuestions.filter(
    (question) =>
      question.isEnabled &&
      (selection === 'all' || enabledIds.has(question.questionId) === (selection === 'selected')),
  )
  const visibleIds = visibleQuestions.map((question) => question.questionId)
  const preview = catalogQuery.data?.find((question) => question.questionId === previewId) ?? null
  const hasFilters = search.trim().length > 0 || activeCategory !== 'all' || selection !== 'all'
  return (
    <SectionCard
      sx={{
        flex: '1 1 0%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          flexShrink: 0,
          maxHeight: '65%',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          scrollbarGutter: 'stable both-edges',
          scrollbarWidth: 'thin',
          mx: -1,
        }}
      >
        <SectionHeader
          headingLevel="h1"
          title={t('gameSetup.questions.title')}
          actions={
            <Stack direction="row" gap={1.5} flexWrap="wrap" alignItems="center">
              <Typography variant="body2" color="text.secondary">
                {t('gameSetup.questions.enabledCount', { count: draft.enabledQuestionIds.length })}
              </Typography>
              {actions}
            </Stack>
          }
        />
        <Stack spacing={1} sx={{ mt: 1, p: 0.5 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} alignItems="flex-start">
            <FormTextField
              density="compact"
              value={search}
              label={t('gameSetup.questions.searchLabel')}
              onChange={(event) => setSearch(event.target.value)}
              sx={{ flex: 1 }}
            />
            <GameSetupQuestionDuration
              value={draft.quizAnswerDurationSeconds}
              disabled={isSaving}
              onChange={onDurationChange}
              onCommit={onDurationCommit}
            />
          </Stack>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            gap={1.5}
            alignItems={{ xs: 'stretch', md: 'center' }}
          >
            <Stack direction="row" gap={1} sx={{ flex: 1, minWidth: 0 }}>
              <FormSelect
                density="compact"
                label={t('common.entities.categories')}
                value={activeCategory}
                onChange={setActiveCategory}
                options={[
                  { value: 'all', label: t('common.filters.allCategories') },
                  ...categories,
                ]}
                sx={{ flex: 1, minWidth: 0 }}
              />
              <FormSelect
                density="compact"
                label={t('gameSetup.questions.selectionLabel')}
                value={selection}
                onChange={setSelection}
                options={[
                  { value: 'all', label: t('gameSetup.questions.selectionAll') },
                  { value: 'selected', label: t('gameSetup.questions.selectionSelected') },
                  { value: 'unselected', label: t('gameSetup.questions.selectionUnselected') },
                ]}
                sx={{ flex: 1, minWidth: 0 }}
              />
            </Stack>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 1,
                flexShrink: 0,
              }}
            >
              <AppButton
                size="small"
                tone="secondary"
                framePlacement="inset"
                disabled={isSaving || !visibleIds.some((id) => !enabledIds.has(id))}
                onClick={() => onBulkSetEnabled(visibleIds, true)}
              >
                {t('gameSetup.questions.enableVisible')}
              </AppButton>
              <AppButton
                size="small"
                tone="danger"
                framePlacement="inset"
                disabled={isSaving || !visibleIds.some((id) => enabledIds.has(id))}
                onClick={() => onBulkSetEnabled(visibleIds, false)}
              >
                {t('gameSetup.questions.disableVisible')}
              </AppButton>
            </Box>
          </Stack>
        </Stack>
      </Box>
      <Box
        role="region"
        aria-label={t('gameSetup.questions.title')}
        tabIndex={0}
        sx={{
          flex: '1 1 0%',
          minHeight: 0,
          mt: 1.5,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          scrollbarGutter: 'stable both-edges',
          scrollbarWidth: 'thin',
          mx: -1,
          px: 0.5,
        }}
      >
        <AsyncSection
          isLoading={catalogQuery.isLoading}
          isError={catalogQuery.isError}
          hasData={catalogQuery.data != null}
          isEmpty={visibleQuestions.length === 0}
          loadingMessage={t('gameSetup.questions.loading')}
          errorMessage={t('gameSetup.questions.error')}
          emptyMessage={t(
            hasFilters ? 'gameSetup.questions.emptyFiltered' : 'gameSetup.questions.empty',
          )}
          retryAction={
            <AppButton tone="secondary" onClick={() => void catalogQuery.refetch()}>
              {t('gameSetup.registration.retry')}
            </AppButton>
          }
        >
          <Box component="fieldset" disabled={isSaving} sx={{ border: 0, m: 0, p: 0, minWidth: 0 }}>
            <Box
              component="ul"
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'repeat(2, minmax(0, 1fr))' },
                gap: 0.5,
                m: 0,
                p: 0,
                alignItems: 'start',
              }}
            >
              {visibleQuestions.map((question) => (
                <GameSetupQuestionRow
                  key={question.questionId}
                  question={question}
                  selected={enabledIds.has(question.questionId)}
                  onToggle={onToggle}
                  onPreview={setPreviewId}
                />
              ))}
            </Box>
          </Box>
        </AsyncSection>
        {hasFilters &&
        visibleQuestions.length === 0 &&
        !catalogQuery.isLoading &&
        !catalogQuery.isError ? (
          <AppButton
            tone="secondary"
            framePlacement="inset"
            onClick={() => {
              setSearch('')
              setActiveCategory('all')
              setSelection('all')
            }}
          >
            {t('gameSetup.questions.resetFilters')}
          </AppButton>
        ) : null}
      </Box>
      <GameSetupQuestionPreview question={preview} onClose={() => setPreviewId(null)} />
    </SectionCard>
  )
}
