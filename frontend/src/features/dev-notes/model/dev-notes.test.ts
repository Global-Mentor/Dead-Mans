import { describe, expect, it } from 'vitest'
import { loadDevNotes, parseDevNotes, resolveDevNoteText } from './dev-notes.ts'

describe('dev notes', () => {
  it('loads and sorts the committed changelog newest first', () => {
    expect(loadDevNotes().map((note) => note.id)).toEqual([
      '2026-09-12-game-application-ui',
      '2026-09-12-empty-teams-preview',
      '2026-09-11-multiple-answers',
      '2026-09-10-remove-player',
      '2026-09-10-closed-testing',
    ])
  })

  it('sorts notes from newest to oldest', () => {
    const notes = parseDevNotes({
      notes: [
        {
          id: 'older',
          publishedAt: '2026-01-01T00:00:00.000Z',
          status: 'fix',
          title: 'Older',
          body: 'First',
        },
        {
          id: 'newer',
          publishedAt: '2026-09-11T12:00:00.000Z',
          status: 'feature',
          title: 'Newer',
          body: 'Second',
        },
      ],
    })

    expect(notes.map((note) => note.id)).toEqual(['newer', 'older'])
  })

  it('prefers the active language and falls back to ru then en', () => {
    const localized = { ru: 'Русский', en: 'English' }

    expect(resolveDevNoteText(localized, 'uk')).toBe('Русский')
    expect(resolveDevNoteText(localized, 'en-US')).toBe('English')
    expect(resolveDevNoteText('Plain', 'pl')).toBe('Plain')
  })

  it('rejects an unknown status', () => {
    expect(() =>
      parseDevNotes({
        notes: [
          {
            id: 'bad',
            publishedAt: '2026-09-11T12:00:00.000Z',
            status: 'hotfix',
            title: 'Bad',
            body: 'Nope',
          },
        ],
      }),
    ).toThrow()
  })
})
