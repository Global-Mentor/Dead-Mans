import { Box, Stack } from '@mui/material'
import type { ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'
import { SectionHeader } from '../../../shared/ui/index.ts'
import { AdminRegistrationToolbar } from './AdminRegistrationToolbar.tsx'
import { AdminTeamLimitControl } from './AdminTeamLimitControl.tsx'

export function AdminRegistrationHeader({
  limit,
  ...filters
}: ComponentProps<typeof AdminRegistrationToolbar> & {
  limit: ComponentProps<typeof AdminTeamLimitControl>
}) {
  const { t } = useTranslation()
  return (
    <Box
      sx={{
        maxHeight: '45%',
        flexShrink: 0,
        overflowY: 'auto',
        scrollbarWidth: 'thin',
        scrollbarGutter: 'stable both-edges',
      }}
    >
      <Box sx={{ mb: 1.5 }}>
        <SectionHeader headingLevel="h1" title={t('teamRegistrations.title')} />
      </Box>
      <Stack gap={1.5}>
        <AdminTeamLimitControl {...limit} />
        <AdminRegistrationToolbar {...filters} />
      </Stack>
    </Box>
  )
}
