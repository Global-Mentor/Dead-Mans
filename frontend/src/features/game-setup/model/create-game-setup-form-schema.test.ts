import { describe, expect, it } from 'vitest'
import {
  createGameSetupFormSchema,
  type CreateGameSetupFormValues,
} from './create-game-setup-form-schema.ts'

const schema = createGameSetupFormSchema({
  required: 'required',
  invalidTitle: 'invalid',
})

describe('createGameSetupFormSchema', () => {
  it('trims a valid title and infers the submitted form shape', () => {
    const values: CreateGameSetupFormValues = schema.parse({ title: '  Hunt night  ' })

    expect(values).toEqual({ title: 'Hunt night' })
  })

  it('rejects empty and oversized titles', () => {
    expect(schema.safeParse({ title: '   ' }).error?.issues[0]?.message).toBe('required')
    expect(schema.safeParse({ title: 'x'.repeat(201) }).error?.issues[0]?.message).toBe('invalid')
  })
})
