import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { RegistrationTeam } from '../../../shared/api/contracts/index.ts'
import { ConfirmDialog } from '../../../shared/ui/index.ts'
import { canRejectAdminTeam } from '../model/admin-team-readiness.ts'
import type { AdminRegistrationPanelProps } from './AdminRegistrationPanel.tsx'

export function AdminTeamRejectionConfirmation({
  controls,
  team,
  error,
  onClose,
  onError,
}: {
  controls: AdminRegistrationPanelProps
  team: RegistrationTeam | null
  error: string | null
  onClose: () => void
  onError: (error: Error) => void
}) {
  const { t } = useTranslation()
  const current = controls.snapshot.teams.find((candidate) => candidate.teamId === team?.teamId)
  const allowed = Boolean(
    current && canRejectAdminTeam(current, controls.snapshot.maxPlayersPerTeam),
  )
  const busy = team ? controls.isRejectingTeam(team.teamId) : false
  return (
    <ConfirmDialog
      open={team !== null}
      title={t('teamRegistrations.rejectTitle')}
      description={
        <Stack gap={2}>
          <Typography textAlign="center" fontWeight={700} sx={{ overflowWrap: 'anywhere' }}>
            {team?.name}
          </Typography>
          <Typography textAlign="center">{t('teamRegistrations.rejectEffects')}</Typography>
        </Stack>
      }
      errorMessage={
        error || (team && !allowed && !busy ? t('teamRegistrations.rejectReadyHint') : null)
      }
      confirmDisabled={!allowed}
      isBusy={busy}
      confirmTone="danger"
      confirmLabel={t('teamRegistrations.reject')}
      cancelLabel={t('common.actions.cancel')}
      onClose={onClose}
      onConfirm={() => {
        if (team && allowed) controls.onRejectTeam(team.teamId, onClose, onError)
      }}
    />
  )
}
