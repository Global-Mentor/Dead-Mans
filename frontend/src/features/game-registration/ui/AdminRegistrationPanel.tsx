import { Box, Stack, Typography, useMediaQuery, useTheme } from '@mui/material'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  GameRegistrationAdminSnapshot,
  RegistrationPlayer,
  RegistrationTeam,
} from '../../../shared/api/contracts/index.ts'
import { SectionCard, SectionHeader, TabStrip, TabOption } from '../../../shared/ui/index.ts'
import { AdminAvailablePlayersPanel } from './AdminAvailablePlayersPanel.tsx'
import { AdminTeamPlayerDialog, type AdminTeamTarget } from './AdminTeamPlayerDialog.tsx'
import { AdminRegistrationConfirmations } from './AdminRegistrationConfirmations.tsx'
import { useAdminRegistrationCatalog } from '../use-admin-registration-catalog.ts'
import { AdminRegistrationTeamDetails } from './AdminRegistrationTeamDetails.tsx'
import { AdminRegistrationTeamsList } from './AdminRegistrationTeamsList.tsx'
import { AdminTeamRejectionConfirmation } from './AdminTeamRejectionConfirmation.tsx'
import { AdminTeamWorkspaceHeader } from './AdminTeamWorkspaceHeader.tsx'
import { AdminRegistrationToolbar } from './AdminRegistrationToolbar.tsx'
import { getGameRegistrationMutationErrorMessage } from '../api/game-registration-mutation-errors.ts'
import { AdminTeamPlayedConfirmation } from './AdminTeamPlayedConfirmation.tsx'
import { AdminAssignPlayerDialog } from './AdminAssignPlayerDialog.tsx'

export interface AdminRegistrationPanelProps {
  canCreateAdditionalTeams?: boolean
  snapshot: GameRegistrationAdminSnapshot
  isCreatingTeam: boolean
  isCreatingInvitation: (teamId: string) => boolean
  isAssigningPlayer: boolean
  isRemovingPlayer: (teamId: string, userId: string) => boolean
  isCancellingTeamInvitation: (teamId: string, invitationId: string) => boolean
  isMovingTeam: boolean
  isUnconfirmingTeam: (teamId: string) => boolean
  isConfirmingTeam: (teamId: string) => boolean
  isRejectingTeam: (teamId: string) => boolean
  isDisbandingTeam: (teamId: string) => boolean
  isTogglingPlayedState: (teamId: string) => boolean
  isUpdatingTeamName: (teamId: string) => boolean
  onCreateTeam: (recruitmentOpen: boolean, teamSlotId?: string) => void
  onCreateInvitation: (
    teamSlotId: string,
    invitedUserId: string,
    teamId: string,
    onSuccess: () => void,
    onError: (error: Error) => void,
  ) => void
  onAssignPlayer: (
    teamId: string,
    userId: string,
    onSuccess?: () => void,
    onError?: (error: Error) => void,
  ) => void
  onRemovePlayer: (
    teamId: string,
    userId: string,
    onSuccess: () => void,
    onError: (error: Error) => void,
  ) => void
  onCancelTeamInvitation: (teamId: string, invitationId: string) => void
  onMoveTeam: (teamId: string, targetTeamSlotId: string) => void
  onUnconfirmTeam: (teamId: string, onSuccess: () => void, onError: (error: Error) => void) => void
  onConfirmTeam: (teamId: string, onSuccess: () => void, onError: (error: Error) => void) => void
  onRejectTeam: (teamId: string, onSuccess: () => void, onError: (error: Error) => void) => void
  onDisbandTeam: (teamId: string, onSuccess: () => void, onError: (error: Error) => void) => void
  onTogglePlayedState: (teamId: string, isPlayed: boolean) => Promise<string | null>
  onUpdateTeamName: (teamId: string, name?: string) => void
}

export function AdminRegistrationPanel(props: AdminRegistrationPanelProps) {
  const { snapshot, isCreatingTeam, isCreatingInvitation, onCreateTeam, onCreateInvitation } = props
  const { t } = useTranslation()
  const workspaceId = useId()
  const [activePanel, setActivePanel] = useState('teams')
  const [playerQuery, setPlayerQuery] = useState('')
  const resetFilters = () => {
    setSearch('')
    setStatus('all')
    setPlayerQuery('')
  }
  const isDesktop = useMediaQuery(useTheme().breakpoints.up('lg'))
  const [dialogError, setDialogError] = useState<string | null>(null)
  const onDialogError = (error: Error) =>
    setDialogError(getGameRegistrationMutationErrorMessage(error, t))
  const [assignPlayer, setAssignPlayer] = useState<RegistrationPlayer | null>(null)
  const [inviteDialog, setInviteDialog] = useState<AdminTeamTarget | null>(null)
  const [pendingPlayedTeam, setPendingPlayedTeam] = useState<RegistrationTeam | null>(null)
  const [pendingConfirmTeam, setPendingConfirmTeam] = useState<RegistrationTeam | null>(null)
  const [pendingUnconfirmTeam, setPendingUnconfirmTeam] = useState<RegistrationTeam | null>(null)
  const [pendingRejectTeam, setPendingRejectTeam] = useState<RegistrationTeam | null>(null)
  const [pendingDisbandTeam, setPendingDisbandTeam] = useState<RegistrationTeam | null>(null)
  const [pendingRemovePlayer, setPendingRemovePlayer] = useState<{
    teamId: string
    teamSlotIndex: number
    player: RegistrationPlayer
  } | null>(null)

  const {
    search,
    setSearch,
    status,
    setStatus,
    orderedTeamEntries,
    hasAvailableCreateTeamSlot,
    disbandRequestsCount,
    visibleEntries,
    assignableTeams,
  } = useAdminRegistrationCatalog(snapshot)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(
    () => orderedTeamEntries[0]?.team.teamId ?? null,
  )
  const [nameDirty, setNameDirty] = useState(false)
  const [pendingSelection, setPendingSelection] = useState<string | null>(null)
  const selectedEntry =
    orderedTeamEntries.find(({ team }) => team.teamId === selectedTeamId) ?? orderedTeamEntries[0]
  const selectTeam = (teamId: string) => {
    if (selectedEntry && props.isUpdatingTeamName(selectedEntry.team.teamId)) return
    if (nameDirty && selectedEntry?.team.teamId !== teamId) {
      setPendingSelection(teamId)
      return
    }
    setSelectedTeamId(teamId)
    setActivePanel('detail')
  }

  const playersPanel = (
    <AdminAvailablePlayersPanel
      players={snapshot.availablePlayers}
      playerQuery={playerQuery}
      onPlayerQuery={setPlayerQuery}
      onAssign={(player) => {
        setDialogError(null)
        setAssignPlayer(player)
      }}
      isAssigning={props.isAssigningPlayer}
    />
  )
  const detailPanel = selectedEntry ? (
    <AdminRegistrationTeamDetails
      key={selectedEntry.team.teamId}
      entry={selectedEntry}
      controls={props}
      onDirtyChange={setNameDirty}
      onMovePlayer={(player) => {
        setDialogError(null)
        setAssignPlayer(player)
      }}
      onInvite={(target) => {
        setDialogError(null)
        setInviteDialog(target)
      }}
      onRequestPlayed={setPendingPlayedTeam}
      onRequestConfirm={(team) => {
        setDialogError(null)
        setPendingConfirmTeam(team)
      }}
      onRequestUnconfirm={(team) => {
        setDialogError(null)
        setPendingUnconfirmTeam(team)
      }}
      onRequestReject={(team) => {
        setDialogError(null)
        setPendingRejectTeam(team)
      }}
      onRequestDisband={(team) => {
        setDialogError(null)
        setPendingDisbandTeam(team)
      }}
      onRequestRemove={(target) => {
        setDialogError(null)
        setPendingRemovePlayer(target)
      }}
    />
  ) : (
    <Typography color="text.secondary" sx={{ p: 2 }}>
      {t('teamRegistrations.selectPrompt')}
    </Typography>
  )

  return (
    <>
      <SectionCard
        sx={{
          flex: '1 1 0%',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            maxHeight: '45%',
            flexShrink: 0,
            overflowY: 'auto',
            scrollbarWidth: 'thin',
            scrollbarGutter: 'stable both-edges',
          }}
        >
          <Box sx={{ mb: 1.5 }}>
            <SectionHeader headingLevel="h1" title={t('teamRegistrations.title')} />
          </Box>
          <AdminRegistrationToolbar
            search={search}
            onSearch={setSearch}
            status={status}
            onStatus={setStatus}
            requestsCount={disbandRequestsCount}
            onReset={resetFilters}
          />
        </Box>
        <Box
          sx={{
            display: { xs: 'block', lg: 'none' },
            mt: 1,
            flexShrink: 0,
            overflow: 'hidden',
            scrollbarWidth: 'thin',
            scrollbarGutter: 'stable both-edges',
          }}
        >
          <TabStrip
            appearance="framed"
            density="compact"
            value={activePanel}
            onChange={(_, value: string) => setActivePanel(value)}
            aria-label={t('teamRegistrations.title')}
            variant="fullWidth"
          >
            <TabOption
              appearance="framed"
              density="compact"
              value="teams"
              id={workspaceId + '-teams-tab'}
              aria-controls={workspaceId + '-teams-panel'}
              label={t('teamRegistrations.teamsTab', { count: orderedTeamEntries.length })}
            />
            <TabOption
              appearance="framed"
              density="compact"
              value="detail"
              id={workspaceId + '-detail-tab'}
              aria-controls={workspaceId + '-detail-panel'}
              label={t('teamRegistrations.details')}
            />
            <TabOption
              appearance="framed"
              density="compact"
              value="players"
              id={workspaceId + '-players-tab'}
              aria-controls={workspaceId + '-players-panel'}
              label={t('teamRegistrations.playersTab', { count: snapshot.availablePlayers.length })}
            />
          </TabStrip>
        </Box>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'minmax(0,1fr)', lg: 'repeat(2,minmax(0,1fr))' },
            gap: 2,
            flex: '1 1 0%',
            minHeight: 0,
            mt: { xs: 1, lg: 1.5 },
          }}
        >
          <Box
            id={workspaceId + '-teams-panel'}
            role={isDesktop ? undefined : 'tabpanel'}
            aria-labelledby={isDesktop ? undefined : workspaceId + '-teams-tab'}
            sx={{
              display: { xs: activePanel === 'teams' ? 'flex' : 'none', lg: 'flex' },
              flexDirection: 'column',
              minHeight: 0,
              minWidth: 0,
            }}
          >
            <Box
              role="region"
              aria-label={t('teamRegistrations.list')}
              tabIndex={0}
              sx={{
                flex: '1 1 0%',
                minHeight: 0,
                overflowY: 'auto',
                overscrollBehavior: 'contain',
                scrollbarWidth: 'thin',
                scrollbarGutter: 'stable both-edges',
              }}
            >
              <Stack gap={0.5}>
                {!visibleEntries.length ? (
                  <Stack gap={1} alignItems="center" sx={{ p: 2 }}>
                    <Typography color="text.secondary">
                      {t(
                        orderedTeamEntries.length
                          ? 'teamRegistrations.noMatches'
                          : 'gameApplication.adminPanel.emptyTeams',
                      )}
                    </Typography>
                  </Stack>
                ) : null}
                <AdminRegistrationTeamsList
                  controls={props}
                  orderedTeamEntries={orderedTeamEntries}
                  visibleTeamIds={new Set(visibleEntries.map(({ team }) => team.teamId))}
                  selectedTeamId={selectedEntry?.team.teamId}
                  onSelect={selectTeam}
                />
              </Stack>
            </Box>
          </Box>
          <Box
            sx={{
              overflow: 'hidden',
              display: { xs: activePanel === 'teams' ? 'none' : 'flex', lg: 'flex' },
              flexDirection: 'column',
              minHeight: 0,
              minWidth: 0,
            }}
          >
            <AdminTeamWorkspaceHeader
              workspaceId={workspaceId}
              activePanel={activePanel}
              onPanelChange={setActivePanel}
              playerCount={snapshot.availablePlayers.length}
              canCreate={hasAvailableCreateTeamSlot || Boolean(props.canCreateAdditionalTeams)}
              isCreating={isCreatingTeam}
              onCreate={onCreateTeam}
            />
            <Box
              sx={{
                p: 0,
                flex: '1 1 0%',
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <Box
                id={workspaceId + '-detail-panel'}
                role="tabpanel"
                aria-labelledby={workspaceId + (isDesktop ? '-desktop-detail-tab' : '-detail-tab')}
                sx={{
                  display: activePanel === 'players' ? 'none' : 'block',
                  flex: '1 1 0%',
                  minHeight: 0,
                  overflowY: 'auto',
                  overscrollBehavior: 'contain',
                  scrollbarWidth: 'thin',
                  scrollbarGutter: 'stable both-edges',
                  pb: 1,
                  pt: 0,
                }}
              >
                {detailPanel}
              </Box>
              <Box
                id={workspaceId + '-players-panel'}
                role="tabpanel"
                aria-labelledby={
                  workspaceId + (isDesktop ? '-desktop-players-tab' : '-players-tab')
                }
                sx={{
                  display: activePanel === 'players' ? 'flex' : 'none',
                  flex: '1 1 0%',
                  minHeight: 0,
                  overflow: 'hidden',
                  scrollbarWidth: 'thin',
                  scrollbarGutter: 'stable both-edges',
                  pb: 1,
                  pt: 0,
                }}
              >
                {playersPanel}
              </Box>
            </Box>
          </Box>
        </Box>
      </SectionCard>
      {pendingPlayedTeam ? (
        <AdminTeamPlayedConfirmation
          team={pendingPlayedTeam}
          controls={props}
          onClose={() => setPendingPlayedTeam(null)}
        />
      ) : null}
      <AdminTeamRejectionConfirmation
        controls={props}
        team={pendingRejectTeam}
        error={dialogError}
        onClose={() => setPendingRejectTeam(null)}
        onError={onDialogError}
      />
      <AdminRegistrationConfirmations
        controls={props}
        dialogError={dialogError}
        onDialogError={onDialogError}
        pendingConfirmTeam={pendingConfirmTeam}
        setPendingConfirmTeam={setPendingConfirmTeam}
        pendingUnconfirmTeam={pendingUnconfirmTeam}
        setPendingUnconfirmTeam={setPendingUnconfirmTeam}
        pendingDisbandTeam={pendingDisbandTeam}
        setPendingDisbandTeam={setPendingDisbandTeam}
        pendingRemovePlayer={pendingRemovePlayer}
        setPendingRemovePlayer={setPendingRemovePlayer}
        pendingSelection={pendingSelection}
        setPendingSelection={setPendingSelection}
        setSelectedTeamId={setSelectedTeamId}
        setNameDirty={setNameDirty}
        setActivePanel={setActivePanel}
      />
      {assignPlayer ? (
        <AdminAssignPlayerDialog
          player={assignPlayer}
          teams={assignableTeams.filter(
            (team) => !team.members.some((member) => member.player.userId === assignPlayer.userId),
          )}
          initialTeamId={selectedEntry?.team.teamId}
          isBusy={props.isAssigningPlayer}
          onClose={() => setAssignPlayer(null)}
          errorMessage={dialogError}
          onAssign={(teamId, userId, onSuccess) =>
            props.onAssignPlayer(teamId, userId, onSuccess, onDialogError)
          }
        />
      ) : null}

      <AdminTeamPlayerDialog
        key={inviteDialog?.team.teamId ?? 'closed'}
        errorMessage={dialogError}
        target={inviteDialog}
        availablePlayers={snapshot.availablePlayers}
        isBusy={
          props.isAssigningPlayer ||
          (inviteDialog ? isCreatingInvitation(inviteDialog.team.teamId) : false)
        }
        onClose={() => setInviteDialog(null)}
        onAdd={(teamId, userId) =>
          props.onAssignPlayer(teamId, userId, () => setInviteDialog(null), onDialogError)
        }
        onInvite={(teamSlotId, invitedUserId, teamId) => {
          onCreateInvitation(
            teamSlotId,
            invitedUserId,
            teamId,
            () => setInviteDialog(null),
            onDialogError,
          )
        }}
      />
    </>
  )
}
