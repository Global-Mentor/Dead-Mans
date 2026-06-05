import {
  Alert,
  Box,
  Button,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { PageStatePanel } from '../../shared/ui/PageStatePanel.tsx'
import { formatRegistrationTeamStatus } from '../game-registration/model/registration-team-status.ts'
import { useTeamRegistrationsPage } from './use-team-registrations-page.ts'
import { TeamRegistrationsInvitePlannedSection } from './ui/TeamRegistrationsInvitePlannedSection.tsx'

export function TeamRegistrationsPage() {
  const { t } = useTranslation()
  const { teamsQuery, confirmTeam, rejectTeam, toastMessage, dismissToast } =
    useTeamRegistrationsPage()

  if (teamsQuery.isLoading) {
    return (
      <PageStatePanel
        title={t('teamRegistrations.title')}
        message={t('teamRegistrations.loading')}
        showSpinner
      />
    )
  }

  if (teamsQuery.isError) {
    return (
      <PageStatePanel
        title={t('teamRegistrations.title')}
        message={t('teamRegistrations.errorLoading')}
        tone="error"
      />
    )
  }

  if (teamsQuery.data == null) {
    return (
      <Box sx={{ maxWidth: 1100, mx: 'auto', p: { xs: 2, md: 3 } }}>
        <PageStatePanel
          title={t('teamRegistrations.title')}
          message={t('teamRegistrations.notOpen')}
        />
        <TeamRegistrationsInvitePlannedSection />
      </Box>
    )
  }

  const teams = teamsQuery.data

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" gutterBottom>
        {t('teamRegistrations.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        {t('teamRegistrations.description')}
      </Typography>

      {teams.length === 0 ? (
        <Typography variant="body2">{t('teamRegistrations.empty')}</Typography>
      ) : (
        <Paper sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('teamRegistrations.slot')}</TableCell>
                <TableCell>{t('teamRegistrations.status')}</TableCell>
                <TableCell>{t('teamRegistrations.players')}</TableCell>
                <TableCell align="right">{t('teamRegistrations.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {teams.map((team) => (
                <TableRow key={team.teamId}>
                  <TableCell>{team.slotIndex}</TableCell>
                  <TableCell>{formatRegistrationTeamStatus(team.status, t)}</TableCell>
                  <TableCell>
                    {team.members.map((member) => member.player.displayName).join(', ')}
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button
                        size="small"
                        variant="contained"
                        disabled={
                          team.status !== 'forming'
                          || (confirmTeam.isPending && confirmTeam.variables === team.teamId)
                        }
                        onClick={() => confirmTeam.mutate(team.teamId)}
                      >
                        {t('teamRegistrations.confirm')}
                      </Button>
                      <Button
                        size="small"
                        color="warning"
                        disabled={
                          team.status !== 'forming'
                          || (rejectTeam.isPending && rejectTeam.variables === team.teamId)
                        }
                        onClick={() => rejectTeam.mutate(team.teamId)}
                      >
                        {t('teamRegistrations.reject')}
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

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
