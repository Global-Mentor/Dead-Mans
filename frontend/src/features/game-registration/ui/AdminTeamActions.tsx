import { Box } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { RegistrationTeam } from '../../../shared/api/contracts/index.ts'
import { AppButton, HelpTooltip, SectionCard } from '../../../shared/ui/index.ts'
import { uiTokens } from '../../../shared/theme/tokens.ts'
import { canConfirmAdminTeam, canRejectAdminTeam } from '../model/admin-team-readiness.ts'
import type { AdminRegistrationPanelProps } from './AdminRegistrationPanel.tsx'

export function AdminTeamActions({
  team,
  controls,
  onDisband,
  onPlayed,
  onUnconfirm,
  onConfirm,
  onReject,
}: {
  team: RegistrationTeam
  controls: AdminRegistrationPanelProps
  onDisband: () => void
  onPlayed: () => void
  onUnconfirm: () => void
  onConfirm: () => void
  onReject: () => void
}) {
  const { t } = useTranslation()
  const { snapshot } = controls
  const forming = team.status === 'forming'
  const canReject = canRejectAdminTeam(team, snapshot.maxPlayersPerTeam)
  const readinessLabel = t(
    forming ? 'teamRegistrations.confirmAction' : 'teamRegistrations.unconfirmAction',
  )
  const canConfirm = canConfirmAdminTeam(
    team,
    snapshot.minPlayersPerTeam,
    snapshot.maxPlayersPerTeam,
  )
  const confirmHint = team.pendingInvitations?.length
    ? t('gameApplication.adminPanel.teamPendingInvitesHint')
    : !team.name?.trim()
      ? t('gameApplication.adminPanel.teamNameRequiredHint')
      : !canConfirm
        ? t(
            snapshot.minPlayersPerTeam === snapshot.maxPlayersPerTeam
              ? 'teamRegistrations.confirmExactRosterHint'
              : 'teamRegistrations.confirmRosterHint',
            {
              min: snapshot.minPlayersPerTeam,
              max: snapshot.maxPlayersPerTeam,
              count: team.members.length,
            },
          )
        : t('teamRegistrations.canConfirm')
  const rosterLocked = team.isActiveInGame || team.isPlayed || team.hasOpenedCard
  const lockReason = team.isActiveInGame
    ? t('gameRegistration.errors.teamActiveInGame')
    : t('gameRegistration.errors.teamAlreadyPlayed')
  const canMarkPlayed = snapshot.gameStatus === 'active' && team.status === 'confirmed'
  const playedDisabled =
    !canMarkPlayed || team.isActiveInGame || (!team.isPlayed && !team.hasOpenedCard)
  const playedHint =
    snapshot.gameStatus !== 'active'
      ? t('gameBoard.teamPlayedNoActiveGame')
      : !canMarkPlayed
        ? t('teamRegistrations.playedUnavailableHint')
        : team.isActiveInGame
          ? t('gameBoard.teamPlayedActiveTeam')
          : !team.isPlayed && !team.hasOpenedCard
            ? t('gameBoard.teamPlayedNoOpenedCard')
            : t(
                team.isPlayed
                  ? 'teamRegistrations.resetPlayedHint'
                  : 'teamRegistrations.markPlayedHint',
              )
  return (
    <SectionCard surface="inset" sx={{ p: 1, containerType: 'inline-size' }}>
      <Box
        role="group"
        aria-label={t('teamRegistrations.actions')}
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gridAutoRows: {
            xs: `minmax(${uiTokens.control.height.standard}px, auto)`,
            sm: `minmax(${uiTokens.control.height.compact}px, auto)`,
          },
          gap: 0.75,
          '@container (min-width: 576px)': {
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          },
          '@media (max-width: 359.95px)': { gridTemplateColumns: 'minmax(0, 1fr)' },
        }}
      >
        <HelpTooltip
          placement="top"
          title={
            forming
              ? confirmHint
              : rosterLocked
                ? lockReason
                : `${t('teamRegistrations.unconfirm')}. ${t('teamRegistrations.unconfirmHint')}`
          }
          describeChild
          arrow
        >
          <Box
            component="span"
            sx={{ display: 'flex', minWidth: 0, gridColumn: { xs: '1 / -1', sm: 'auto' } }}
            tabIndex={forming ? (!canConfirm ? 0 : undefined) : rosterLocked ? 0 : undefined}
          >
            <AppButton
              size="small"
              fullWidth
              framePlacement="inset"
              tone={forming ? 'primary' : 'secondary'}
              aria-label={`${readinessLabel}: ${t(forming ? 'teamRegistrations.confirm' : 'teamRegistrations.unconfirm')}`}
              disabled={
                forming
                  ? !canConfirm ||
                    controls.isConfirmingTeam(team.teamId) ||
                    controls.isAssigningPlayer ||
                    controls.isUpdatingTeamName(team.teamId)
                  : rosterLocked || controls.isUnconfirmingTeam(team.teamId)
              }
              onClick={forming ? onConfirm : onUnconfirm}
            >
              {readinessLabel}
            </AppButton>
          </Box>
        </HelpTooltip>
        <HelpTooltip title={playedHint} placement="top" describeChild arrow>
          <Box
            component="span"
            sx={{ display: 'flex', minWidth: 0, gridColumn: { xs: '1 / -1', sm: 'auto' } }}
            tabIndex={playedDisabled ? 0 : undefined}
          >
            <AppButton
              size="small"
              fullWidth
              framePlacement="inset"
              tone="secondary"
              aria-label={t(
                team.isPlayed
                  ? 'gameApplication.adminPanel.resetPlayedTeam'
                  : 'teamRegistrations.markPlayedAction',
              )}
              disabled={playedDisabled || controls.isTogglingPlayedState(team.teamId)}
              onClick={onPlayed}
            >
              {t(
                team.isPlayed
                  ? 'teamRegistrations.resetPlayedAction'
                  : 'teamRegistrations.markPlayedAction',
              )}
            </AppButton>
          </Box>
        </HelpTooltip>
        <HelpTooltip
          title={rosterLocked ? lockReason : t('teamRegistrations.disbandHint')}
          describeChild
          arrow
        >
          <Box
            component="span"
            sx={{ display: 'flex', minWidth: 0 }}
            tabIndex={rosterLocked ? 0 : undefined}
          >
            <AppButton
              size="small"
              fullWidth
              framePlacement="inset"
              tone="danger"
              disabled={rosterLocked || controls.isDisbandingTeam(team.teamId)}
              onClick={onDisband}
            >
              {t('gameApplication.adminPanel.disbandTeam')}
            </AppButton>
          </Box>
        </HelpTooltip>
        <HelpTooltip
          title={t(
            !forming
              ? 'teamRegistrations.rejectConfirmedHint'
              : canReject
                ? 'teamRegistrations.rejectHint'
                : 'teamRegistrations.rejectReadyHint',
          )}
          describeChild
          arrow
        >
          <Box
            component="span"
            sx={{ display: 'flex', minWidth: 0 }}
            tabIndex={!canReject ? 0 : undefined}
          >
            <AppButton
              size="small"
              fullWidth
              framePlacement="inset"
              tone="danger"
              disabled={!canReject || controls.isRejectingTeam(team.teamId)}
              onClick={onReject}
            >
              {t('teamRegistrations.reject')}
            </AppButton>
          </Box>
        </HelpTooltip>
      </Box>
    </SectionCard>
  )
}
