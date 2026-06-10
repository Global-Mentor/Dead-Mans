import { describe, expect, it } from 'vitest'
import { hasPanelCapability } from './panel-capabilities.ts'

describe('panel capabilities', () => {
  it('keeps game setup restricted to admins', () => {
    expect(hasPanelCapability('gameSetup', ['admin'])).toBe(true)
    expect(hasPanelCapability('gameSetup', ['moderator'])).toBe(false)
    expect(hasPanelCapability('gameSetup', ['viewer'])).toBe(false)
  })
})
