import { describe, expect, it } from 'vitest'
import { summarizeQuizFormats } from './quiz-statistics.ts'

const image = { imageUrl: '/screenshot.png', mapNames: {}, optionNames: {} }

describe('quiz format statistics', () => {
  it('separates recorded results and participants without attributing manual awards to a format', () => {
    const result = summarizeQuizFormats({
      questionSessions: [{ questionSessionId: 'text' }, { questionSessionId: 'image', image }],
      playerStats: [
        {
          textStatistics: { attempts: 3, correctAnswers: 2, points: 7 },
          screenshotStatistics: { attempts: 1, correctAnswers: 0, points: 0 },
        },
        {
          textStatistics: { attempts: 0, correctAnswers: 0, points: 0 },
          screenshotStatistics: { attempts: 1, correctAnswers: 1, points: 10 },
        },
        {
          textStatistics: { attempts: 0, correctAnswers: 0, points: 0 },
          screenshotStatistics: { attempts: 0, correctAnswers: 0, points: 0 },
        },
      ],
    })
    expect(result.text).toEqual({
      asked: 1,
      players: 1,
      attempts: 3,
      correct: 2,
      incorrect: 1,
      accuracy: expect.any(Number),
      earned: 7,
    })
    expect(result.text.accuracy).toBeCloseTo(66.67, 2)
    expect(result.screenshot).toEqual({
      asked: 1,
      players: 2,
      attempts: 2,
      correct: 1,
      incorrect: 1,
      accuracy: 50,
      earned: 10,
    })
  })

  it('counts an active screenshot once and preserves the format of the recorded snapshot', () => {
    const quiz = { questionSessions: [{ questionSessionId: 'image', image }], playerStats: [] }
    expect(summarizeQuizFormats(quiz, { questionSessionId: 'image' }).screenshot.asked).toBe(1)
    const active = summarizeQuizFormats(quiz, { questionSessionId: 'new', image })
    expect(active.screenshot.asked).toBe(2)
    expect(active.text.asked).toBe(0)
    expect(active.screenshot.correct).toBe(0)
    expect(active.screenshot.accuracy).toBeNull()
  })

  it('does not invent accuracy or participation for absent format results', () => {
    const result = summarizeQuizFormats({ questionSessions: [], playerStats: [{}] })
    for (const format of Object.values(result)) {
      expect(format).toEqual({
        asked: 0,
        players: 0,
        attempts: 0,
        correct: 0,
        incorrect: 0,
        accuracy: null,
        earned: 0,
      })
    }
  })
})
