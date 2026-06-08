import { useTranslation } from 'react-i18next'
import { FormSelect } from '../ui/FormSelect.tsx'

const languageCodes = ['ru', 'en', 'uk', 'pl'] as const

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation()

  const current =
    (i18n.resolvedLanguage || i18n.language || 'ru').split('-')[0] ?? 'ru'
  const value = languageCodes.includes(current as (typeof languageCodes)[number]) ? current : 'ru'

  const handleChange = (next: string) => {
    void i18n.changeLanguage(next)
  }

  return (
    <FormSelect
      size="small"
      label=""
      value={value}
      onChange={handleChange}
      options={languageCodes.map((languageCode) => ({
        value: languageCode,
        label: t(`languageSwitcher.languages.${languageCode}`),
      }))}
      sx={{
        minWidth: 70,
        ml: 2,
        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
        '& .MuiInputBase-input': { py: 0.3, fontSize: 12 },
        '& .MuiInputLabel-root': { display: 'none' },
      }}
    />
  )
}
