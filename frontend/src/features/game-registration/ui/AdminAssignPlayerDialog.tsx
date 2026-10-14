import { Stack, Typography } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { RegistrationPlayer, RegistrationTeam } from '../../../shared/api/contracts/index.ts'
import { AppButton, AppDialog, InlineNotice, FormSelect } from '../../../shared/ui/index.ts'

export function AdminAssignPlayerDialog({
  errorMessage,
  initialTeamId,
  player,
  teams,
  isBusy,
  onClose,
  onAssign,
}: {
  errorMessage: string | null
  initialTeamId: string | undefined
  player: RegistrationPlayer
  teams: RegistrationTeam[]
  isBusy: boolean
  onClose: () => void
  onAssign: (teamId: string, userId: string, onSuccess: () => void) => void
}) {
  const { t } = useTranslation()
  const [teamId, setTeamId] = useState(
    teams.find((team) => team.teamId === initialTeamId)?.teamId ?? teams[0]?.teamId ?? '',
  )
  const selectedTeam = teams.find((team) => team.teamId === teamId)
  return (
    <AppDialog
      open
      title={t('teamRegistrations.assignTitle')}
      onClose={isBusy ? undefined : onClose}
      actions={
        <>
          <AppButton tone="ghost" disabled={isBusy} onClick={onClose}>
            {t('common.actions.cancel')}
          </AppButton>
          <AppButton
            disabled={isBusy || !selectedTeam}
            onClick={() => onAssign(teamId, player.userId, onClose)}
          >
            {t('teamRegistrations.assign')}
          </AppButton>
        </>
      }
    >
      <Stack gap={2}>
        {errorMessage ? (
          <InlineNotice severity="error" sx={{ textAlign: 'center' }}>
            {errorMessage}
          </InlineNotice>
        ) : null}
        <Typography
          variant="h6"
          fontWeight={700}
          textAlign="center"
          sx={{ overflowWrap: 'anywhere' }}
        >
          {player.displayName}
        </Typography>
        {teams.length ? (
          <FormSelect
            label={t('teamRegistrations.targetTeam')}
            value={selectedTeam ? teamId : ''}
            onChange={setTeamId}
            disabled={isBusy}
            options={teams.map((team) => ({
              value: team.teamId,
              label: team.name?.trim()
                ? t('teamRegistrations.teamOption', { slot: team.teamSlotIndex, name: team.name })
                : t('teamRegistrations.teamNumber', { slot: team.teamSlotIndex }),
            }))}
          />
        ) : (
          <Stack gap={0.5}>
            <Typography color="text.secondary" textAlign="center">
              {t('teamRegistrations.noAssignableTeams')}
            </Typography>
            <Typography color="text.secondary" textAlign="center">
              {t('teamRegistrations.noAssignableTeamsHint')}
            </Typography>
          </Stack>
        )}
      </Stack>
    </AppDialog>
  )
}
