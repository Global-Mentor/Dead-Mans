import { describe, expect, it } from 'vitest'
import { resolveHistoryTeamSelection } from './game-history-team-selection.ts'

const selection = {
  teamIds: ['winner', 'own'],
  teamMembers: [],
  rounds: [
    {
      teamId: 'winner',
      roundId: 'old-round',
      startedAtUtc: '2026-11-05T10:00:00Z',
      participants: [
        { userId: 'other', displayName: 'Same nickname', createdAtUtc: '2026-11-05T10:00:00Z' },
      ],
    },
    {
      teamId: 'own',
      roundId: 'new-round',
      startedAtUtc: '2026-11-05T11:00:00Z',
      participants: [
        { userId: 'me', displayName: 'Old nickname', createdAtUtc: '2026-11-05T10:00:00Z' },
      ],
    },
  ],
  requestedTeamId: null,
  userId: 'me',
  focusOwnTeam: true,
}

describe('profile entry to game results', () => {
  it('selects the own historical team by stable user ID instead of the winning team', () => {
    expect(resolveHistoryTeamSelection(selection)).toBe('own')
  })

  it('keeps ordinary history entry on the first team', () => {
    expect(resolveHistoryTeamSelection({ ...selection, focusOwnTeam: false })).toBe('winner')
  })

  it('preserves an explicit valid team selection over the own-team hint', () => {
    expect(resolveHistoryTeamSelection({ ...selection, requestedTeamId: 'winner' })).toBe('winner')
    expect(resolveHistoryTeamSelection({ ...selection, requestedTeamId: 'stale' })).toBe('own')
  })

  it('falls back when the user or their historical team is absent from the final result', () => {
    expect(resolveHistoryTeamSelection({ ...selection, userId: 'spectator' })).toBe('winner')
    expect(resolveHistoryTeamSelection({ ...selection, userId: undefined })).toBe('winner')
    expect(resolveHistoryTeamSelection({ ...selection, teamIds: ['winner'] })).toBe('winner')
    expect(resolveHistoryTeamSelection({ ...selection, teamIds: [] })).toBeNull()
  })

  it('resolves afresh for a changed identity without retaining the previous user selection', () => {
    expect(resolveHistoryTeamSelection({ ...selection, userId: 'other' })).toBe('winner')
  })

  it('selects the current saved membership even if the user previously played for another team', () => {
    expect(
      resolveHistoryTeamSelection({
        ...selection,
        teamMembers: [{ teamId: 'winner', userId: 'me' }],
      }),
    ).toBe('winner')
  })

  it('selects a registered member without a round participant snapshot', () => {
    expect(
      resolveHistoryTeamSelection({
        ...selection,
        rounds: [],
        teamMembers: [{ teamId: 'own', userId: 'me' }],
      }),
    ).toBe('own')
  })

  it('uses the latest historical team when no current membership remains', () => {
    expect(
      resolveHistoryTeamSelection({
        ...selection,
        rounds: selection.rounds.map((round) => ({
          ...round,
          participants: [
            { userId: 'me', displayName: 'Old name', createdAtUtc: round.startedAtUtc },
          ],
        })),
      }),
    ).toBe('own')
  })
})
