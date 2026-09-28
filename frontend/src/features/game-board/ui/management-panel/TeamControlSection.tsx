import { TeamIdentity } from '../../../../shared/game-ui/index.ts'
import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { GameTeamQueueItem } from '../../../../shared/api/contracts/index.ts'
import {
  AppButton,
  AsyncSection,
  SectionDivider,
  SelectionRow,
  StatusBadge,
} from '../../../../shared/ui/index.ts'
import { formatManagementTeamName } from '../../model/game-management-panel.ts'
import {
  ManagementControlSurface,
  ManagementSectionTitle,
  ManagementStateNotice,
} from './ManagementPanelSurfaces.tsx'

export function TeamControlSection({
  isActiveGame,
  isLoading,
  isError,
  isSelectingActiveTeam,
  isUpdatingPlayedState,
  isActiveTeamLocked,
  teams,
  selectableTeams,
  currentActiveTeam,
  resumableTeam,
  onSelectActiveTeam,
  onSetTeamPlayedState,
}: {
  isActiveGame: boolean
  isLoading: boolean
  isError: boolean
  isSelectingActiveTeam: boolean
  isUpdatingPlayedState: boolean
  isActiveTeamLocked: boolean
  teams: readonly GameTeamQueueItem[]
  selectableTeams: readonly GameTeamQueueItem[]
  currentActiveTeam: GameTeamQueueItem | null
  resumableTeam: GameTeamQueueItem | null
  onSelectActiveTeam: (teamId: string | null) => void | Promise<unknown>
  onSetTeamPlayedState: (input: { teamId: string; isPlayed: boolean }) => void | Promise<unknown>
}) {
  const { t } = useTranslation()
  const spotlightTeam = currentActiveTeam ?? resumableTeam
  const otherTeams = selectableTeams.filter((team) => team.teamId !== currentActiveTeam?.teamId)
  const isTeamControlBusy = isSelectingActiveTeam || isUpdatingPlayedState

  return (
    <ManagementControlSurface kind="team">
      <Stack spacing={1.5}>
        <Stack
          direction="row"
          gap={1}
          flexWrap="wrap"
          useFlexGap
          alignItems="center"
          justifyContent="space-between"
          sx={{ pb: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <ManagementSectionTitle
            icon="team"
            title={t('gameBoard.managementActiveTeamTitle')}
            tooltip={t('gameBoard.managementActiveTeamTooltip')}
          />
          <StatusBadge
            size="small"
            variant="outlined"
            appearance="plain"
            label={t('gameBoard.managementTeamsRemainingMetricValue', {
              count: selectableTeams.length,
            })}
          />
        </Stack>

        {!isActiveGame ? (
          <Typography variant="body2" color="text.secondary">
            {t('gameBoard.managementActiveTeamInactive')}
          </Typography>
        ) : (
          <AsyncSection
            isLoading={isLoading}
            isError={isError}
            isEmpty={teams.length === 0}
            hasData={teams.length > 0}
            loadingMessage={t('gameBoard.managementActiveTeamLoading')}
            errorMessage={t('gameBoard.managementActiveTeamError')}
            emptyMessage={t('gameBoard.managementActiveTeamNoTeams')}
          >
            <>
              <TeamSpotlight
                team={spotlightTeam}
                isCurrent={currentActiveTeam !== null}
                description={
                  currentActiveTeam
                    ? null
                    : resumableTeam
                      ? t('gameBoard.managementActiveTeamResumeHint', {
                          slot: resumableTeam.teamSlotIndex,
                        })
                      : t('gameBoard.managementActiveTeamRequired')
                }
              />

              {isActiveTeamLocked ? (
                <ManagementStateNotice tone="warning">
                  {t('gameBoard.managementActiveTeamLocked')}
                </ManagementStateNotice>
              ) : null}

              {currentActiveTeam?.isPlayed ? (
                <ManagementStateNotice tone="success">
                  {t('gameBoard.teamPlayedSelectedNotice')}
                </ManagementStateNotice>
              ) : null}

              <Stack
                direction="row"
                flexWrap="wrap"
                useFlexGap
                spacing={0.75}
                sx={{ '& > button': { flex: '1 1 140px' } }}
              >
                {resumableTeam && !currentActiveTeam ? (
                  <AppButton
                    tone="secondary"
                    disabled={isTeamControlBusy || isActiveTeamLocked}
                    onClick={() =>
                      onSetTeamPlayedState({ teamId: resumableTeam.teamId, isPlayed: true })
                    }
                  >
                    {t('gameBoard.teamPlayedMarkAction')}
                  </AppButton>
                ) : null}

                {currentActiveTeam ? (
                  <>
                    <AppButton
                      tone="secondary"
                      onClick={() => onSelectActiveTeam(null)}
                      disabled={isTeamControlBusy || isActiveTeamLocked}
                    >
                      {t('gameBoard.managementActiveTeamClearAction')}
                    </AppButton>
                    <AppButton
                      tone="secondary"
                      disabled={isTeamControlBusy || isActiveTeamLocked}
                      onClick={() =>
                        onSetTeamPlayedState({
                          teamId: currentActiveTeam.teamId,
                          isPlayed: !currentActiveTeam.isPlayed,
                        })
                      }
                    >
                      {currentActiveTeam.isPlayed
                        ? t('gameBoard.teamPlayedResetAction')
                        : t('gameBoard.teamPlayedMarkAction')}
                    </AppButton>
                  </>
                ) : null}
              </Stack>

              {otherTeams.length > 0 ? (
                <>
                  <SectionDivider />

                  <Stack spacing={0.65}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 850 }}>
                      {t('gameBoard.managementActiveTeamQuickListTitle')}
                    </Typography>
                    <Stack spacing={0.55} sx={{ maxHeight: 320, overflowY: 'auto', pr: 0.25 }}>
                      {otherTeams.map((team) => {
                        const isCurrent = team.teamId === currentActiveTeam?.teamId
                        const isDisabled = isTeamControlBusy || isActiveTeamLocked || isCurrent

                        return (
                          <CompactTeamRow
                            key={team.teamId}
                            team={team}
                            isCurrent={isCurrent}
                            disabled={isDisabled}
                            onSelect={() => onSelectActiveTeam(team.teamId)}
                          />
                        )
                      })}
                    </Stack>
                  </Stack>
                </>
              ) : null}

              {selectableTeams.length === 0 && !currentActiveTeam ? (
                <ManagementStateNotice tone="info">
                  {t('gameBoard.managementActiveTeamNoSelectableTeams')}
                </ManagementStateNotice>
              ) : null}
            </>
          </AsyncSection>
        )}
      </Stack>
    </ManagementControlSurface>
  )
}

function TeamSpotlight({
  team,
  isCurrent,
  description,
}: {
  team: GameTeamQueueItem | null
  isCurrent: boolean
  description: string | null
}) {
  const { t } = useTranslation()

  return (
    <Box sx={{ minWidth: 0 }}>
      <Stack spacing={1}>
        <TeamIdentity
          name={
            team
              ? formatManagementTeamName(t, team.teamName, team.teamSlotIndex)
              : t('gameBoard.managementActiveTeamNone')
          }
          participants={team?.participants.map((participant) => participant.displayName) ?? []}
          emptyLabel={team ? t('gameBoard.roundSummaryNoParticipants') : ''}
          status={
            isCurrent ? (
              <StatusBadge
                size="small"
                color="success"
                variant="filled"
                label={t('gameBoard.teamQueueActiveChip')}
              />
            ) : null
          }
        />
        {description ? (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        ) : null}
      </Stack>
    </Box>
  )
}

function CompactTeamRow({
  team,
  isCurrent,
  disabled,
  onSelect,
}: {
  team: GameTeamQueueItem
  isCurrent: boolean
  disabled: boolean
  onSelect: () => void
}) {
  const { t } = useTranslation()

  return (
    <SelectionRow
      type="button"
      disabled={disabled}
      selected={isCurrent}
      onClick={onSelect}
      sx={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', gap: 0.8 }}
    >
      <StatusBadge label={`#${team.teamSlotIndex}`} />

      <TeamIdentity
        compact
        name={formatManagementTeamName(t, team.teamName, team.teamSlotIndex)}
        participants={team.participants.map((participant) => participant.displayName)}
        emptyLabel={t('gameBoard.roundSummaryNoParticipants')}
        status={
          <Stack direction="row" gap={0.5} flexWrap="wrap">
            {isCurrent ? (
              <StatusBadge
                size="small"
                color="success"
                label={t('gameBoard.teamQueueActiveChip')}
              />
            ) : null}
            {team.isPlayed ? (
              <StatusBadge
                size="small"
                color="success"
                variant="outlined"
                label={t('gameBoard.teamQueuePlayedChip')}
              />
            ) : null}
          </Stack>
        }
      />
    </SelectionRow>
  )
}
