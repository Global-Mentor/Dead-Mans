import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { fetchQuestionCatalogPage } from './api/question-catalog-page-api.ts'
import { useCatalogPage } from './use-catalog-page.ts'

vi.mock(import('./api/question-catalog-page-api.ts'), () => ({ fetchQuestionCatalogPage: vi.fn() }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { resolvedLanguage: 'en' } }) }))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

it('requests bounded pages and resets the page when server filters change', async () => {
  vi.mocked(fetchQuestionCatalogPage).mockImplementation(async (filters) => ({
    items: [],
    totalCount: 81,
    page: filters.page ?? 1,
    pageSize: 40,
    maps: [
      {
        id: 'map',
        code: 'map',
        names: { en: 'Map' },
        locations: [{ id: 'location', code: 'location', names: { en: 'Location' } }],
      },
    ],
  }))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const { result } = renderHook(() => useCatalogPage('screenshot'), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  })
  await waitFor(() => expect(result.current.catalogQuery.isSuccess).toBe(true))
  act(() => result.current.setPage(3))
  await waitFor(() => expect(result.current.catalogQuery.data?.page).toBe(3))
  act(() => result.current.locationFilters.onMapChange('map'))
  await waitFor(() =>
    expect(fetchQuestionCatalogPage).toHaveBeenLastCalledWith(
      expect.objectContaining({ format: 'screenshot', page: 1, pageSize: 40, mapId: 'map' }),
      expect.any(AbortSignal),
    ),
  )
  expect(result.current.locationFilters.locations).toEqual([
    { value: 'location', label: 'Location' },
  ])
  act(() => result.current.locationFilters.onLocationChange('location'))
  act(() => result.current.setPage(2))
  act(() => result.current.setSearch('  Target  '))
  await waitFor(() =>
    expect(fetchQuestionCatalogPage).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'Target', page: 1, locationId: 'location' }),
      expect.any(AbortSignal),
    ),
  )
  act(() => result.current.locationFilters.onMapChange(null))
  await waitFor(() =>
    expect(fetchQuestionCatalogPage).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ locationId: 'location' }),
      expect.any(AbortSignal),
    ),
  )
})

it('retains the last successful page when navigating to another page fails', async () => {
  const firstPage = { items: [], totalCount: 81, page: 1, pageSize: 40, maps: [] }
  vi.mocked(fetchQuestionCatalogPage).mockImplementation(async (filters) => {
    if (filters.page === 2) throw new Error('Page unavailable')
    return firstPage
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const { result } = renderHook(() => useCatalogPage('screenshot'), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  })
  await waitFor(() => expect(result.current.catalogQuery.isSuccess).toBe(true))
  act(() => result.current.setPage(2))
  await waitFor(() => expect(result.current.catalogQuery.isError).toBe(true))
  expect(result.current.catalogQuery.data).toEqual(firstPage)
  expect(result.current.returnToLoadedView).not.toBeNull()
  act(() => result.current.returnToLoadedView?.())
  await waitFor(() => expect(result.current.catalogQuery.isSuccess).toBe(true))
  expect(result.current.catalogQuery.data?.page).toBe(1)
  expect(result.current.returnToLoadedView).toBeNull()
})
