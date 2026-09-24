import type { SxProps, Theme } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import { FormSelect } from '../ui/index.ts'

const languageCodes = ['ru', 'en', 'uk', 'pl'] as const

interface LanguageSwitcherProps {
  sx?: SxProps<Theme>
}

export function LanguageSwitcher({ sx }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation()

  const current = (i18n.resolvedLanguage || i18n.language || 'ru').split('-')[0] ?? 'ru'
  const value = languageCodes.includes(current as (typeof languageCodes)[number]) ? current : 'ru'

  const handleChange = (next: string) => {
    void i18n.changeLanguage(next)
  }

  return (
    <FormSelect
      appearance="toolbar"
      label=""
      ariaLabel={t('languageSwitcher.ariaLabel')}
      value={value}
      onChange={handleChange}
      options={languageCodes.map((languageCode) => ({
        value: languageCode,
        label: t(`languageSwitcher.languages.${languageCode}`),
      }))}
      sx={sx}
    />
  )
}
