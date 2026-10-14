import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { RegistrationPlayer, RegistrationTeam } from '../../../shared/api/contracts/index.ts'
import { AppButton, HelpTooltip, SectionCard, StatusBadge } from '../../../shared/ui/index.ts'
import { AdminRegistrationPlayerCard } from './admin-registration-components.tsx'
import { AdminPlayerActionsMenu } from './AdminPlayerActionsMenu.tsx'

interface AdminRegistrationTeamRosterProps {
  onMovePlayer: (player: RegistrationPlayer) => void
  isMovingPlayer: boolean
  expanded: boolean
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

export function AdminRegistrationTeamRoster({
  team,
  onMovePlayer,
  expanded,
  isMovingPlayer,
  isRemovingPlayer,
  isCancellingTeamInvitation,
  onRequestRemove,
  onCancelTeamInvitation,
}: AdminRegistrationTeamRosterProps) {
  const { t } = useTranslation()
  const pendingInvitations = team.pendingInvitations ?? []
  const canEditRoster = team.status === 'forming'

  return (
    <Stack
      component="ul"
      spacing={0}
      sx={(theme) => ({
        display: 'grid',
        gridTemplateColumns: expanded
          ? 'minmax(0, 1fr)'
          : { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' },
        columnGap: 1.5,
        m: 0,
        p: 0,
        borderTop: `1px solid ${theme.palette.divider}`,
      })}
    >
      {team.members.length === 0 && pendingInvitations.length === 0 ? (
        <SectionCard
          component="li"
          surface="inset"
          borderStyle="dashed"
          sx={{ listStyle: 'none', p: 1 }}
        >
          <Typography variant="body2" color="text.secondary">
            {t('gameApplication.adminPanel.emptyTeam')}
          </Typography>
        </SectionCard>
      ) : null}

      {team.members.map((member) => (
        <AdminRegistrationPlayerCard
          key={member.player.userId}
          player={member.player}
          compact
          alignment="center"
          testId={`admin-player-${member.player.userId}`}
          metadata={
            expanded && canEditRoster ? (
              <StatusBadge
                textFlow="wrap"
                density="compact"
                size="small"
                color={member.readyAtUtc ? 'success' : 'default'}
                variant={member.readyAtUtc ? 'filled' : 'outlined'}
                label={t(
                  member.readyAtUtc
                    ? 'gameApplication.playerReady'
                    : 'gameApplication.playerNotReady',
                )}
              />
            ) : undefined
          }
          actions={
            canEditRoster && expanded ? (
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
            ) : undefined
          }
        />
      ))}

      {pendingInvitations.map((invitation) => (
        <AdminRegistrationPlayerCard
          key={invitation.invitationId}
          player={invitation.player}
          alignment="center"
          testId={`admin-invitation-${invitation.invitationId}`}
          metadata={
            <HelpTooltip
              title={t('gameApplication.adminPanel.pendingInviteChip')}
              describeChild
              arrow
            >
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
          }
          footer={
            <AppButton
              size="small"
              tone="danger"
              framePlacement="inset"
              disabled={isCancellingTeamInvitation(team.teamId, invitation.invitationId)}
              onClick={() => onCancelTeamInvitation(team.teamId, invitation.invitationId)}
            >
              {t('gameApplication.adminPanel.cancelPendingInvite')}
            </AppButton>
          }
        />
      ))}
    </Stack>
  )
}
