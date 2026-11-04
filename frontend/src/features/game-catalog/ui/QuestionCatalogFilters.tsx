import {
  ScreenshotLocationFilters,
  type ScreenshotLocationFiltersProps,
} from '../../../shared/game-ui/index.ts'
import { Box, useMediaQuery, useTheme } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameQuestionCategoryItem } from '../../../shared/api/contracts/index.ts'
import { AppButton, FormSelect, FormTextField, NativeDisclosure } from '../../../shared/ui/index.ts'
import type { QuestionCatalogSort, QuestionCatalogStatus } from '../model/question-catalog.ts'

export function QuestionCatalogFilters({
  screenshots = false,
  locationFilters,
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
  screenshots?: boolean
  locationFilters: ScreenshotLocationFiltersProps
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
  const count =
    Number(categoryId !== null) +
    Number(status !== 'all') +
    Number(locationFilters.mapId !== null) +
    Number(locationFilters.locationId !== null)
  const number = (value: number) => new Intl.NumberFormat(i18n.resolvedLanguage).format(value)
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1.25,
        mt: 1.5,
        gridTemplateColumns: screenshots
          ? { xs: 'minmax(0, 1fr)', xl: 'minmax(0, 1.1fr) minmax(0, 1fr)' }
          : 'minmax(0, 1fr)',
        alignItems: 'start',
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gap: 1.25,
          minWidth: 0,
          gridTemplateColumns: screenshots
            ? {
                xs: 'repeat(2, minmax(0, 1fr))',
                sm: 'minmax(0, 1.3fr) minmax(0, 1fr) minmax(0, 1.1fr)',
              }
            : 'minmax(0, 1fr)',
        }}
      >
        <FormTextField
          sx={{ gridColumn: screenshots ? { xs: '1 / -1', sm: 'auto' } : undefined }}
          density="compact"
          label={t(
            screenshots ? 'gameCatalog.screenshots.search' : 'gameCatalog.questions.searchLabel',
          )}
          value={search}
          placeholder={t(
            screenshots
              ? 'gameCatalog.screenshots.searchHint'
              : 'gameCatalog.questions.catalog.searchHint',
          )}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        {screenshots ? <ScreenshotLocationFilters {...locationFilters} /> : null}
      </Box>
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
            density="compact"
            label={t('common.entities.categories')}
            value={categoryId ?? '__all__'}
            onChange={(value) => onCategoryChange(value === '__all__' ? null : value)}
            disabled={loadingCategories && categories.length === 0}
            options={[
              { value: '__all__', label: t('common.filters.allCategories') },
              ...categories.map((category) => ({
                value: category.id,
                label:
                  (category.isLocationCategory
                    ? t('gameCatalog.screenshots.locationCategory')
                    : category.name) +
                  ' (' +
                  number(category.questionCount) +
                  ')',
              })),
            ]}
          />
          <FormSelect<QuestionCatalogStatus>
            density="compact"
            label={t('gameCatalog.workspace.status')}
            value={status}
            onChange={onStatusChange}
            options={[
              {
                value: 'all',
                label: t(screenshots ? 'gameCatalog.screenshots.all' : 'gameCatalog.workspace.all'),
              },
              { value: 'enabled', label: t('gameCatalog.workspace.enabled') },
              { value: 'disabled', label: t('gameCatalog.questions.catalog.disabled') },
            ]}
          />
          <FormSelect<QuestionCatalogSort>
            density="compact"
            label={t('gameCatalog.questions.catalog.sort')}
            value={sort}
            onChange={onSortChange}
            options={[
              {
                value: 'category',
                label: t(
                  screenshots
                    ? 'gameCatalog.screenshots.sortCategory'
                    : 'gameCatalog.questions.catalog.sortCategory',
                ),
              },
              { value: 'rewardAsc', label: t('gameCatalog.questions.catalog.sortReward') },
              { value: 'rewardDesc', label: t('gameCatalog.questions.catalog.sortRewardDesc') },
              { value: 'priorityAsc', label: t('gameCatalog.questions.catalog.sortPriorityAsc') },
              { value: 'priorityDesc', label: t('gameCatalog.questions.catalog.sortPriority') },
              { value: 'leastAsked', label: t('gameCatalog.questions.catalog.sortLeastAsked') },
            ]}
          />
          <AppButton size="small" tone="secondary" disabled={!hasFilters} onClick={onReset}>
            {t('gameCatalog.workspace.reset')}
          </AppButton>
        </Box>
      </NativeDisclosure>
    </Box>
  )
}
