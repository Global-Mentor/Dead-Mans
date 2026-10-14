import type { i18n } from 'i18next'
import { supportedLanguages, type SupportedLanguage } from './index.ts'

type FeatureLocaleModule = {
  default: Record<SupportedLanguage, object>
}

export type FeatureTranslationBundle = {
  key: string
  load: () => Promise<FeatureLocaleModule>
}

const registrations = new WeakMap<i18n, Map<string, Promise<void>>>()
// Only development HMR needs to revisit live instances; production keeps weak caching.
const liveInstances = import.meta.hot ? new Map<i18n, Set<string>>() : undefined

export async function registerFeatureTranslations(
  i18nInstance: i18n,
  bundles: readonly FeatureTranslationBundle[],
) {
  if (liveInstances) {
    const keys = liveInstances.get(i18nInstance) ?? new Set<string>()
    for (const bundle of bundles) keys.add(bundle.key)
    liveInstances.set(i18nInstance, keys)
  }
  let registered = registrations.get(i18nInstance)
  if (!registered) {
    registered = new Map()
    registrations.set(i18nInstance, registered)
  }
  const cache = registered
  await Promise.all(
    bundles.map((bundle) => {
      let pending = cache.get(bundle.key)
      if (!pending) {
        pending = bundle
          .load()
          .then((module) => {
            for (const language of supportedLanguages) {
              i18nInstance.addResourceBundle(
                language,
                'translation',
                { [bundle.key]: module.default[language] },
                true,
                true,
              )
            }
          })
          .catch((error: unknown) => {
            cache.delete(bundle.key)
            throw error
          })
        cache.set(bundle.key, pending)
      }
      return pending
    }),
  )
}

export const featureTranslationBundles = {
  gameOverlay: {
    key: 'gameOverlay',
    load: () => import('../features/game-overlay/i18n/game-overlay-translations.ts'),
  },
  gameBoard: {
    key: 'gameBoard',
    load: () => import('../features/game-board/i18n/game-board-translations.ts'),
  },
  gameSetup: {
    key: 'gameSetup',
    load: () => import('../features/game-setup/i18n/game-setup-translations.ts'),
  },
  gameApplication: {
    key: 'gameApplication',
    load: () => import('../features/game-application/i18n/game-application-translations.ts'),
  },
  gameModifiers: {
    key: 'gameModifiers',
    load: () => import('../features/game-modifiers/i18n/game-modifiers-translations.ts'),
  },
  gameCatalog: {
    key: 'gameCatalog',
    load: () => import('../features/game-catalog/i18n/game-catalog-translations.ts'),
  },
  gameHistory: {
    key: 'gameHistory',
    load: () => import('../features/game-history/i18n/game-history-translations.ts'),
  },
  gameQuiz: {
    key: 'gameQuiz',
    load: () => import('../features/game-quiz/i18n/game-quiz-translations.ts'),
  },
  gameRegistration: {
    key: 'gameRegistration',
    load: () => import('../features/game-registration/i18n/game-registration-translations.ts'),
  },
  teamRegistrations: {
    key: 'teamRegistrations',
    load: () => import('../features/team-registrations/i18n/team-registrations-translations.ts'),
  },
  modifierHistory: {
    key: 'modifierHistory',
    load: () => import('../features/modifier-history/i18n/modifier-history-translations.ts'),
  },
  roleAdministration: {
    key: 'roleAdministration',
    load: () => import('../features/role-administration/i18n/role-administration-translations.ts'),
  },
} as const satisfies Record<string, FeatureTranslationBundle>

export const allFeatureTranslationBundles = Object.values(featureTranslationBundles)

if (import.meta.hot) {
  import.meta.hot.accept(async (updated) => {
    if (!updated || !liveInstances) return
    const register: typeof registerFeatureTranslations = updated.registerFeatureTranslations
    const bundles: readonly FeatureTranslationBundle[] = updated.allFeatureTranslationBundles
    for (const [instance, keys] of liveInstances) {
      await register(
        instance,
        bundles.filter((bundle) => keys.has(bundle.key)),
      )
      // Notify mounted useTranslation consumers after replacing resources, without reloading forms.
      await instance.changeLanguage(instance.language)
    }
  })
}
