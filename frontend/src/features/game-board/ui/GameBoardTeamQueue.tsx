import { Box, Stack, Typography } from '@mui/material'
import { TeamPresentation } from '../../../shared/game-ui/index.ts'
import { useTranslation } from 'react-i18next'
import type { GameTeamQueueItem } from '../../../shared/api/contracts/index.ts'
import {
  AppButton,
  AsyncSection,
  RankBadge,
  StatusBadge,
  ItemCard,
} from '../../../shared/ui/index.ts'
import { formatTeamNameWithFallback } from '../../game-registration/model/team-name.ts'
import { groupTeamQueueTeams, sortPlayedTeamsByScore } from '../model/team-queue-order.ts'
import { GameBoardOrnamentDivider } from './GameBoardOrnamentDivider.tsx'

export interface BoardQueueState {
  teams: readonly GameTeamQueueItem[]
  isLoading: boolean
  isError: boolean
  hasData: boolean
  isRefreshing: boolean
  onRetry: () => void
}

interface GameBoardTeamQueueProps extends BoardQueueState {
  currentUserId: string | null
}

export function GameBoardTeamQueue({
  teams,
  isLoading,
  isError,
  hasData,
  isRefreshing,
  onRetry,
  currentUserId,
}: GameBoardTeamQueueProps) {
  const { t } = useTranslation()
  const { remainingTeams, playedTeams } = groupTeamQueueTeams(teams)
  const rankedPlayedTeams = sortPlayedTeamsByScore(playedTeams)
  const playedTitle = t('gameBoard.progress.played')
  const playedList = (
    <QueueList
      teams={rankedPlayedTeams.map(({ team }) => team)}
      ranked
      currentUserId={currentUserId}
    />
  )
  return (
    <Box data-testid="game-board-team-queue" sx={{ minWidth: 0 }}>
      <AsyncSection
        isLoading={isLoading}
        isError={isError}
        hasData={hasData}
        isEmpty={false}
        loadingMessage={t('gameBoard.teamQueueLoading')}
        errorMessage={t('gameBoard.teamQueueError')}
        emptyMessage={t('gameBoard.teamQueueEmpty')}
        retryAction={
          <AppButton tone="secondary" size="small" onClick={onRetry} loading={isRefreshing}>
            {t('common.actions.retry')}
          </AppButton>
        }
      >
        <Stack spacing={0.75}>
          <Box
            component="section"
            aria-label={t('gameBoard.progress.waiting', { count: remainingTeams.length })}
          >
            {remainingTeams.length ? (
              <QueueList
                teams={remainingTeams.map(({ team }) => team)}
                currentUserId={currentUserId}
              />
            ) : (
              <Typography variant="body2" color="text.secondary" align="center">
                {t('gameBoard.progress.noWaiting')}
              </Typography>
            )}
          </Box>
          <Box component="section" aria-label={playedTitle}>
            <GameBoardOrnamentDivider />
            <Box sx={{ pt: 0.5 }}>
              <Typography
                component="h3"
                variant="subtitle2"
                color="primary.light"
                sx={{
                  py: 0.5,
                  fontWeight: 750,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  textAlign: 'center',
                }}
              >
                {playedTitle}
              </Typography>
              {playedTeams.length ? (
                playedList
              ) : (
                <Typography variant="body2" color="text.secondary" align="center">
                  {t('gameBoard.teamQueuePlayedEmpty')}
                </Typography>
              )}
            </Box>
          </Box>
        </Stack>
      </AsyncSection>
    </Box>
  )
}

function QueueList({
  teams,
  ranked = false,
  currentUserId,
}: {
  teams: readonly GameTeamQueueItem[]
  ranked?: boolean
  currentUserId: string | null
}) {
  const { t, i18n } = useTranslation()
  return (
    <Stack component="ul" spacing={0} sx={{ listStyle: 'none', p: 0, m: 0, mt: 0.5 }}>
      {teams.map((team, index) => {
        const own = team.participants.some((participant) => participant.userId === currentUserId)
        const score = team.finalScore ?? null
        const formatted = score === null ? null : new Intl.NumberFormat(i18n.language).format(score)
        return (
          <ItemCard
            component="li"
            key={team.teamId}
            density="compact"
            emphasis={own ? 'selected' : 'none'}
            sx={{ minWidth: 0, mb: 0.75 }}
          >
            <TeamPresentation
              density="compact"
              name={formatTeamNameWithFallback(team.teamName, t('gameBoard.teamQueueUnnamedTeam'))}
              members={team.participants.map((player) => ({
                id: player.userId,
                name: player.displayName,
              }))}
              emptyLabel={t('gameBoard.roundSummaryNoParticipants')}
              leading={
                ranked ? (
                  <RankBadge
                    rank={index + 1}
                    compact
                    ariaLabel={t('gameBoard.progress.place', { place: index + 1 })}
                  />
                ) : (
                  <StatusBadge density="compact" variant="outlined" label={team.teamSlotIndex} />
                )
              }
              status={
                <>
                  {team.isPlayed ? (
                    <Typography
                      variant="caption"
                      aria-label={
                        formatted === null
                          ? t('gameBoard.teamQueueNoFinalScore')
                          : t('gameBoard.teamQueueFinalScoreLabel', { score: formatted })
                      }
                      color={
                        score === null || score === 0
                          ? 'text.secondary'
                          : score > 0
                            ? 'success.main'
                            : 'error.main'
                      }
                    >
                      {formatted === null
                        ? '-'
                        : t('boardCard.cellPlayedPoints', { score: formatted })}
                    </Typography>
                  ) : null}
                </>
              }
            />
          </ItemCard>
        )
      })}
    </Stack>
  )
}
