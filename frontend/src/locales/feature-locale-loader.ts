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

export async function registerFeatureTranslations(
  i18nInstance: i18n,
  bundles: readonly FeatureTranslationBundle[],
) {
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
