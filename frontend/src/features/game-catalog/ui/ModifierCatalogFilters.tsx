import { Box, useMediaQuery, useTheme } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppButton, FormSelect, FormTextField, NativeDisclosure } from '../../../shared/ui/index.ts'
import {
  modifierCategoryCodes,
  modifierRoundSummaryTypes,
  type ModifierCategoryCode,
  type ModifierRoundSummaryType,
} from '../../game-modifiers/index.ts'

export type ModifierCatalogSort = 'name' | 'cost'

export function ModifierCatalogFilters({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  categoryCounts,
  summaryType,
  onSummaryTypeChange,
  summaryCounts,
  sort,
  onSortChange,
  onReset,
  hasFilters,
}: {
  search: string
  onSearchChange: (value: string) => void
  category: ModifierCategoryCode | null
  onCategoryChange: (value: ModifierCategoryCode | null) => void
  categoryCounts: Record<ModifierCategoryCode, number>
  summaryType: ModifierRoundSummaryType | null
  onSummaryTypeChange: (value: ModifierRoundSummaryType | null) => void
  summaryCounts: Record<ModifierRoundSummaryType, number>
  sort: ModifierCatalogSort
  onSortChange: (value: ModifierCatalogSort) => void
  onReset: () => void
  hasFilters: boolean
}) {
  const { t, i18n } = useTranslation()
  const theme = useTheme()
  const expandedLayout = useMediaQuery(theme.breakpoints.up('sm'))
  const [filtersOpen, setFiltersOpen] = useState(false)
  const number = (value: number) => new Intl.NumberFormat(i18n.resolvedLanguage).format(value)
  return (
    <Box
      sx={{
        mt: 2,
        display: 'grid',
        gap: 1.25,
        alignItems: 'start',
        gridTemplateColumns: {
          xs: 'minmax(0, 1fr)',
          lg: 'minmax(220px, 1fr) minmax(0, 3fr)',
        },
      }}
    >
      <FormTextField
        value={search}
        label={t('common.modifiers.searchLabel')}
        onChange={(event) => onSearchChange(event.target.value)}
      />
      <NativeDisclosure
        summary={t('gameCatalog.modifiers.catalog.filters', {
          count: Number(category !== null) + Number(summaryType !== null),
        })}
        pinned={expandedLayout}
        open={filtersOpen}
        onExpandedChange={setFiltersOpen}
        indicator="chevron"
        density="compact"
        data-testid="modifier-catalog-filters"
      >
        <Box
          sx={{
            display: 'grid',
            gap: 1.25,
            alignItems: 'start',
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              sm: 'repeat(2, minmax(0, 1fr))',
              lg: 'minmax(0, 1fr) minmax(0, 1.3fr) minmax(0, 1fr) auto',
            },
          }}
        >
          <FormSelect<ModifierCategoryCode | 'all'>
            label={t('common.entities.categories')}
            value={category ?? 'all'}
            onChange={(value) => onCategoryChange(value === 'all' ? null : value)}
            options={[
              { value: 'all', label: t('common.filters.allCategories') },
              ...modifierCategoryCodes.map((value) => ({
                value,
                label: `${t(`common.modifiers.categories.${value}`)} (${number(categoryCounts[value])})`,
              })),
            ]}
          />
          <FormSelect<ModifierRoundSummaryType | 'all'>
            label={t('gameCatalog.modifiers.roundSummaryTitle')}
            value={summaryType ?? 'all'}
            onChange={(value) => onSummaryTypeChange(value === 'all' ? null : value)}
            options={[
              { value: 'all', label: t('gameCatalog.modifiers.allRoundSummaries') },
              ...modifierRoundSummaryTypes.map((value) => ({
                value,
                label: `${t(`gameCatalog.modifiers.roundSummaryType.${value}`)} (${number(summaryCounts[value])})`,
              })),
            ]}
          />
          <FormSelect
            label={t('gameCatalog.modifiers.catalog.sort')}
            value={sort}
            onChange={onSortChange}
            options={[
              { value: 'name', label: t('gameCatalog.modifiers.catalog.sortName') },
              { value: 'cost', label: t('gameCatalog.modifiers.catalog.sortCost') },
            ]}
          />
          <AppButton tone="ghost" disabled={!hasFilters} onClick={onReset}>
            {t('gameCatalog.modifiers.catalog.resetFilters')}
          </AppButton>
        </Box>
      </NativeDisclosure>
    </Box>
  )
}
