import { FormControl, MenuItem, Select } from '@mui/material'
import type { SelectChangeEvent } from '@mui/material'
import { useTranslation } from 'react-i18next'

const languageCodes = ['ru', 'en', 'uk', 'pl'] as const

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation()

  const current =
    (i18n.resolvedLanguage || i18n.language || 'ru').split('-')[0] ?? 'ru'
  const value = languageCodes.includes(current as (typeof languageCodes)[number]) ? current : 'ru'

  const handleChange = (event: SelectChangeEvent<string>) => {
    const next = event.target.value
    void i18n.changeLanguage(next)
  }

  return (
    <FormControl
      size="small"
      sx={{
        minWidth: 70,
        ml: 2,
        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
      }}
    >
      <Select
        value={value}
        onChange={handleChange}
        autoWidth
        displayEmpty
        sx={{
          fontSize: 12,
          py: 0.3,
        }}
      >
        {languageCodes.map((languageCode) => (
          <MenuItem key={languageCode} value={languageCode}>
            {t(`languageSwitcher.languages.${languageCode}`)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}
