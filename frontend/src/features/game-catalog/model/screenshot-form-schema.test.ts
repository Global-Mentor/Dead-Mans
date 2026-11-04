import { describe, expect, it } from 'vitest'
import { createScreenshotFormSchema } from './screenshot-form-schema.ts'

const schema = createScreenshotFormSchema(
  {
    required: 'required',
    number: 'number',
    tooLong: 'long',
    maxAnswers: 'limit',
    duplicateAnswers: 'duplicate',
    correctAnswer: 'correct',
  },
  'locations',
)
const values = {
  categoryId: 'manual',
  text: 'What is shown?',
  mapId: '',
  locationId: '',
  reward: '1',
  priority: '0',
  isEnabled: true,
  options: [
    { text: 'Knife', isCorrect: true },
    { text: 'Medkit', isCorrect: false },
  ],
}

describe('screenshot answer modes', () => {
  it('accepts manual answers without map or location', () => {
    expect(schema.safeParse(values).success).toBe(true)
  })
  it('requires a map and location only in the location category', () => {
    expect(schema.safeParse({ ...values, categoryId: 'locations', options: [] }).success).toBe(
      false,
    )
    expect(
      schema.safeParse({
        ...values,
        categoryId: 'locations',
        mapId: 'map',
        locationId: 'location',
        options: [],
      }).success,
    ).toBe(true)
  })
  it('uses ordinary question validation for manual answers', () => {
    for (const options of [
      [],
      [{ text: 'Only', isCorrect: true }],
      [
        { text: 'Knife', isCorrect: true },
        { text: ' knife ', isCorrect: false },
      ],
      values.options.map((option) => ({ ...option, isCorrect: false })),
    ]) {
      const parsed = schema.safeParse({ ...values, options })
      expect(parsed.success).toBe(false)
      if (!parsed.success) expect(parsed.error.issues[0]?.path[0]).toBe('options')
    }
  })
})
