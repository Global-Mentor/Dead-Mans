import { keepPreviousData, queryOptions, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { huntMapName } from '../../shared/game-ui/index.ts'
import { gameQuestionQueryKeys } from '../game-questions/index.ts'
import {
  fetchQuestionCatalogPage,
  type CatalogPageFilters,
} from './api/question-catalog-page-api.ts'
import type { QuestionCatalogSort, QuestionCatalogStatus } from './model/question-catalog.ts'
import type { GameQuestionCatalogPage } from '../../shared/api/contracts/index.ts'

type Filters = {
  search: string
  categoryId: string | null
  status: QuestionCatalogStatus
  sort: QuestionCatalogSort
  mapId: string | null
  locationId: string | null
  page: number
}

const initialFilters: Filters = {
  search: '',
  categoryId: null,
  status: 'all',
  sort: 'category',
  mapId: null,
  locationId: null,
  page: 1,
}

function catalogPageQueryOptions(filters: CatalogPageFilters) {
  return queryOptions({
    queryKey: [...gameQuestionQueryKeys.pages, filters],
    queryFn: ({ signal }) => fetchQuestionCatalogPage(filters, signal),
    placeholderData: keepPreviousData,
  })
}

export function useCatalogPage(format: 'text' | 'screenshot') {
  const { i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? 'en'
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<Filters>(initialFilters)
  const [lastLoadedView, setLastLoadedView] = useState<{
    key: string
    queryFilters: CatalogPageFilters
    filters: Filters
  } | null>(null)
  const queryFilters: CatalogPageFilters = {
    format,
    search: filters.search.trim(),
    status: filters.status,
    sort: filters.sort,
    page: filters.page,
    pageSize: 40,
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.mapId ? { mapId: filters.mapId } : {}),
    ...(filters.locationId ? { locationId: filters.locationId } : {}),
  }
  const viewKey = JSON.stringify(queryFilters)
  const query = useQuery(catalogPageQueryOptions(queryFilters))
  if (query.isSuccess && !query.isPlaceholderData && lastLoadedView?.key !== viewKey)
    setLastLoadedView({ key: viewKey, queryFilters, filters })
  const previousPage =
    query.isError && !query.data && lastLoadedView?.queryFilters.format === format
      ? queryClient.getQueryData<GameQuestionCatalogPage>(
          catalogPageQueryOptions(lastLoadedView.queryFilters).queryKey,
        )
      : undefined
  const catalogQuery = {
    data: query.data ?? previousPage,
    isLoading: query.isLoading,
    isError: query.isError,
    isSuccess: query.isSuccess,
    refetch: query.refetch,
  }
  const update = (patch: Partial<Filters>) => setFilters((old) => ({ ...old, page: 1, ...patch }))
  const maps = catalogQuery.data?.maps ?? []
  const options = (items: readonly { id: string; names: Record<string, string> }[]) =>
    items
      .map((item) => ({ value: item.id, label: huntMapName(item.names, locale) }))
      .sort((a, b) => a.label.localeCompare(b.label, locale))
  return {
    catalogQuery,
    viewKey,
    returnToLoadedView:
      previousPage && lastLoadedView ? () => setFilters(lastLoadedView.filters) : null,
    search: filters.search,
    setSearch: (search: string) => update({ search }),
    selectedCategoryId: filters.categoryId,
    setSelectedCategoryId: (categoryId: string | null) => update({ categoryId }),
    status: filters.status,
    setStatus: (status: QuestionCatalogStatus) => update({ status }),
    sort: filters.sort,
    setSort: (sort: QuestionCatalogSort) => update({ sort }),
    setPage: (page: number) => update({ page }),
    resetFilters: () => setFilters(initialFilters),
    hasFilters: Boolean(
      filters.search.trim() ||
      filters.categoryId ||
      filters.mapId ||
      filters.locationId ||
      filters.status !== 'all' ||
      filters.sort !== 'category',
    ),
    locationFilters: {
      maps: options(maps),
      locations: options(maps.find((map) => map.id === filters.mapId)?.locations ?? []),
      mapId: filters.mapId,
      locationId: filters.locationId,
      onMapChange: (mapId: string | null) => update({ mapId, locationId: null }),
      onLocationChange: (locationId: string | null) => update({ locationId }),
    },
  }
}
