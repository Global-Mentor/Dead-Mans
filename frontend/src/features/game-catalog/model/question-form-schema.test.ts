import { describe, expect, it } from 'vitest'
import { getQuestionDisplayOptions, normalizeQuestionAnswer } from './question-answer-normalize.ts'
import { createQuestionFormSchema } from './question-form-schema.ts'

const messages = {
  required: 'required',
  number: 'number',
  tooLong: 'too long',
  maxAnswers: 'too many',
  duplicateAnswers: 'duplicate',
  correctAnswer: 'correct',
}

function values(answers: string[]) {
  return {
    categoryId: '11111111-1111-1111-1111-111111111111',
    text: 'Capital?',
    options: answers.map((text, index) => ({ text, isCorrect: index === 0 })),
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

  it('keeps the configured option order', () => {
    expect(
      getQuestionDisplayOptions({
        options: [
          { text: 'Second', isCorrect: false, sortOrder: 1 },
          { text: 'First', isCorrect: true, sortOrder: 0 },
        ],
      }).map((option) => option.text),
    ).toEqual(['First', 'Second'])
  })
})

describe('question form schema', () => {
  it('preserves distinct server answers when opening and submitting the form', () => {
    const parsed = createQuestionFormSchema(messages).safeParse(values(['Paris', '\uFEFFParis']))
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.options[1]?.text).toBe('\uFEFFParis')
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
    const parsed = createQuestionFormSchema(messages).safeParse(values(['a'.repeat(501), 'valid']))
    expect(parsed.success).toBe(false)
    if (parsed.success) {
      return
    }
    expect(parsed.error.issues.some((issue) => issue.message === 'too long')).toBe(true)
  })

  it('requires between two and ten options and exactly one correct option', () => {
    expect(createQuestionFormSchema(messages).safeParse(values(['only one'])).success).toBe(false)
    const noCorrect = values(['one', 'two'])
    noCorrect.options.forEach((option) => {
      option.isCorrect = false
    })
    expect(createQuestionFormSchema(messages).safeParse(noCorrect).success).toBe(false)
    const twoCorrect = values(['one', 'two'])
    twoCorrect.options.forEach((option) => {
      option.isCorrect = true
    })
    expect(createQuestionFormSchema(messages).safeParse(twoCorrect).success).toBe(false)
  })
})
