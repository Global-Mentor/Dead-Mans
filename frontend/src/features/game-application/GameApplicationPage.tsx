import { Box, Chip, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { gameBoardRoute } from '../../routes/app-routes.ts'
import { useGameApplicationPage } from './use-game-application-page.ts'
import type { RegistrationTeam } from '../../shared/api/contracts/index.ts'
import { formatRegistrationTeamStatus } from '../game-registration/index.ts'
import {
  AppButton,
  AppLinkButton,
  AppToast,
  PageShell,
  PageStatePanel,
  SectionCard,
  SectionHeader,
} from '../../shared/ui/index.ts'

export function GameApplicationPage() {
  const { t } = useTranslation()
  const {
    snapshotQuery,
    createTeam,
    joinTeam,
    leaveTeam,
    acceptInvitation,
    declineInvitation,
    toastMessage,
    dismissToast,
  } = useGameApplicationPage()

  if (snapshotQuery.isLoading) {
    return (
      <PageStatePanel
        title={t('gameApplication.title')}
        message={t('gameApplication.loading')}
        showSpinner
      />
    )
  }

  if (snapshotQuery.isError) {
    return (
      <PageStatePanel
        title={t('gameApplication.title')}
        message={t('gameApplication.errorLoading')}
        tone="error"
      />
    )
  }

  if (snapshotQuery.data == null) {
    return (
      <PageShell>
        <PageStatePanel title={t('gameApplication.title')} message={t('gameApplication.notOpen')} />
      </PageShell>
    )
  }

  const snapshot = snapshotQuery.data

  const openTeams = snapshot.teams.filter(
    (team) => team.status === 'forming' && team.recruitmentOpen,
  )

  return (
    <PageShell>
      <SectionHeader
        title={t('gameApplication.title')}
        description={t('gameApplication.description')}
      />

      {snapshot.myPendingInvitations.length > 0 ? (
        <SectionCard sx={{ mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            {t('gameApplication.invitationsTitle')}
          </Typography>
          <Stack spacing={1}>
            {snapshot.myPendingInvitations.map((invitation) => (
              <Stack
                key={invitation.invitationId}
                direction="row"
                spacing={1}
                alignItems="center"
                flexWrap="wrap"
              >
                <Typography variant="body2">
                  {t('gameApplication.invitationSlot', { slot: invitation.slotIndex })}
                </Typography>
                <AppButton
                  size="small"
                  disabled={
                    acceptInvitation.isPending &&
                    acceptInvitation.variables === invitation.invitationId
                  }
                  onClick={() => acceptInvitation.mutate(invitation.invitationId)}
                >
                  {t('gameApplication.acceptInvitation')}
                </AppButton>
                <AppButton
                  size="small"
                  tone="ghost"
                  disabled={
                    declineInvitation.isPending &&
                    declineInvitation.variables === invitation.invitationId
                  }
                  onClick={() => declineInvitation.mutate(invitation.invitationId)}
                >
                  {t('gameApplication.declineInvitation')}
                </AppButton>
              </Stack>
            ))}
          </Stack>
        </SectionCard>
      ) : null}

      {snapshot.myTeam ? (
        <SectionCard sx={{ mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            {t('gameApplication.myTeamTitle')}
          </Typography>
          <TeamSummary team={snapshot.myTeam} />
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Chip size="small" label={formatRegistrationTeamStatus(snapshot.myTeam.status, t)} />
            <AppButton
              tone="warningGhost"
              disabled={leaveTeam.isPending}
              onClick={() => leaveTeam.mutate()}
            >
              {t('gameApplication.leaveTeam')}
            </AppButton>
          </Stack>
        </SectionCard>
      ) : (
        <SectionCard sx={{ mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            {t('gameApplication.createTeamTitle')}
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <AppButton disabled={createTeam.isPending} onClick={() => createTeam.mutate(true)}>
              {t('gameApplication.createOpenTeam')}
            </AppButton>
            <AppButton
              tone="secondary"
              disabled={createTeam.isPending}
              onClick={() => createTeam.mutate(false)}
            >
              {t('gameApplication.createClosedTeam')}
            </AppButton>
          </Stack>
        </SectionCard>
      )}

      {snapshot.myTeam === null && openTeams.length > 0 ? (
        <SectionCard>
          <Typography variant="subtitle1" gutterBottom>
            {t('gameApplication.openTeamsTitle')}
          </Typography>
          <Stack spacing={2}>
            {openTeams.map((team) => (
              <Stack
                key={team.teamId}
                direction="row"
                spacing={1}
                alignItems="center"
                justifyContent="space-between"
                flexWrap="wrap"
              >
                <TeamSummary team={team} />
                <AppButton
                  disabled={joinTeam.isPending && joinTeam.variables === team.teamId}
                  onClick={() => joinTeam.mutate(team.teamId)}
                >
                  {t('gameApplication.joinTeam')}
                </AppButton>
              </Stack>
            ))}
          </Stack>
        </SectionCard>
      ) : null}

      <AppLinkButton to={gameBoardRoute.fullPath} sx={{ mt: 2 }} tone="ghost">
        {t('gameApplication.backToBoard')}
      </AppLinkButton>

      <AppToast
        message={toastMessage}
        onClose={dismissToast}
        severity="error"
        autoHideDuration={5000}
      />
    </PageShell>
  )
}

function TeamSummary({ team }: { team: RegistrationTeam }) {
  const { t } = useTranslation()
  return (
    <Box>
      <Typography variant="body2">
        {t('gameApplication.teamSlot', {
          slot: team.slotIndex,
          count: team.members.length,
        })}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {team.members.map((member) => member.player.displayName).join(', ')}
      </Typography>
    </Box>
  )
}
