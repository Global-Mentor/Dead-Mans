import {
  AppButton,
  InlineNotice,
  AppToast,
  PageShell,
  PageStatePanel,
} from '../../shared/ui/index.ts'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../shared/auth/use-auth.ts'
import { hasPanelCapability } from '../../shared/auth/panel-capabilities.ts'
import { AdminRegistrationPanel } from '../game-registration/index.ts'
import { useTeamRegistrationsPage } from './use-team-registrations-page.ts'

export function TeamRegistrationsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const {
    adminSnapshotQuery,
    createAdminTeam,
    createAdminInvitation,
    assignPlayerToTeam,
    removePlayerFromTeam,
    cancelTeamInvitation,
    moveTeamToSlot,
    confirmTeam,
    unconfirmTeam,
    rejectTeam,
    disbandTeam,
    teamPlayedState,
    updateTeamName,
    toastMessage,
    dismissToast,
  } = useTeamRegistrationsPage()

  if (adminSnapshotQuery.isLoading) {
    return (
      <PageStatePanel
        title={t('teamRegistrations.title')}
        message={t('teamRegistrations.loading')}
        showSpinner
      />
    )
  }

  if (adminSnapshotQuery.isError && !adminSnapshotQuery.data) {
    return (
      <PageStatePanel
        title={t('teamRegistrations.title')}
        message={t('teamRegistrations.errorLoading')}
        tone="error"
        actions={
          <AppButton tone="secondary" onClick={() => void adminSnapshotQuery.refetch()}>
            {t('teamRegistrations.retry')}
          </AppButton>
        }
      />
    )
  }

  if (adminSnapshotQuery.data == null) {
    return (
      <PageShell
        sx={{
          maxWidth: 1440,
          width: '100%',
          flex: '1 1 0%',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        <PageStatePanel
          title={t('teamRegistrations.title')}
          message={t('teamRegistrations.notOpen')}
        />
      </PageShell>
    )
  }

  return (
    <PageShell
      sx={{
        maxWidth: 1440,
        width: '100%',
        flex: '1 1 0%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      {adminSnapshotQuery.isError ? (
        <InlineNotice
          severity="error"
          action={
            <AppButton
              tone="secondary"
              size="small"
              onClick={() => void adminSnapshotQuery.refetch()}
            >
              {t('teamRegistrations.retry')}
            </AppButton>
          }
        >
          {t('teamRegistrations.errorLoading')}
        </InlineNotice>
      ) : null}

      <AdminRegistrationPanel
        canCreateAdditionalTeams={hasPanelCapability('createAdditionalTeams', user?.roles)}
        snapshot={adminSnapshotQuery.data}
        isCreatingTeam={createAdminTeam.isPending}
        isCreatingInvitation={(teamId) =>
          createAdminInvitation.isPending && createAdminInvitation.variables?.teamId === teamId
        }
        isAssigningPlayer={assignPlayerToTeam.isPending}
        isRemovingPlayer={(teamId, userId) =>
          removePlayerFromTeam.isPending &&
          removePlayerFromTeam.variables?.teamId === teamId &&
          removePlayerFromTeam.variables.userId === userId
        }
        isCancellingTeamInvitation={(teamId, invitationId) =>
          cancelTeamInvitation.isPending &&
          cancelTeamInvitation.variables?.teamId === teamId &&
          cancelTeamInvitation.variables.invitationId === invitationId
        }
        isMovingTeam={moveTeamToSlot.isPending}
        isUnconfirmingTeam={(teamId) =>
          unconfirmTeam.isPending && unconfirmTeam.variables === teamId
        }
        isConfirmingTeam={(teamId) => confirmTeam.isPending && confirmTeam.variables === teamId}
        isRejectingTeam={(teamId) => rejectTeam.isPending && rejectTeam.variables === teamId}
        isDisbandingTeam={(teamId) => disbandTeam.isPending && disbandTeam.variables === teamId}
        isTogglingPlayedState={(teamId) =>
          teamPlayedState.isUpdatingPlayedState && teamPlayedState.updatingTeamId === teamId
        }
        isUpdatingTeamName={(teamId) =>
          updateTeamName.isPending && updateTeamName.variables?.teamId === teamId
        }
        onCreateTeam={(recruitmentOpen, teamSlotId) =>
          createAdminTeam.mutate({ recruitmentOpen, teamSlotId })
        }
        onCreateInvitation={(teamSlotId, invitedUserId, teamId, onSuccess, onError) =>
          createAdminInvitation.mutate(
            { teamSlotId, invitedUserId, teamId },
            { onSuccess, onError },
          )
        }
        onAssignPlayer={(teamId, userId, onSuccess, onError) =>
          onSuccess
            ? assignPlayerToTeam.mutate(
                { teamId, userId },
                { onSuccess, ...(onError ? { onError } : {}) },
              )
            : assignPlayerToTeam.mutate({ teamId, userId })
        }
        onRemovePlayer={(teamId, userId, onSuccess, onError) =>
          removePlayerFromTeam.mutate({ teamId, userId }, { onSuccess, onError })
        }
        onCancelTeamInvitation={(teamId, invitationId) =>
          cancelTeamInvitation.mutate({ teamId, invitationId })
        }
        onMoveTeam={(teamId, targetTeamSlotId) =>
          moveTeamToSlot.mutate({ teamId, targetTeamSlotId })
        }
        onUnconfirmTeam={(teamId, onSuccess, onError) =>
          unconfirmTeam.mutate(teamId, { onSuccess, onError })
        }
        onConfirmTeam={(teamId, onSuccess, onError) =>
          confirmTeam.mutate(teamId, { onSuccess, onError })
        }
        onRejectTeam={(teamId, onSuccess, onError) =>
          rejectTeam.mutate(teamId, { onSuccess, onError })
        }
        onDisbandTeam={(teamId, onSuccess, onError) =>
          disbandTeam.mutate(teamId, { onSuccess, onError })
        }
        onTogglePlayedState={async (teamId, isPlayed) => {
          try {
            await teamPlayedState.setTeamPlayedState({ teamId, isPlayed })
            return null
          } catch (error) {
            return teamPlayedState.getErrorMessage(error)
          }
        }}
        onUpdateTeamName={(teamId, name) => updateTeamName.mutate({ teamId, name })}
      />

      <AppToast
        message={toastMessage}
        onClose={dismissToast}
        severity="error"
        autoHideDuration={5000}
      />
    </PageShell>
  )
}
