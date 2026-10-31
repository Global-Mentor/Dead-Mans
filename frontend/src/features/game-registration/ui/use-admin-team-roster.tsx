import { Box } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { RegistrationPlayer, RegistrationTeam } from '../../../shared/api/contracts/index.ts'
import { AppButton, HelpTooltip, StatusBadge } from '../../../shared/ui/index.ts'
import type { TeamPresentationMember } from '../../../shared/game-ui/index.ts'
import { AdminPlayerActionsMenu } from './AdminPlayerActionsMenu.tsx'

interface AdminTeamRosterOptions {
  onMovePlayer: (player: RegistrationPlayer) => void
  isMovingPlayer: boolean
  team: RegistrationTeam
  isRemovingPlayer: (teamId: string, userId: string) => boolean
  isCancellingTeamInvitation: (teamId: string, invitationId: string) => boolean
  onRequestRemove: (request: {
    teamId: string
    teamSlotIndex: number
    player: RegistrationPlayer
  }) => void
  onCancelTeamInvitation: (teamId: string, invitationId: string) => void
}

export function useAdminTeamRoster({
  team,
  onMovePlayer,
  isMovingPlayer,
  isRemovingPlayer,
  isCancellingTeamInvitation,
  onRequestRemove,
  onCancelTeamInvitation,
}: AdminTeamRosterOptions) {
  const { t } = useTranslation()
  const pendingInvitations = team.pendingInvitations ?? []
  const canEditRoster = team.status === 'forming'

  const members: TeamPresentationMember[] = team.members.map((member) => ({
    id: member.player.userId,
    name: member.player.displayName,
    testId: `admin-player-${member.player.userId}`,
    detail: (
      <StatusBadge
        density="tight"
        size="small"
        color={member.readyAtUtc ? 'success' : 'default'}
        variant={member.readyAtUtc ? 'filled' : 'outlined'}
        label={t(
          member.readyAtUtc ? 'gameApplication.playerReady' : 'gameApplication.playerNotReady',
        )}
      />
    ),
    actions: canEditRoster ? (
      <AdminPlayerActionsMenu
        name={member.player.displayName}
        disabled={isMovingPlayer || isRemovingPlayer(team.teamId, member.player.userId)}
        onMove={() => onMovePlayer(member.player)}
        onRemove={() =>
          onRequestRemove({
            teamId: team.teamId,
            teamSlotIndex: team.teamSlotIndex,
            player: member.player,
          })
        }
      />
    ) : null,
  }))
  for (const invitation of pendingInvitations) {
    members.push({
      id: invitation.invitationId,
      name: invitation.player.displayName,
      testId: `admin-invitation-${invitation.invitationId}`,
      pending: true,
      detail: (
        <HelpTooltip title={t('gameApplication.adminPanel.pendingInviteChip')} describeChild arrow>
          <StatusBadge
            aria-label={t('gameApplication.adminPanel.pendingInviteChip')}
            density="compact"
            size="small"
            color="warning"
            label={
              <>
                <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                  {t('teamRegistrations.pendingInviteCompact')}
                </Box>
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  {t('gameApplication.adminPanel.pendingInviteChip')}
                </Box>
              </>
            }
          />
        </HelpTooltip>
      ),
      actions: (
        <AppButton
          size="small"
          tone="danger"
          framePlacement="inset"
          disabled={isCancellingTeamInvitation(team.teamId, invitation.invitationId)}
          onClick={() => onCancelTeamInvitation(team.teamId, invitation.invitationId)}
        >
          {t('gameApplication.adminPanel.cancelPendingInvite')}
        </AppButton>
      ),
    })
  }
  return members
}
