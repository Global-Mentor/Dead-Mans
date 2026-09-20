import type { ComponentType } from 'react'
import { lazy } from 'react'
import i18n from '../i18n.ts'
import {
  registerFeatureTranslations,
  type FeatureTranslationBundle,
} from '../locales/feature-locale-loader.ts'

export function lazyPanelPage<TModule extends object, TExportName extends keyof TModule & string>(
  loader: () => Promise<TModule>,
  exportName: TExportName,
  translations: readonly FeatureTranslationBundle[] = [],
) {
  return lazy(async () => {
    const [module] = await Promise.all([loader(), registerFeatureTranslations(i18n, translations)])
    const component = module[exportName]

    if (!component) {
      const availableExports = Object.keys(module).filter((key) => key !== 'default')
      throw new Error(
        `Panel page export "${exportName}" is missing (available: ${availableExports.join(', ') || 'none'})`,
      )
    }

    return { default: component as ComponentType }
  })
}
