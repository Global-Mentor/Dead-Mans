import { fireEvent, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, describe, expect, it } from 'vitest'
import i18n from '../../../i18n.ts'
import type { components } from '../../../shared/api/contracts/generated'
import { renderWithAppProviders } from '../../../test/render-with-app-providers.tsx'
import { CurrentGameModifierResults } from './CurrentGameModifierResults.tsx'

type Snapshot = components['schemas']['GameHistoryModifierSnapshotDto']

beforeAll(async () => i18n.changeLanguage('ru'))

function snapshot(overrides: Partial<Snapshot>): Snapshot {
  return {
    modifierId: crypto.randomUUID(),
    versionId: crypto.randomUUID(),
    revision: 2,
    name: 'Исторический модификатор',
    description: 'Полная закреплённая конфигурация',
    category: 'round',
    iconEmoji: null,
    activationCommand: '!история',
    activationCost: 7,
    activationLimit: { count: 2 },
    normalizedTags: ['история'],
    behaviorV2: {
      schemaVersion: 2,
      kind: 'rule',
      phase: 'round',
      performer: 'activeTeam',
      requiresHostMonitoring: false,
      rule: 'Закреплённое правило',
      stackingPolicy: 'aggregateParameters',
      resolution: { type: 'ruleStatus' },
      reward: 'none',
      formulaReference: null,
    },
    conflicts: [],
    successfulActivationsCount: 0,
    cancelledActivationsCount: 0,
    resultsCount: 0,
    isEmergencyDisabled: false,
    emergencyDisabledAtUtc: null,
    ...overrides,
  }
}

function game(
  snapshots: Snapshot[],
  status: 'complete' | 'legacy_unavailable' = 'complete',
): components['schemas']['GameHistoryGameDetailsDto'] {
  return {
    gameId: 'archive',
    gameTitle: 'Archive',
    gameStatus: 'finished',
    createdAtUtc: '2026-09-21T12:00:00Z',
    mainGame: { teamStats: [], playerStats: [], rounds: [], modifierActivations: [] },
    quiz: { totalPoints: 0, playerStats: [], questionSessions: [], manualAwards: [] },
    modifierSnapshots: snapshots,
    modifierSnapshotStatus: status,
  }
}

describe('Archived modifier results', () => {
  it('shows the complete pinned set including unused, cancelled and emergency-disabled entries', () => {
    renderWithAppProviders(
      <MemoryRouter>
        <CurrentGameModifierResults
          includeUnused
          game={game([
            snapshot({ name: 'Не использован' }),
            snapshot({
              name: 'Отменён и отключён',
              successfulActivationsCount: 0,
              cancelledActivationsCount: 1,
              resultsCount: 1,
              isEmergencyDisabled: true,
            }),
          ])}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Не использован')).toBeInTheDocument()
    expect(screen.getByText('Отменён и отключён')).toBeInTheDocument()
    expect(screen.getByText('Аварийно отключён')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Отменён и отключён').closest('summary')!)
    expect(
      screen.getByText('Зафиксировано результатов во всех состояниях раундов: 1'),
    ).toBeInTheDocument()
    expect(
      within(screen.getByText('Отменён и отключён').closest('li')!).getByRole('link', {
        name: 'История редакции',
      }),
    ).toHaveAttribute('href', expect.stringContaining('revision=2'))
  })

  it('shows the legacy warning only when revision snapshots are unavailable', () => {
    renderWithAppProviders(
      <MemoryRouter>
        <CurrentGameModifierResults includeUnused game={game([], 'legacy_unavailable')} />
      </MemoryRouter>,
    )
    expect(screen.getByText(/недостающие редакции не восстанавливаются/i)).toBeInTheDocument()
  })
})
