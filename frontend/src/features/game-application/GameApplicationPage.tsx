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
  SectionNavigation,
  SummaryMetrics,
} from '../../shared/ui/index.ts'
import { CreateTeamSection } from './ui/CreateTeamSection.tsx'
import { MyTeamSection } from './ui/MyTeamSection.tsx'
import { OpenTeamsSection } from './ui/OpenTeamsSection.tsx'
import { PendingInvitationsSection } from './ui/PendingInvitationsSection.tsx'
import { useGameApplicationPage } from './use-game-application-page.ts'

const applicationColumnSx = {
  minWidth: 0,
  scrollMarginTop: { xs: 210, sm: 150, md: 100 },
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
    cancelTeamDisbandRequest,
    canCancelDisbandRequest,
    updateTeamName,
    updateReadiness,
    currentUserId,
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
        actions={
          <AppButton
            tone="secondary"
            onClick={() => void snapshotQuery.refetch()}
            sx={{ alignSelf: 'flex-start' }}
          >
            {t('gameApplication.retry')}
          </AppButton>
        }
      />
    )
  }

  if (snapshotQuery.data == null) {
    return (
      <PageStatePanel title={t('gameApplication.title')} message={t('gameApplication.notOpen')} />
    )
  }

  const snapshot = snapshotQuery.data
  const confirmedTeamsCount = snapshot.teams.filter((team) => team.status === 'confirmed').length
  const openTeamsCount = snapshot.teams.filter(
    (team) => team.status === 'forming' && team.recruitmentOpen,
  ).length
  const closedTeamsCount = snapshot.teams.filter(
    (team) => team.status === 'forming' && !team.recruitmentOpen,
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
    cancelTeamDisbandRequest,
    updateTeamName,
    updateReadiness,
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
              <AppLinkButton to={gameBoardRoute.fullPath} tone="secondary" size="small">
                {t('gameApplication.backToBoard')}
              </AppLinkButton>
            </Stack>
          </Stack>
          <Typography
            component="h2"
            variant="overline"
            color="text.secondary"
            sx={{ mt: 2, display: 'block' }}
          >
            {t('gameApplication.teamsOverview')}
          </Typography>
          <SummaryMetrics
            label={t('gameApplication.teamsOverview')}
            items={(
              [
                ['confirmedTeamsCount', confirmedTeamsCount],
                ['openTeamsCount', openTeamsCount],
                ['closedTeamsCount', closedTeamsCount],
                ['totalTeamsCount', snapshot.teams.length],
              ] as const
            ).map(([key, value]) => ({
              label: t(`gameApplication.${key}`),
              value,
              emphasis: key === 'confirmedTeamsCount',
            }))}
          />
        </Box>

        <SectionNavigation label={t('gameApplication.sectionNavigation')}>
          <AppButton tone="secondary" href="#application-roster" sx={{ flex: 1, minWidth: 0 }}>
            {t(
              snapshot.myTeam ? 'gameApplication.myTeamTitle' : 'gameApplication.createTeamAction',
            )}
          </AppButton>
          <AppButton tone="secondary" href="#application-teams" sx={{ flex: 1, minWidth: 0 }}>
            {t('gameApplication.createdTeamsTitle')}
          </AppButton>
        </SectionNavigation>

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
            alignItems: 'start',
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
                onLeave={() => leaveTeam.mutateAsync(undefined, { onSuccess: focusRoster })}
                isLeaving={leaveTeam.isPending}
                onRequestDisband={() => requestTeamDisband.mutateAsync()}
                onCancelDisbandRequest={() => cancelTeamDisbandRequest.mutateAsync()}
                isCancellingDisbandRequest={cancelTeamDisbandRequest.isPending}
                canCancelDisbandRequest={canCancelDisbandRequest}
                existingTeamNames={snapshot.teams
                  .filter((team) => team.teamId !== snapshot.myTeam?.teamId)
                  .map((team) => team.name)}
                isRequestingDisband={requestTeamDisband.isPending}
                onUpdateName={(name) => updateTeamName.mutateAsync(name)}
                isUpdatingName={updateTeamName.isPending}
                currentUserId={currentUserId}
                onUpdateReadiness={(isReady) => updateReadiness.mutateAsync(isReady)}
                isUpdatingReadiness={updateReadiness.isPending}
              />
            ) : (
              <CreateTeamSection
                existingNames={snapshot.teams.map((team) => team.name)}
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
