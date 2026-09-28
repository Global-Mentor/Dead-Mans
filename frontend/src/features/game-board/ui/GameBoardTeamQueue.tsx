import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { GameTeamQueueItem } from '../../../shared/api/contracts/index.ts'
import { AppButton, AsyncSection, RankBadge, StatusBadge } from '../../../shared/ui/index.ts'
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
              <Typography variant="body2" color="text.secondary">
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
                <Typography variant="body2" color="text.secondary">
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
          <Stack
            component="li"
            key={team.teamId}
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{
              minWidth: 0,
              py: 0.5,
              borderBottom: '1px solid',
              borderColor: 'divider',
              '&:first-child': { borderTop: '1px solid', borderTopColor: 'divider' },
              ...(own
                ? {
                    borderLeft: '3px solid',
                    borderLeftColor: 'primary.light',
                    pl: 0.75,
                    bgcolor: 'action.hover',
                  }
                : {}),
            }}
          >
            {ranked ? (
              <RankBadge
                rank={index + 1}
                compact
                ariaLabel={t('gameBoard.progress.place', { place: index + 1 })}
              />
            ) : (
              <Box
                component="span"
                aria-hidden
                sx={{
                  width: 7,
                  height: 7,
                  flexShrink: 0,
                  transform: 'rotate(45deg)',
                  border: '1px solid',
                  borderColor: own ? 'primary.light' : 'text.secondary',
                  mx: 1,
                }}
              />
            )}
            <Typography
              variant="body2"
              sx={{
                flex: 1,
                minWidth: 0,
                position: 'relative',
                fontWeight: own ? 700 : 500,
                color: own ? 'primary.light' : 'text.primary',
                overflowWrap: 'anywhere',
              }}
            >
              {formatTeamNameWithFallback(team.teamName, t('gameBoard.teamQueueUnnamedTeam'))}
              {own ? (
                <Box
                  component="span"
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '1px',
                    height: '1px',
                    overflow: 'hidden',
                    clipPath: 'inset(50%)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t('gameBoard.progress.yourTeam')}
                </Box>
              ) : null}
            </Typography>
            {team.isPlayed ? (
              <Stack spacing={0.5} alignItems="flex-end" sx={{ flexShrink: 0, maxWidth: '50%' }}>
                <StatusBadge
                  size="small"
                  density="compact"
                  variant="outlined"
                  color={
                    score === null || score === 0 ? 'default' : score > 0 ? 'success' : 'error'
                  }
                  aria-label={
                    formatted === null
                      ? t('gameBoard.teamQueueNoFinalScore')
                      : t('gameBoard.teamQueueFinalScoreLabel', { score: formatted })
                  }
                  label={
                    <Typography
                      component="span"
                      variant="inherit"
                      color={
                        score === null || score === 0
                          ? 'text.primary'
                          : score > 0
                            ? 'success.main'
                            : 'error.main'
                      }
                    >
                      {formatted === null
                        ? '-'
                        : t('gameBoard.cellPlayedPoints', { score: formatted })}
                    </Typography>
                  }
                  sx={{
                    flexShrink: 0,
                    maxWidth: '100%',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                />
              </Stack>
            ) : null}
          </Stack>
        )
      })}
    </Stack>
  )
}
