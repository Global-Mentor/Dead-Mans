import { createInstance } from 'i18next'
import { describe, expect, it, vi } from 'vitest'
import { registerFeatureTranslations } from './feature-locale-loader.ts'

describe('registerFeatureTranslations', () => {
  it('loads a feature once and registers every supported language without replacing base keys', async () => {
    const instance = createInstance()
    await instance.init({
      fallbackLng: 'en',
      resources: {
        en: { translation: { appTitle: 'Dead Mans' } },
        ru: { translation: { appTitle: 'Dead Mans' } },
      },
    })
    const load = vi.fn(async () => ({
      default: {
        en: { title: 'Feature' },
        ru: { title: 'Раздел' },
        uk: { title: 'Розділ' },
        pl: { title: 'Sekcja' },
      },
    }))

    const register = vi.spyOn(instance, 'addResourceBundle')
    await Promise.all([
      registerFeatureTranslations(instance, [{ key: 'feature', load }]),
      registerFeatureTranslations(instance, [{ key: 'feature', load }]),
    ])
    await registerFeatureTranslations(instance, [{ key: 'feature', load }])

    expect(load).toHaveBeenCalledOnce()
    expect(register).toHaveBeenCalledTimes(4)
    expect(instance.getFixedT('en')('appTitle')).toBe('Dead Mans')
    expect(instance.getFixedT('en')('feature.title')).toBe('Feature')
    expect(instance.getFixedT('ru')('feature.title')).toBe('Раздел')
    expect(instance.getFixedT('uk')('feature.title')).toBe('Розділ')
    expect(instance.getFixedT('pl')('feature.title')).toBe('Sekcja')
  })

  it('retries failed bundles and registers independently for another i18n instance', async () => {
    const first = createInstance()
    const second = createInstance()
    await Promise.all([first.init({ lng: 'en' }), second.init({ lng: 'en' })])
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({
        default: { en: { title: 'Ready' }, ru: {}, uk: {}, pl: {} },
      })
    const bundles = [{ key: 'retry', load }]
    await expect(registerFeatureTranslations(first, bundles)).rejects.toThrow('offline')
    await registerFeatureTranslations(first, bundles)
    await registerFeatureTranslations(second, bundles)
    expect(load).toHaveBeenCalledTimes(3)
    expect(first.t('retry.title')).toBe('Ready')
    expect(second.t('retry.title')).toBe('Ready')
  })
})
