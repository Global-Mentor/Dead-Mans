import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import { gameBoardRoute } from '../../routes/app-routes.ts'
import { PageStatePanel } from '../../shared/ui/PageStatePanel.tsx'
import { useGameApplicationPage } from './use-game-application-page.ts'
import type { RegistrationTeam } from '../../shared/api/contracts/index.ts'
import { formatRegistrationTeamStatus } from '../game-registration/model/registration-team-status.ts'
import { GameApplicationPlannedSection } from './ui/GameApplicationPlannedSection.tsx'

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
      <Box sx={{ maxWidth: 960, mx: 'auto', p: { xs: 2, md: 3 } }}>
        <PageStatePanel title={t('gameApplication.title')} message={t('gameApplication.notOpen')} />
        <GameApplicationPlannedSection />
      </Box>
    )
  }

  const snapshot = snapshotQuery.data

  const openTeams = snapshot.teams.filter(
    (team) => team.status === 'forming' && team.recruitmentOpen,
  )

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" gutterBottom>
        {t('gameApplication.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        {t('gameApplication.description')}
      </Typography>

      {snapshot.myPendingInvitations.length > 0 ? (
        <Paper sx={{ p: 2, mb: 2 }}>
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
                <Button
                  size="small"
                  variant="contained"
                  disabled={
                    acceptInvitation.isPending
                    && acceptInvitation.variables === invitation.invitationId
                  }
                  onClick={() => acceptInvitation.mutate(invitation.invitationId)}
                >
                  {t('gameApplication.acceptInvitation')}
                </Button>
                <Button
                  size="small"
                  disabled={
                    declineInvitation.isPending
                    && declineInvitation.variables === invitation.invitationId
                  }
                  onClick={() => declineInvitation.mutate(invitation.invitationId)}
                >
                  {t('gameApplication.declineInvitation')}
                </Button>
              </Stack>
            ))}
          </Stack>
        </Paper>
      ) : null}

      {snapshot.myTeam ? (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            {t('gameApplication.myTeamTitle')}
          </Typography>
          <TeamSummary team={snapshot.myTeam} />
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Chip size="small" label={formatRegistrationTeamStatus(snapshot.myTeam.status, t)} />
            <Button
              color="warning"
              disabled={leaveTeam.isPending}
              onClick={() => leaveTeam.mutate()}
            >
              {t('gameApplication.leaveTeam')}
            </Button>
          </Stack>
        </Paper>
      ) : (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            {t('gameApplication.createTeamTitle')}
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button
              variant="contained"
              disabled={createTeam.isPending}
              onClick={() => createTeam.mutate(true)}
            >
              {t('gameApplication.createOpenTeam')}
            </Button>
            <Button
              variant="outlined"
              disabled={createTeam.isPending}
              onClick={() => createTeam.mutate(false)}
            >
              {t('gameApplication.createClosedTeam')}
            </Button>
          </Stack>
        </Paper>
      )}

      {snapshot.myTeam === null && openTeams.length > 0 ? (
        <Paper sx={{ p: 2 }}>
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
                <Button
                  variant="contained"
                  disabled={joinTeam.isPending && joinTeam.variables === team.teamId}
                  onClick={() => joinTeam.mutate(team.teamId)}
                >
                  {t('gameApplication.joinTeam')}
                </Button>
              </Stack>
            ))}
          </Stack>
        </Paper>
      ) : null}

      <Button component={RouterLink} to={gameBoardRoute.fullPath} sx={{ mt: 2 }}>
        {t('gameApplication.backToBoard')}
      </Button>

      <Snackbar
        open={toastMessage !== null}
        autoHideDuration={5000}
        onClose={dismissToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={dismissToast} severity="error" variant="filled" sx={{ width: '100%' }}>
          {toastMessage}
        </Alert>
      </Snackbar>
    </Box>
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
