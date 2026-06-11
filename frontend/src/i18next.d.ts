import 'i18next'
import type { DefaultTranslation } from './locales/index.ts'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    returnNull: false
    resources: {
      translation: DefaultTranslation
    }
  }
}
