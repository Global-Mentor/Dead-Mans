import { Stack, Typography } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { RegistrationTeam } from '../../../shared/api/contracts/index.ts'
import { ConfirmDialog, SectionCard } from '../../../shared/ui/index.ts'
import type { AdminRegistrationPanelProps } from './AdminRegistrationPanel.tsx'

export function AdminTeamPlayedConfirmation({
  team,
  controls,
  onClose,
}: {
  team: RegistrationTeam
  controls: AdminRegistrationPanelProps
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [error, setError] = useState<string | null>(null)
  const isPlayed = !team.isPlayed
  return (
    <ConfirmDialog
      open
      title={t(
        isPlayed
          ? 'teamRegistrations.markPlayedConfirmTitle'
          : 'teamRegistrations.resetPlayedConfirmTitle',
      )}
      description={
        <Stack gap={2} sx={{ mb: error ? 2 : 0 }}>
          <SectionCard surface="inset" sx={{ p: 1.5 }}>
            <Typography textAlign="center" fontWeight={700} sx={{ overflowWrap: 'anywhere' }}>
              {team.name || t('common.teamWithSlot', { slot: team.teamSlotIndex })}
            </Typography>
          </SectionCard>
          <Typography textAlign="center">
            {t(isPlayed ? 'teamRegistrations.markPlayedHint' : 'teamRegistrations.resetPlayedHint')}
          </Typography>
        </Stack>
      }
      errorMessage={error}
      cancelLabel={t('common.actions.cancel')}
      confirmLabel={t(
        isPlayed
          ? 'teamRegistrations.markPlayedAction'
          : 'gameApplication.adminPanel.resetPlayedTeam',
      )}
      isBusy={controls.isTogglingPlayedState(team.teamId)}
      onClose={onClose}
      onConfirm={async () => {
        setError(null)
        const message = await controls.onTogglePlayedState(team.teamId, isPlayed)
        if (message) setError(message)
        else onClose()
      }}
    />
  )
}
