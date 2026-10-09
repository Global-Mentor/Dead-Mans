import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import i18n from '../../i18n.ts'
import { renderWithAppProviders } from '../../test/render-with-app-providers.tsx'
import { ModifierHistoryPage } from './ModifierHistoryPage.tsx'
import {
  fetchModifierHistory,
  fetchModifierVersion,
  fetchModifierVersions,
} from './api/modifier-history-api.ts'

const modifierId = '10000000-0000-0000-0000-000000000001'
const versionId = '20000000-0000-0000-0000-000000000001'
const gameId = '30000000-0000-0000-0000-000000000001'

beforeAll(async () => i18n.changeLanguage('ru'))
afterEach(cleanup)

vi.mock('./api/modifier-history-api.ts', () => ({
  fetchModifierHistory: vi.fn(async () => ({
    items: [
      {
        modifierId,
        currentRevision: 2,
        name: 'Архивная редакция',
        category: 'round',
        iconEmoji: '🧭',
        activationCost: 9,
        isArchived: true,
        createdAtUtc: '2026-08-01T09:00:00Z',
        archivedAtUtc: '2026-09-02T09:00:00Z',
        versionCount: 2,
        gamesCount: 1,
        activationsCount: 1,
      },
    ],
    nextCursor: null,
  })),
  fetchModifierVersions: vi.fn(async () => ({
    items: [
      {
        versionId,
        modifierId,
        revision: 2,
        name: 'Архивная редакция',
        createdAtUtc: '2026-09-01T09:00:00Z',
        createdByUserId: null,
        createdByDisplayName: 'Администратор',
        changeNote: null,
        changeType: 'compatibility_cascade',
        cascadeSourceModifierId: null,
        changedFields: ['compatibility'],
      },
    ],
    nextCursor: null,
  })),
  fetchModifierVersion: vi.fn(async (_modifierId: string, revision: number) => ({
    versionId,
    modifierId,
    revision,
    name: revision === 1 ? 'Первая редакция' : 'Архивная редакция',
    description: 'Сохранённое описание',
    category: 'round',
    iconEmoji: '🧭',
    activationCommand: '!архив',
    activationCost: revision === 1 ? 4 : 9,
    activationLimit: { count: 2 },
    normalizedTags: ['история'],
    behaviorV2: {
      schemaVersion: 2,
      kind: 'rule',
      phase: 'round',
      performer: 'activeTeam',
      requiresHostMonitoring: false,
      rule: revision === 1 ? 'Первое правило' : 'Неизменяемое правило',
      stackingPolicy: 'aggregateParameters',
      resolution: { type: 'ruleStatus' },
      reward: 'none',
      formulaReference: null,
    },
    conflicts:
      revision === 1
        ? []
        : [{ modifierId: '40000000-0000-0000-0000-000000000001', name: 'Конфликт-снимок' }],
    createdAtUtc: '2026-09-01T09:00:00Z',
    createdByUserId: null,
    createdByDisplayName: 'Администратор',
    changeNote: '<img src=x onerror=alert(1)>',
    changeType: 'compatibility_cascade',
    cascadeSourceModifierId: '50000000-0000-0000-0000-000000000001',
    changedFields:
      revision === 1
        ? ['created']
        : ['compatibility', 'activationCost', 'normalizedTags', 'behaviorV2'],
    isCurrent: revision === 2,
    isArchived: true,
  })),
  fetchModifierVersionGames: vi.fn(async () => ({
    items: [
      {
        gameId,
        gameTitle: 'Игра со второй редакцией',
        gameStatus: 'finished',
        startedAtUtc: '2026-09-01T10:00:00Z',
        finishedAtUtc: '2026-09-01T12:00:00Z',
        successfulActivationsCount: 0,
        cancelledActivationsCount: 1,
        resultsCount: 1,
        isEmergencyDisabled: true,
      },
    ],
    nextCursor: null,
  })),
}))

describe('ModifierHistoryPage', () => {
  function renderHistory(entry: string) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    renderWithAppProviders(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[entry]}>
          <ModifierHistoryPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )
  }

  it('selects the first modifier and its latest revision when opening the archive', async () => {
    renderHistory('/panel/modifier-history')
    expect(await screen.findByText('Сохранённое описание')).toBeVisible()
    expect(screen.queryByText('Неизменяемое правило')).not.toBeInTheDocument()
    expect(screen.queryByText('!архив')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '🧭 Архивная редакция', exact: true })).toBeVisible()
    expect(screen.getByText('Текущая', { exact: true })).toBeVisible()
  })

  it('retries revision discovery instead of leaving the first selection loading forever', async () => {
    vi.mocked(fetchModifierVersions).mockRejectedValueOnce(new Error('Temporary failure'))
    renderHistory('/panel/modifier-history?modifierId=' + modifierId)
    expect(await screen.findByText(i18n.t('modifierHistory.error'))).toBeVisible()
    expect(screen.queryByText(i18n.t('modifierHistory.loading'))).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.actions.retry') }))
    expect(
      await screen.findByRole('heading', { name: '🧭 Архивная редакция', exact: true }),
    ).toBeVisible()
  })

  it('keeps the older revision explicitly requested in the URL', async () => {
    renderHistory('/panel/modifier-history?modifierId=' + modifierId + '&revision=1')
    expect(
      await screen.findByRole('heading', { name: '🧭 Первая редакция', exact: true }),
    ).toBeVisible()
    expect(screen.queryByText('Текущая', { exact: true })).not.toBeInTheDocument()
  })

  it('does not show the previous revision while the selected revision is loading', async () => {
    const original = vi.mocked(fetchModifierVersion).getMockImplementation()!
    let finishRequest!: () => void
    renderHistory('/panel/modifier-history?modifierId=' + modifierId + '&revision=1&tab=revisions')
    expect(
      await screen.findByRole('heading', { name: '🧭 Первая редакция', exact: true }),
    ).toBeVisible()
    vi.mocked(fetchModifierVersion).mockImplementationOnce(async (id, revision) => {
      await new Promise<void>((resolve) => {
        finishRequest = resolve
      })
      return original(id, revision)
    })
    fireEvent.click(
      within(screen.getByRole('tabpanel', { name: 'Редакции' })).getByRole('button', {
        name: /Редакция 2/,
      }),
    )
    await waitFor(() => expect(finishRequest).toBeTypeOf('function'))
    expect(
      screen.queryByRole('heading', { name: '🧭 Первая редакция', exact: true }),
    ).not.toBeInTheDocument()
    finishRequest()
    expect(
      await screen.findByRole('heading', { name: '🧭 Архивная редакция', exact: true }),
    ).toBeVisible()
  })

  it('shows an empty archive without requesting a modifier', async () => {
    vi.mocked(fetchModifierHistory).mockResolvedValueOnce({ items: [], nextCursor: null })
    renderHistory('/panel/modifier-history')
    expect(await screen.findByText('По фильтрам ничего не найдено.')).toBeVisible()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  })

  it('renders archived cascade detail, semantic diff and related game without mutation controls', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    renderWithAppProviders(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={[`/panel/modifier-history?modifierId=${modifierId}&revision=2`]}
        >
          <ModifierHistoryPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Сохранённое описание')).toBeVisible()
    expect(screen.queryByText('Неизменяемое правило')).not.toBeInTheDocument()
    expect(screen.queryByText('!архив')).not.toBeInTheDocument()
    expect(screen.queryByText('Теги', { exact: true })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Изменения' }))
    expect(screen.getByText('Каскад совместимости')).toBeVisible()
    expect(screen.getAllByText('В архиве').length).toBeGreaterThan(0)
    expect(screen.getByText('Совместимость')).toBeInTheDocument()
    expect(screen.queryByText('Теги', { exact: true })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Стало: Теги' })).not.toBeInTheDocument()
    expect(
      within(screen.getByRole('group', { name: 'Было: Совместимость' })).getByText(
        'Конфликтов нет',
      ),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole('group', { name: 'Стало: Совместимость' })).getByText(
        'Конфликт-снимок',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Правило: Неизменяемое правило', { exact: true }),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Поведение', exact: true }))
    expect(screen.queryByText('Правило: Первое правило', { exact: true })).not.toBeInTheDocument()
    expect(
      screen.queryByText('Правило: Неизменяемое правило', { exact: true }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/schemaVersion: 2/)).not.toBeInTheDocument()
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
    expect(document.querySelector('img[src="x"]')).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'Конфигурация' }))
    expect(
      within(screen.getByRole('tabpanel', { name: 'Конфигурация' })).getByText('Конфликт-снимок'),
    ).toBeVisible()
    const configuration = within(screen.getByRole('tabpanel', { name: 'Конфигурация' }))
    fireEvent.click(configuration.getByRole('button', { name: 'Поведение', exact: true }))
    expect(configuration.getByText('Формула', { exact: true })).toBeVisible()
    expect(screen.queryByText(/returned an object instead of string/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Связанные игры' }))
    expect(screen.getByText('Аварийно отключён')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Посмотреть игру: Игра со второй редакцией' }),
    ).toHaveAttribute('href', `/panel/game-history?gameId=${gameId}`)
    expect(
      screen.getByRole('heading', { name: 'Игра со второй редакцией' }).closest('a'),
    ).toBeNull()
    expect(screen.queryByText('Отменено', { exact: true })).not.toBeInTheDocument()
    expect(screen.queryByText('Результатов', { exact: true })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /редактировать|удалить/i })).not.toBeInTheDocument()
  })
})
