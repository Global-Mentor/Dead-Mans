import { describe, expect, it } from 'vitest'
import { huntMapName, huntName } from './quiz-image-text.ts'

const names = {
  en: 'STILLWATER BAYOU',
  ru: 'БОЛОТО СТИЛУОТЕР',
  uk: 'БОЛОТА СТИЛВОТЕР',
  pl: 'ROZLEWISKO STILLWATER',
}

describe('map display names', () => {
  it.each([
    ['en', 'Stillwater Bayou'],
    ['ru-RU', 'Болото Стилуотер'],
    ['uk', 'Болота Стилвотер'],
    ['pl', 'Rozlewisko Stillwater'],
  ])('displays uppercase map names in ordinary case for %s', (locale, expected) => {
    expect(huntMapName(names, locale)).toBe(expected)
  })
  it('preserves mixed case, spelling and the original location names', () => {
    expect(huntMapName({ ...names, en: "Mammon's Gulch" }, 'en')).toBe("Mammon's Gulch")
    expect(huntMapName({ ...names, ru: 'Де-Салль' }, 'ru')).toBe('Де-Салль')
    expect(huntName(names, 'ru')).toBe('БОЛОТО СТИЛУОТЕР')
  })
})
