import { Box, Stack, Typography } from '@mui/material'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { gameBoardRoute } from '../../routes/app-routes.ts'
import {
  AppButton,
  AppLinkButton,
  AppToast,
  PageShell,
  PageStatePanel,
} from '../../shared/ui/index.ts'
import { isTeamJoinable } from './model/team-availability.ts'
import { CreateTeamSection } from './ui/CreateTeamSection.tsx'
import { MyTeamSection } from './ui/MyTeamSection.tsx'
import { OpenTeamsSection } from './ui/OpenTeamsSection.tsx'
import { PendingInvitationsSection } from './ui/PendingInvitationsSection.tsx'
import { useGameApplicationPage } from './use-game-application-page.ts'

const applicationColumnSx = {
  minWidth: 0,
  scrollMarginTop: { xs: 160, md: 100 },
  display: { md: 'grid' },
  gridTemplateRows: { md: 'subgrid' },
  gridRow: { md: 'span 2' },
} as const

export function GameApplicationPage() {
  const { t } = useTranslation()
  const rosterRef = useRef<HTMLDivElement>(null)
  const focusRoster = () => requestAnimationFrame(() => rosterRef.current?.focus())
  const {
    snapshotQuery,
    createTeam,
    joinTeam,
    leaveTeam,
    createPlayerInvitation,
    cancelPlayerInvitation,
    requestTeamDisband,
    updateTeamName,
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
      <Stack spacing={2}>
        <PageStatePanel
          title={t('gameApplication.title')}
          message={t('gameApplication.errorLoading')}
          tone="error"
        />
        <AppButton
          tone="secondary"
          onClick={() => void snapshotQuery.refetch()}
          sx={{ alignSelf: 'flex-start' }}
        >
          {t('gameApplication.retry')}
        </AppButton>
      </Stack>
    )
  }

  if (snapshotQuery.data == null) {
    return (
      <PageShell sx={{ maxWidth: 'none', width: '100%' }}>
        <PageStatePanel title={t('gameApplication.title')} message={t('gameApplication.notOpen')} />
      </PageShell>
    )
  }

  const snapshot = snapshotQuery.data
  const joinableTeamsCount = snapshot.teams.filter((team) =>
    isTeamJoinable(team, snapshot.maxPlayersPerTeam),
  ).length

  const isBusy = [
    createTeam,
    joinTeam,
    leaveTeam,
    acceptInvitation,
    declineInvitation,
    createPlayerInvitation,
    cancelPlayerInvitation,
    requestTeamDisband,
    updateTeamName,
  ].some((mutation) => mutation.isPending)
  const hasAvailableSlot = snapshot.teamSlots.some(
    (slot) => slot.teamSlotType === 'public' && slot.isAvailableForNewTeam,
  )

  return (
    <PageShell sx={{ maxWidth: 1280, width: '100%', p: { xs: 0, md: 1 }, pt: 0 }}>
      <Stack spacing={2}>
        <Box component="header">
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={1}
            flexWrap="wrap"
            useFlexGap
          >
            <Typography component="h1" variant="h3" sx={{ fontSize: { xs: 32, sm: 38 } }}>
              {t('gameApplication.title')}
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="caption" color="text.secondary">
                {t('gameApplication.teamSize', {
                  min: snapshot.minPlayersPerTeam,
                  max: snapshot.maxPlayersPerTeam,
                })}
              </Typography>
              <AppLinkButton to={gameBoardRoute.fullPath} tone="secondary" size="small">
                {t('gameApplication.backToBoard')}
              </AppLinkButton>
            </Stack>
          </Stack>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            justifyContent="space-between"
            sx={{ mt: 1.25, py: 0.75, borderBlock: '1px solid', borderColor: 'divider' }}
          >
            <Stack direction="row" spacing={1.25} alignItems="center" role="status">
              <Box
                aria-hidden
                sx={{
                  width: 7,
                  height: 7,
                  flexShrink: 0,
                  transform: 'rotate(45deg)',
                  bgcolor: snapshot.myTeam ? 'primary.main' : 'text.secondary',
                }}
              />
              <Typography variant="body2">
                {t(
                  snapshot.myTeam?.status === 'confirmed'
                    ? 'gameApplication.applicationConfirmed'
                    : snapshot.myTeam
                      ? 'gameApplication.applicationForming'
                      : 'gameApplication.overviewTeamMissing',
                )}
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {t('gameApplication.overviewTeamsValue', {
                total: snapshot.teams.length,
                open: joinableTeamsCount,
              })}
            </Typography>
          </Stack>
          <Stack
            component="nav"
            aria-label={t('gameApplication.sectionNavigation')}
            direction="row"
            spacing={1}
            sx={{ display: { xs: 'flex', md: 'none' }, mt: 1 }}
          >
            <AppButton tone="secondary" href="#application-roster" sx={{ flex: 1 }}>
              {t(
                snapshot.myTeam
                  ? 'gameApplication.myTeamTitle'
                  : 'gameApplication.createTeamAction',
              )}
            </AppButton>
            <AppButton tone="secondary" href="#application-teams" sx={{ flex: 1 }}>
              {t('gameApplication.createdTeamsTitle')}
            </AppButton>
          </Stack>
        </Box>

        <PendingInvitationsSection
          invitations={snapshot.myPendingInvitations}
          disabled={isBusy}
          teams={snapshot.teams}
          onAccept={(invitationId) =>
            acceptInvitation.mutate(invitationId, { onSuccess: focusRoster })
          }
          onDecline={(invitationId) => declineInvitation.mutate(invitationId)}
          pendingAcceptId={acceptInvitation.isPending ? acceptInvitation.variables : undefined}
          pendingDeclineId={declineInvitation.isPending ? declineInvitation.variables : undefined}
        />

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(320px, 0.85fr) minmax(0, 1.15fr)' },
            columnGap: 2.5,
            rowGap: { xs: 2.5, md: 1.25 },
          }}
        >
          <Box
            id="application-roster"
            ref={rosterRef}
            aria-label={t(
              snapshot.myTeam ? 'gameApplication.myTeamTitle' : 'gameApplication.createTeamTitle',
            )}
            tabIndex={-1}
            sx={applicationColumnSx}
          >
            {snapshot.myTeam ? (
              <MyTeamSection
                team={snapshot.myTeam}
                capacity={snapshot.maxPlayersPerTeam}
                disabled={isBusy}
                canInvitePlayers={snapshot.canInvitePlayersToMyTeam}
                invitablePlayers={snapshot.invitablePlayers}
                outgoingInvitations={snapshot.myOutgoingInvitations}
                onInvitePlayer={(userId) => createPlayerInvitation.mutate(userId)}
                isInvitingPlayer={createPlayerInvitation.isPending}
                onCancelInvitation={(invitationId) => cancelPlayerInvitation.mutate(invitationId)}
                isCancellingInvitation={cancelPlayerInvitation.isPending}
                onLeave={() => leaveTeam.mutate(undefined, { onSuccess: focusRoster })}
                isLeaving={leaveTeam.isPending}
                onRequestDisband={() => requestTeamDisband.mutate()}
                isRequestingDisband={requestTeamDisband.isPending}
                onUpdateName={(name) => updateTeamName.mutate(name)}
                isUpdatingName={updateTeamName.isPending}
              />
            ) : (
              <CreateTeamSection
                onCreate={(recruitmentOpen, name) =>
                  createTeam.mutate({ recruitmentOpen, name }, { onSuccess: focusRoster })
                }
                isCreating={createTeam.isPending}
                disabled={isBusy}
                hasAvailableSlot={hasAvailableSlot}
              />
            )}
          </Box>

          <Box id="application-teams" tabIndex={-1} sx={applicationColumnSx}>
            <OpenTeamsSection
              teams={snapshot.teams}
              capacity={snapshot.maxPlayersPerTeam}
              myTeamId={snapshot.myTeam?.teamId}
              disabled={isBusy}
              canJoinTeams={snapshot.myTeam == null}
              onJoin={(teamId) => joinTeam.mutate(teamId, { onSuccess: focusRoster })}
              joiningTeamId={joinTeam.isPending ? joinTeam.variables : undefined}
            />
          </Box>
        </Box>
      </Stack>

      <AppToast
        message={toastMessage}
        onClose={dismissToast}
        severity="error"
        autoHideDuration={5000}
      />
    </PageShell>
  )
}
