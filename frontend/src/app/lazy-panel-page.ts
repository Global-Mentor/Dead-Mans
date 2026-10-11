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
  let pending: Promise<{ default: ComponentType }> | undefined
  let speculativeLoadFailed = false
  const load = async () => {
    const [module] = await Promise.all([loader(), registerFeatureTranslations(i18n, translations)])
    const component = module[exportName]

    if (!component) {
      const availableExports = Object.keys(module).filter((key) => key !== 'default')
      throw new Error(
        `Panel page export "${exportName}" is missing (available: ${availableExports.join(', ') || 'none'})`,
      )
    }

    return { default: component as ComponentType }
  }
  const loadOnce = () => {
    pending ??= load().catch((error: unknown) => {
      pending = undefined
      throw error
    })
    return pending
  }
  const preload = () =>
    loadOnce().catch((error: unknown) => {
      speculativeLoadFailed = true
      throw error
    })
  const Page = lazy(async () => {
    try {
      return await loadOnce()
    } catch (error) {
      if (speculativeLoadFailed) {
        // Browsers can cache failed module fetches. Only recover on navigation,
        // when the destination URL is committed; never reload on hover/focus.
        window.location.reload()
        return new Promise<{ default: ComponentType }>(() => {})
      }
      throw error
    }
  })
  return Object.assign(Page, { preload })
}
