import { describe, expect, it } from 'vitest'
import { getQuestionDisplayAnswers, normalizeQuestionAnswer } from './question-answer-normalize.ts'
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
  it.each([
    ['\u0085Paris\u0085', 'paris'],
    ['Paris\u0085France', 'paris france'],
    ['\uFEFFParis\uFEFF', '\uFEFFparis\uFEFF'],
    ['ΟΣ', 'οσ'],
    ['İ', 'İ'],
  ])('uses server-compatible Unicode normalization for %s', (input, expected) => {
    expect(normalizeQuestionAnswer(input)).toBe(expected)
  })
  it('collapses whitespace and maps yo to ye like the backend', () => {
    expect(normalizeQuestionAnswer('  Ёлки   зелёные  ')).toBe('елки зеленые')
  })

  it('falls back to the answer field when the answers array is blank', () => {
    expect(getQuestionDisplayAnswers({ answer: 'Paris', answers: ['', '  '] })).toEqual(['Paris'])
  })
})

describe('question form schema', () => {
  it('preserves distinct server answers when opening and submitting the form', () => {
    const parsed = createQuestionFormSchema(messages).safeParse(values(['Paris', '\uFEFFParis']))
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.answers[1]?.value).toBe('\uFEFFParis')
  })

  it('rejects server-equivalent Greek answers', () => {
    expect(createQuestionFormSchema(messages).safeParse(values(['ΟΣ', 'οσ'])).success).toBe(false)
  })
  it('accepts several unique equivalent answers', () => {
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
