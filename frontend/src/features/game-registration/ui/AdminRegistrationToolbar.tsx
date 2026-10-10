import { Box } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { AppButton, FormSelect, FormTextField } from '../../../shared/ui/index.ts'

export function AdminRegistrationToolbar({
  search,
  onSearch,
  status,
  onStatus,
  requestsCount,
  onReset,
}: {
  search: string
  onSearch: (value: string) => void
  status: string
  onStatus: (value: string) => void
  requestsCount: number
  onReset: () => void
}) {
  const { t } = useTranslation()
  return (
    <Box
      data-testid="admin-registration-toolbar"
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0,1fr) auto', md: 'minmax(0,1fr) 240px auto' },
        gap: 1,
        alignItems: 'center',
      }}
    >
      <FormTextField
        density="compact"
        label={t('teamRegistrations.search')}
        value={search}
        onChange={(event) => onSearch(event.target.value)}
        sx={{ gridColumn: { xs: '1 / -1', md: 'auto' }, minWidth: 0 }}
      />
      <FormSelect
        density="compact"
        label={t('teamRegistrations.status')}
        value={status}
        onChange={onStatus}
        sx={{ minWidth: 0 }}
        options={[
          { value: 'all', label: t('teamRegistrations.filterAll') },
          { value: 'forming', label: t('teamRegistrations.filterForming') },
          { value: 'ready', label: t('teamRegistrations.filterReady') },
          { value: 'confirmed', label: t('teamRegistrations.filterConfirmed') },
          {
            value: 'requests',
            label: t('teamRegistrations.filterRequests', { count: requestsCount }),
          },
          { value: 'played', label: t('teamRegistrations.filterPlayed') },
        ]}
      />
      <AppButton
        size="small"
        framePlacement="inset"
        tone="secondary"
        onClick={onReset}
        aria-label={t('teamRegistrations.resetFilters')}
      >
        {t('teamRegistrations.resetFiltersShort')}
      </AppButton>
    </Box>
  )
}
