import { Box } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { AppButton, FormSelect, FormTextField } from '../../shared/ui/index.ts'
import type { UserFilters as Filters } from './api/role-administration-api.ts'
export function UserFilters({
  filters,
  search,
  onSearch,
  onChange,
  onReset,
}: {
  filters: Filters
  onReset: () => void
  search: string
  onSearch: (value: string) => void
  onChange: <K extends keyof Filters>(key: K, value: Filters[K] | null) => void
}) {
  const { t } = useTranslation()
  return (
    <Box
      sx={{
        display: 'grid',
        alignItems: 'center',
        gap: 1,
        gridTemplateColumns: {
          xs: 'minmax(0, 1.4fr) minmax(0, 1fr) auto',
          sm: 'minmax(0, 1fr) 160px 180px auto',
        },
      }}
    >
      <FormTextField
        density="compact"
        label={t('roleAdministration.searchLabel')}
        value={search}
        sx={{ minWidth: 0, gridColumn: { xs: '1 / -1', sm: 'auto' } }}
        slotProps={{ htmlInput: { maxLength: 100 } }}
        onChange={(event) => onSearch(event.target.value)}
      />
      <FormSelect
        density="compact"
        label={t('roleAdministration.signInFilter')}
        value={filters.hasLoggedIn === undefined ? 'all' : String(filters.hasLoggedIn)}
        sx={{ minWidth: 0 }}
        options={(['all', 'true', 'false'] as const).map((value) => ({
          value,
          label: t(`roleAdministration.signInOptions.${value}`),
        }))}
        onChange={(value) => onChange('hasLoggedIn', value === 'all' ? null : value === 'true')}
      />
      <FormSelect
        density="compact"
        label={t('roleAdministration.accessFilter')}
        value={filters.isActive === undefined ? 'all' : String(filters.isActive)}
        sx={{ minWidth: 0 }}
        options={(['all', 'true', 'false'] as const).map((value) => ({
          value,
          label: t(`roleAdministration.accessOptions.${value}`),
        }))}
        onChange={(value) => onChange('isActive', value === 'all' ? null : value === 'true')}
      />
      <AppButton size="small" tone="secondary" onClick={onReset} sx={{ flexShrink: 0 }}>
        {t('roleAdministration.clearSearch')}
      </AppButton>
    </Box>
  )
}
