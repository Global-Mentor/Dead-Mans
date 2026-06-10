import { describe, expect, it } from 'vitest'
import { authSessionSchema } from './auth-session-schema.ts'

describe('authSessionSchema', () => {
  it('accepts the generated auth contract shape', () => {
    expect(
      authSessionSchema.parse({
        userId: 'bca109e8-0662-4407-b940-19d168f0f59f',
        displayName: 'Hunter',
        roles: ['admin', 'viewer'],
      }),
    ).toEqual({
      userId: 'bca109e8-0662-4407-b940-19d168f0f59f',
      displayName: 'Hunter',
      roles: ['admin', 'viewer'],
    })
  })

  it('rejects unknown roles and malformed ids', () => {
    expect(() =>
      authSessionSchema.parse({
        userId: 'not-a-uuid',
        displayName: 'Hunter',
        roles: ['owner'],
      }),
    ).toThrow()
  })
})
