import { Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { RegistrationPlayer, RegistrationTeam } from '../../../shared/api/contracts/index.ts'
import { AppButton, SectionCard } from '../../../shared/ui/index.ts'
import type { AdminRegistrationPanelProps } from './AdminRegistrationPanel.tsx'
import type { OrderedAdminTeamEntry } from './admin-registration-components.tsx'
import { AdminRegistrationTeamRoster } from './AdminRegistrationTeamRoster.tsx'
import { RegistrationTeamNameEditor } from './RegistrationTeamNameEditor.tsx'
import { TeamBriefing } from '../../../shared/game-ui/index.ts'
import { AdminTeamActions } from './AdminTeamActions.tsx'
import { AdminTeamNumber } from './AdminTeamNumber.tsx'
import { AdminTeamStatusBlock } from './AdminTeamStatusBlock.tsx'

export function AdminRegistrationTeamDetails({
  entry,
  controls,
  onDirtyChange,
  onMovePlayer,
  onInvite,
  onRequestDisband,
  onRequestPlayed,
  onRequestUnconfirm,
  onRequestConfirm,
  onRequestReject,
  onRequestRemove,
}: {
  entry: OrderedAdminTeamEntry
  controls: AdminRegistrationPanelProps
  onDirtyChange: (dirty: boolean) => void
  onMovePlayer: (player: RegistrationPlayer) => void
  onInvite: (target: OrderedAdminTeamEntry) => void
  onRequestUnconfirm: (team: RegistrationTeam) => void
  onRequestConfirm: (team: RegistrationTeam) => void
  onRequestReject: (team: RegistrationTeam) => void
  onRequestPlayed: (team: RegistrationTeam) => void
  onRequestDisband: (team: RegistrationTeam) => void
  onRequestRemove: (target: {
    teamId: string
    teamSlotIndex: number
    player: RegistrationPlayer
  }) => void
}) {
  const { t } = useTranslation()
  const { team } = entry
  const { snapshot } = controls
  const forming = team.status === 'forming'
  const invitations = team.pendingInvitations?.length ?? 0
  const canAdd =
    forming &&
    team.members.length + invitations < snapshot.maxPlayersPerTeam &&
    snapshot.availablePlayers.length > 0
  return (
    <Stack gap={1.5} sx={{ minWidth: 0 }} data-testid="admin-team-details">
      <AdminTeamActions
        team={team}
        controls={controls}
        onDisband={() => onRequestDisband(team)}
        onPlayed={() => onRequestPlayed(team)}
        onUnconfirm={() => onRequestUnconfirm(team)}
        onConfirm={() => onRequestConfirm(team)}
        onReject={() => onRequestReject(team)}
      />
      {forming ? (
        <RegistrationTeamNameEditor
          value={team.name}
          canEdit
          required
          isSaving={controls.isUpdatingTeamName(team.teamId)}
          onSave={(name) => controls.onUpdateTeamName(team.teamId, name)}
          onDirtyChange={onDirtyChange}
          existingNames={snapshot.teams
            .filter((other) => other.teamId !== team.teamId)
            .map((other) => other.name)}
        />
      ) : null}
      <SectionCard surface="inset" sx={{ p: 1.5 }} data-testid="admin-team-briefing">
        <TeamBriefing
          leading={<AdminTeamNumber team={team} />}
          status={
            <Typography
              component="p"
              variant="subtitle2"
              sx={{ lineHeight: 1.5 }}
              aria-label={t('teamRegistrations.rosterCount', {
                count: team.members.length,
                max: snapshot.maxPlayersPerTeam,
              })}
            >
              {team.members.length} / {snapshot.maxPlayersPerTeam}
            </Typography>
          }
          name={team.name || t('common.teamWithSlot', { slot: team.teamSlotIndex })}
          participants={[]}
          emptyLabel={t('gameApplication.adminPanel.emptyTeam')}
          roster={
            <Stack gap={1}>
              {forming ? (
                <AppButton
                  tone="secondary"
                  framePlacement="inset"
                  size="small"
                  disabled={
                    !canAdd ||
                    controls.isCreatingInvitation(team.teamId) ||
                    controls.isAssigningPlayer
                  }
                  onClick={() => onInvite(entry)}
                >
                  {t(
                    team.recruitmentOpen
                      ? 'teamRegistrations.addPlayer'
                      : 'gameApplication.adminPanel.invitePlayer',
                  )}
                </AppButton>
              ) : null}

              <AdminTeamStatusBlock team={team} reserveSpace={false} />
              <AdminRegistrationTeamRoster
                team={team}
                expanded
                isRemovingPlayer={controls.isRemovingPlayer}
                isCancellingTeamInvitation={controls.isCancellingTeamInvitation}
                onRequestRemove={onRequestRemove}
                onMovePlayer={onMovePlayer}
                isMovingPlayer={controls.isAssigningPlayer}
                onCancelTeamInvitation={controls.onCancelTeamInvitation}
              />
            </Stack>
          }
        />
      </SectionCard>
    </Stack>
  )
}
