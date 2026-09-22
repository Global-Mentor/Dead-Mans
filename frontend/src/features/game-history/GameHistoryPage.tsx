import { Box, Stack, Typography, useMediaQuery } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import type { components } from '../../shared/api/contracts/generated'
import {
  AsyncSection,
  FormTextField,
  PageShell,
  SectionCard,
  SectionHeader,
} from '../../shared/ui/index.ts'
import { currentGameBoardQueryOptions } from '../game-board/index.ts'
import {
  gameHistoryGameDetailsQueryOptions,
  gameHistoryGamesQueryOptions,
} from './api/game-history-queries.ts'
import {
  getTeamFinalScore,
  sortTeamLeaderboardEntries,
} from './model/game-history-team-leaderboard.ts'
import { isCountedRound, normalizeStatus } from './model/game-history-view.ts'
import { CurrentGameLeaderboard } from './ui/CurrentGameLeaderboard.tsx'
import { GameDetailsPanel } from './ui/GameHistoryDetailsPanel.tsx'
import {
  BoardSwitchCard,
  CurrentGameLeaderboardSummary,
  GameSummaryButton,
} from './ui/GameHistoryOverview.tsx'
import { CardPreviewDialog } from './ui/game-history-surfaces.tsx'

type GameHistoryRound = components['schemas']['GameHistoryRoundItemDto']
type GameHistoryBoard = 'realtime' | 'history'

interface GameHistoryPageProps {
  initialBoard?: GameHistoryBoard
  lockedBoard?: GameHistoryBoard
}

export function CurrentGameLeaderboardPage() {
  return <GameHistoryPage initialBoard="realtime" lockedBoard="realtime" />
}

export function GameHistoryPage({
  initialBoard = 'history',
  lockedBoard = 'history',
}: GameHistoryPageProps = {}) {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedGameId = searchParams.get('gameId')
  const [search, setSearch] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const isWide = useMediaQuery('(min-width: 1000px)')
  const [previewRound, setPreviewRound] = useState<GameHistoryRound | null>(null)
  const [activeBoardState, setActiveBoardState] = useState<GameHistoryBoard>(initialBoard)
  const activeBoard = lockedBoard ?? activeBoardState
  const isBoardSwitcherVisible = lockedBoard == null

  const currentGameQuery = useQuery(currentGameBoardQueryOptions)
  const gamesQuery = useQuery(gameHistoryGamesQueryOptions)
  const currentGameId = currentGameQuery.data?.gameId ?? null
  const completedGames = (gamesQuery.data ?? []).filter(
    (game) => normalizeStatus(game.gameStatus) === 'finished',
  )
  const selectedCompletedGameId =
    requestedGameId && completedGames.some((game) => game.gameId === requestedGameId)
      ? requestedGameId
      : (completedGames[0]?.gameId ?? null)
  const visibleGames = completedGames.filter((game) =>
    game.gameTitle.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  )
  const selectedGame = completedGames.find((game) => game.gameId === selectedCompletedGameId)

  const currentGameDetailsQuery = useQuery({
    ...gameHistoryGameDetailsQueryOptions(currentGameId ?? ''),
    enabled: currentGameId !== null,
  })
  const selectedGameDetailsQuery = useQuery({
    ...gameHistoryGameDetailsQueryOptions(selectedCompletedGameId ?? ''),
    enabled: selectedCompletedGameId !== null,
  })

  const currentGameLeaderboard = sortTeamLeaderboardEntries(
    currentGameDetailsQuery.data?.mainGame.teamStats ?? [],
  )
  const currentGameDetails = currentGameDetailsQuery.data ?? null
  const currentGamePlayedRounds = (currentGameDetails?.mainGame.rounds ?? []).filter(isCountedRound)
  const currentGameSummary =
    activeBoard === 'realtime' && currentGameQuery.data
      ? {
          title: currentGameDetails?.gameTitle ?? currentGameQuery.data.title,
          status: currentGameDetails?.gameStatus ?? currentGameQuery.data.status,
          playedTeamCount: currentGameDetails ? currentGameLeaderboard.length : null,
          playedRoundCount: currentGameDetails ? currentGamePlayedRounds.length : null,
          activatedModifierCount: currentGameDetails?.mainGame.modifierActivations.length ?? null,
          quizPoints: currentGameDetails?.quiz.totalPoints ?? null,
          totalKills:
            currentGameDetails === null
              ? null
              : currentGamePlayedRounds.reduce(
                  (total, round) => total + round.scoreDetails.totalKillCount,
                  0,
                ),
          totalTokens:
            currentGameDetails === null
              ? null
              : currentGamePlayedRounds.reduce((total, round) => total + round.bountyCount, 0),
          penaltyTotal:
            currentGameDetails === null
              ? null
              : currentGamePlayedRounds.reduce(
                  (total, round) => total + round.scoreDetails.penaltyTotal,
                  0,
                ),
          teamFinalScoreTotal: currentGameDetails
            ? currentGameLeaderboard.reduce((total, entry) => total + getTeamFinalScore(entry), 0)
            : null,
        }
      : null

  return (
    <PageShell
      sx={{
        maxWidth: 1800,
        width: '100%',
        mx: 'auto',
        p: { xs: 0, md: 0 },
      }}
    >
      {activeBoard === 'history' ? (
        <Typography component="h1" variant="h6" sx={{ mb: 1, fontWeight: 850 }}>
          {t('gameHistory.archivePageTitle')}
        </Typography>
      ) : (
        <Typography
          component="h1"
          sx={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            p: 0,
            m: -1,
            overflow: 'hidden',
            clipPath: 'inset(50%)',
            whiteSpace: 'nowrap',
          }}
        >
          {t('gameHistory.realtimeTitle')}
        </Typography>
      )}

      {isBoardSwitcherVisible ? (
        <SectionCard sx={{ mt: 1.5 }}>
          <SectionHeader
            title={t('gameHistory.boardSwitcherTitle')}
            description={t('gameHistory.boardSwitcherDescription')}
          />

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} sx={{ mt: 1.5 }}>
            <BoardSwitchCard
              title={t('gameHistory.realtimeTitle')}
              description={t('gameHistory.realtimeDescription')}
              isActive={activeBoard === 'realtime'}
              onClick={() => setActiveBoardState('realtime')}
            />
            <BoardSwitchCard
              title={t('gameHistory.completedGamesTitle')}
              description={t('gameHistory.completedGamesDescription')}
              isActive={activeBoard === 'history'}
              onClick={() => setActiveBoardState('history')}
            />
          </Stack>
        </SectionCard>
      ) : null}

      {activeBoard === 'realtime' ? (
        <>
          {currentGameSummary ? (
            <CurrentGameLeaderboardSummary
              title={currentGameSummary.title}
              status={currentGameSummary.status}
              playedTeamCount={currentGameSummary.playedTeamCount}
              playedRoundCount={currentGameSummary.playedRoundCount}
              activatedModifierCount={currentGameSummary.activatedModifierCount}
              quizPoints={currentGameSummary.quizPoints}
              totalKills={currentGameSummary.totalKills}
              totalTokens={currentGameSummary.totalTokens}
              penaltyTotal={currentGameSummary.penaltyTotal}
              teamFinalScoreTotal={currentGameSummary.teamFinalScoreTotal}
            />
          ) : null}

          <SectionCard
            data-testid="current-leaderboard-surface"
            sx={{ mt: currentGameSummary ? 1 : 0, p: { xs: 0.75, sm: 1 } }}
          >
            <AsyncSection
              isLoading={
                currentGameQuery.isLoading ||
                (currentGameId !== null && currentGameDetailsQuery.isLoading)
              }
              isError={currentGameQuery.isError || currentGameDetailsQuery.isError}
              isEmpty={currentGameId === null}
              loadingMessage={t('gameHistory.loadingCurrentGame')}
              errorMessage={t('gameHistory.errorCurrentGame')}
              emptyMessage={t('gameHistory.currentGameMissing')}
            >
              <CurrentGameLeaderboard
                gameDetails={currentGameDetailsQuery.data ?? null}
                leaderboard={currentGameLeaderboard}
                onPreviewCard={setPreviewRound}
              />
            </AsyncSection>
          </SectionCard>
        </>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: 1,
            mt: 0,
            alignItems: 'start',
            gridTemplateColumns: 'minmax(0, 1fr)',
            '@media (min-width: 1000px)': { gridTemplateColumns: '300px minmax(0, 1fr)' },
          }}
        >
          <SectionCard
            sx={{
              minWidth: 0,
              p: 1,
              '@media (min-width: 1000px)': { position: 'sticky', top: 80 },
            }}
          >
            <Box component="details" open={isWide || pickerOpen || !selectedGame}>
              <Box
                component="summary"
                onClick={(event) => {
                  event.preventDefault()
                  setPickerOpen(!pickerOpen)
                }}
                sx={{
                  display: isWide ? 'none' : 'list-item',
                  cursor: 'pointer',
                  p: 0.5,
                  overflowWrap: 'anywhere',
                  '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
                }}
              >
                {t('gameHistory.completedGamesListTitle')}
                {selectedGame ? ` · ${selectedGame.gameTitle}` : ''}
              </Box>
              <Typography
                component="h2"
                variant="subtitle2"
                sx={{ fontWeight: 850, mb: 1, display: isWide ? 'block' : 'none' }}
              >
                {t('gameHistory.completedGamesListTitle')}
              </Typography>
              <FormTextField
                label={t('gameHistory.searchGames')}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                sx={{ my: 0.5 }}
              />

              <AsyncSection
                isLoading={gamesQuery.isLoading}
                isError={gamesQuery.isError}
                isEmpty={visibleGames.length === 0}
                loadingMessage={t('gameHistory.loadingGames')}
                errorMessage={t('gameHistory.errorGames')}
                emptyMessage={t(
                  search.trim() ? 'gameHistory.searchEmpty' : 'gameHistory.completedGamesEmpty',
                )}
              >
                <Stack
                  spacing={0.6}
                  sx={{
                    mt: 1,
                    maxHeight: 'max(280px, calc(100dvh - 260px))',
                    overflowY: 'auto',
                    overscrollBehaviorY: 'contain',
                  }}
                >
                  {visibleGames.map((game) => (
                    <GameSummaryButton
                      key={game.gameId}
                      game={game}
                      isSelected={game.gameId === selectedCompletedGameId}
                      onClick={() => {
                        setSearchParams({ gameId: game.gameId }, { replace: true })
                        setPickerOpen(false)
                      }}
                    />
                  ))}
                </Stack>
              </AsyncSection>
            </Box>
          </SectionCard>

          <Box key={selectedCompletedGameId} sx={{ minWidth: 0 }}>
            <AsyncSection
              isLoading={selectedCompletedGameId !== null && selectedGameDetailsQuery.isLoading}
              isError={selectedGameDetailsQuery.isError}
              isEmpty={selectedCompletedGameId === null}
              loadingMessage={t('gameHistory.loadingGameDetails')}
              errorMessage={t('gameHistory.errorGameDetails')}
              emptyMessage={t('gameHistory.completedGameSelectPrompt')}
            >
              <GameDetailsPanel
                game={selectedGameDetailsQuery.data ?? null}
                onPreviewCard={setPreviewRound}
              />
            </AsyncSection>
          </Box>
        </Box>
      )}

      <CardPreviewDialog round={previewRound} onClose={() => setPreviewRound(null)} />
    </PageShell>
  )
}
