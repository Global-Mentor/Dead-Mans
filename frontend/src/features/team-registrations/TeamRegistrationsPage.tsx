import {
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { formatRegistrationTeamStatus } from '../game-registration/index.ts'
import { useTeamRegistrationsPage } from './use-team-registrations-page.ts'
import {
  AppButton,
  AppToast,
  PageShell,
  PageStatePanel,
  SectionCard,
  SectionHeader,
} from '../../shared/ui/index.ts'

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
      <PageShell>
        <PageStatePanel
          title={t('teamRegistrations.title')}
          message={t('teamRegistrations.notOpen')}
        />
      </PageShell>
    )
  }

  const teams = teamsQuery.data

  return (
    <PageShell>
      <SectionHeader title={t('teamRegistrations.title')} description={t('teamRegistrations.description')} />

      {teams.length === 0 ? (
        <Typography variant="body2">{t('teamRegistrations.empty')}</Typography>
      ) : (
        <SectionCard sx={{ overflowX: 'auto', p: 0 }}>
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
                      <AppButton
                        size="small"
                        disabled={
                          team.status !== 'forming'
                          || (confirmTeam.isPending && confirmTeam.variables === team.teamId)
                        }
                        onClick={() => confirmTeam.mutate(team.teamId)}
                      >
                        {t('teamRegistrations.confirm')}
                      </AppButton>
                      <AppButton
                        size="small"
                        tone="warningGhost"
                        disabled={
                          team.status !== 'forming'
                          || (rejectTeam.isPending && rejectTeam.variables === team.teamId)
                        }
                        onClick={() => rejectTeam.mutate(team.teamId)}
                      >
                        {t('teamRegistrations.reject')}
                      </AppButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>
      )}

      <AppToast message={toastMessage} onClose={dismissToast} severity="error" autoHideDuration={5000} />
    </PageShell>
  )
}
