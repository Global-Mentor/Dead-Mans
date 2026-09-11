import { describe, expect, it } from 'vitest'
import {
  getQuestionDisplayAnswers,
  normalizeQuestionAnswer,
  uniqueTrimmedAnswers,
} from './question-answer-normalize.ts'
import { createQuestionFormSchema } from './question-form-schema.ts'

const messages = {
  required: 'required',
  number: 'number',
  tooLong: 'too long',
  maxAnswers: 'too many',
  duplicateAnswers: 'duplicate',
}

function values(answers: string[]) {
  return {
    categoryId: '11111111-1111-1111-1111-111111111111',
    text: 'Capital?',
    answers: answers.map((value) => ({ value })),
    reward: '1',
    priority: '0',
    isEnabled: true,
  }
}

describe('question answer normalize', () => {
  it('collapses whitespace and maps yo to ye like the backend', () => {
    expect(normalizeQuestionAnswer('  Ёлки   зелёные  ')).toBe('елки зеленые')
  })

  it('keeps the first display form when normalized values collide', () => {
    expect(uniqueTrimmedAnswers(['Paris', '  paris ', 'Париж'])).toEqual(['Paris', 'Париж'])
  })

  it('falls back to the primary answer when the answers array is blank', () => {
    expect(getQuestionDisplayAnswers({ answer: 'Paris', answers: ['', '  '] })).toEqual(['Paris'])
  })
})

describe('question form schema', () => {
  it('accepts a primary answer and unique alternatives', () => {
    const parsed = createQuestionFormSchema(messages).safeParse(values(['Paris', 'Париж']))
    expect(parsed.success).toBe(true)
  })

  it('rejects a duplicate after normalization', () => {
    const parsed = createQuestionFormSchema(messages).safeParse(values(['Paris', ' paris ']))
    expect(parsed.success).toBe(false)
    if (parsed.success) {
      return
    }
    expect(parsed.error.issues.some((issue) => issue.message === 'duplicate')).toBe(true)
  })

  it('rejects more than ten answers', () => {
    const answers = Array.from({ length: 11 }, (_, index) => `Answer ${index + 1}`)
    const parsed = createQuestionFormSchema(messages).safeParse(values(answers))
    expect(parsed.success).toBe(false)
    if (parsed.success) {
      return
    }
    expect(parsed.error.issues.some((issue) => issue.message === 'too many')).toBe(true)
  })

  it('rejects an answer longer than 500 characters with the length message', () => {
    const parsed = createQuestionFormSchema(messages).safeParse(values(['a'.repeat(501)]))
    expect(parsed.success).toBe(false)
    if (parsed.success) {
      return
    }
    expect(parsed.error.issues.some((issue) => issue.message === 'too long')).toBe(true)
  })
})
