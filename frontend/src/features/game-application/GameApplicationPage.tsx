import { useTranslation } from 'react-i18next'
import { gameBoardRoute } from '../../routes/app-routes.ts'
import {
  AppLinkButton,
  AppToast,
  PageShell,
  PageStatePanel,
  SectionHeader,
} from '../../shared/ui/index.ts'
import { CreateTeamSection } from './ui/CreateTeamSection.tsx'
import { MyTeamSection } from './ui/MyTeamSection.tsx'
import { OpenTeamsSection } from './ui/OpenTeamsSection.tsx'
import { PendingInvitationsSection } from './ui/PendingInvitationsSection.tsx'
import { useGameApplicationPage } from './use-game-application-page.ts'

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

      <PendingInvitationsSection
        invitations={snapshot.myPendingInvitations}
        onAccept={(invitationId) => acceptInvitation.mutate(invitationId)}
        onDecline={(invitationId) => declineInvitation.mutate(invitationId)}
        pendingAcceptId={acceptInvitation.isPending ? acceptInvitation.variables : undefined}
        pendingDeclineId={declineInvitation.isPending ? declineInvitation.variables : undefined}
      />

      {snapshot.myTeam ? (
        <MyTeamSection
          team={snapshot.myTeam}
          onLeave={() => leaveTeam.mutate()}
          isLeaving={leaveTeam.isPending}
        />
      ) : (
        <CreateTeamSection
          onCreate={(recruitmentOpen) => createTeam.mutate(recruitmentOpen)}
          isCreating={createTeam.isPending}
        />
      )}

      {snapshot.myTeam === null ? (
        <OpenTeamsSection
          teams={openTeams}
          onJoin={(teamId) => joinTeam.mutate(teamId)}
          joiningTeamId={joinTeam.isPending ? joinTeam.variables : undefined}
        />
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
