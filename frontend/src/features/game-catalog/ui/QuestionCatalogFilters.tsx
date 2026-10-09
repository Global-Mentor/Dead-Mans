import { Box, useMediaQuery, useTheme } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameQuestionCategoryItem } from '../../../shared/api/contracts/index.ts'
import { AppButton, FormSelect, FormTextField, NativeDisclosure } from '../../../shared/ui/index.ts'
import type { QuestionCatalogSort, QuestionCatalogStatus } from '../model/question-catalog.ts'

export function QuestionCatalogFilters({
  search,
  onSearchChange,
  categories,
  categoryId,
  onCategoryChange,
  status,
  onStatusChange,
  sort,
  onSortChange,
  loadingCategories,
  hasFilters,
  onReset,
}: {
  search: string
  onSearchChange: (value: string) => void
  categories: readonly GameQuestionCategoryItem[]
  categoryId: string | null
  onCategoryChange: (value: string | null) => void
  status: QuestionCatalogStatus
  onStatusChange: (value: QuestionCatalogStatus) => void
  sort: QuestionCatalogSort
  onSortChange: (value: QuestionCatalogSort) => void
  loadingCategories: boolean
  hasFilters: boolean
  onReset: () => void
}) {
  const { t, i18n } = useTranslation()
  const theme = useTheme()
  const expanded = useMediaQuery(theme.breakpoints.up('sm'))
  const [open, setOpen] = useState(false)
  const count = Number(categoryId !== null) + Number(status !== 'all')
  const number = (value: number) => new Intl.NumberFormat(i18n.resolvedLanguage).format(value)
  return (
    <Box sx={{ display: 'grid', gap: 1.25, mt: 1.5 }}>
      <FormTextField
        label={t('gameCatalog.questions.searchLabel')}
        value={search}
        placeholder={t('gameCatalog.questions.catalog.searchHint')}
        onChange={(event) => onSearchChange(event.target.value)}
      />
      <NativeDisclosure
        summary={t('gameCatalog.questions.catalog.filters', { count })}
        pinned={expanded}
        open={open}
        onExpandedChange={setOpen}
        indicator="chevron"
        density="compact"
        data-testid="question-catalog-filters"
      >
        <Box
          sx={{
            display: 'grid',
            gap: 1.25,
            alignItems: 'start',
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0, 1fr))',
              lg: 'repeat(3, minmax(0, 1fr)) auto',
            },
          }}
        >
          <FormSelect
            label={t('common.entities.categories')}
            value={categoryId ?? '__all__'}
            onChange={(value) => onCategoryChange(value === '__all__' ? null : value)}
            disabled={loadingCategories && categories.length === 0}
            options={[
              { value: '__all__', label: t('common.filters.allCategories') },
              ...categories.map((category) => ({
                value: category.id,
                label: category.name + ' (' + number(category.questionCount) + ')',
              })),
            ]}
          />
          <FormSelect<QuestionCatalogStatus>
            label={t('gameCatalog.workspace.status')}
            value={status}
            onChange={onStatusChange}
            options={[
              { value: 'all', label: t('gameCatalog.workspace.all') },
              { value: 'enabled', label: t('gameCatalog.workspace.enabled') },
              { value: 'disabled', label: t('gameCatalog.questions.catalog.disabled') },
            ]}
          />
          <FormSelect<QuestionCatalogSort>
            label={t('gameCatalog.questions.catalog.sort')}
            value={sort}
            onChange={onSortChange}
            options={[
              { value: 'category', label: t('gameCatalog.questions.catalog.sortCategory') },
              { value: 'rewardAsc', label: t('gameCatalog.questions.catalog.sortReward') },
              { value: 'rewardDesc', label: t('gameCatalog.questions.catalog.sortRewardDesc') },
              { value: 'priorityAsc', label: t('gameCatalog.questions.catalog.sortPriorityAsc') },
              { value: 'priorityDesc', label: t('gameCatalog.questions.catalog.sortPriority') },
              { value: 'leastAsked', label: t('gameCatalog.questions.catalog.sortLeastAsked') },
            ]}
          />
          <AppButton tone="secondary" disabled={!hasFilters} onClick={onReset}>
            {t('gameCatalog.workspace.reset')}
          </AppButton>
        </Box>
      </NativeDisclosure>
    </Box>
  )
}
