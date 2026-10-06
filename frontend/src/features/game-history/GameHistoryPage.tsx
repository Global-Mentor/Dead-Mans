import { Box, Stack, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { urlTabSelection } from '../../shared/routing/url-tab-selection.ts'
import { useUrlSearchParams } from '../../shared/routing/use-url-search-params.ts'
import type { components } from '../../shared/api/contracts/generated'
import {
  HistoryWorkspace,
  PlayedCardPreviewDialog,
  RoundBriefingPanel,
} from '../../shared/game-ui/index.ts'
import {
  AppButton,
  AsyncSection,
  FormTextField,
  PageShell,
  SectionCard,
  SectionHeader,
  SelectionTile,
} from '../../shared/ui/index.ts'
import { currentGameBoardQueryOptions } from '../game-board/index.ts'
import {
  gameHistoryGameDetailsQueryOptions,
  gameHistoryGamesQueryOptions,
} from './api/game-history-queries.ts'
import { sortTeamLeaderboardEntries } from './model/game-history-team-leaderboard.ts'
import { normalizeStatus } from './model/game-history-view.ts'
import { CurrentGameLeaderboard } from './ui/CurrentGameLeaderboard.tsx'
import { HistoryBoardView } from './ui/HistoryBoardView.tsx'
import { GameDetailsPanel } from './ui/GameHistoryDetailsPanel.tsx'
import { GameSummaryButton } from './ui/GameHistoryOverview.tsx'

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
  const [searchParams, setSearchParams] = useUrlSearchParams()
  const selectTeam = (teamId: string) =>
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.set('teamId', teamId)
      return next
    })
  const requestedGameId = searchParams.get('gameId')
  const search = searchParams.get('q') ?? ''
  const [pickerOpen, setPickerOpen] = useState(false)
  const [previewRound, setPreviewRound] = useState<GameHistoryRound | null>(null)
  const [activeBoardState, setActiveBoardState] = useState<GameHistoryBoard>(initialBoard)
  const activeBoard = lockedBoard ?? activeBoardState
  const showHistoryBoard = activeBoard === 'history' && searchParams.get('view') === 'board'
  const isBoardSwitcherVisible = lockedBoard == null

  const currentGameQuery = useQuery(currentGameBoardQueryOptions)
  const gamesQuery = useQuery({
    ...gameHistoryGamesQueryOptions,
    enabled: activeBoard === 'history',
  })
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

  useEffect(() => {
    if (activeBoard === 'history' && !requestedGameId && selectedCompletedGameId) {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          next.set('gameId', selectedCompletedGameId)
          return next
        },
        { replace: true },
      )
    }
  }, [activeBoard, requestedGameId, selectedCompletedGameId, setSearchParams])

  const currentGameDetailsQuery = useQuery({
    ...gameHistoryGameDetailsQueryOptions(currentGameId ?? ''),
    enabled: activeBoard === 'realtime' && currentGameId !== null,
    // Recover even when a best-effort realtime notification was lost.
    refetchInterval: (query) =>
      (query.state.data?.gameStatus ?? currentGameQuery.data?.status) === 'active' ? 30_000 : false,
  })
  const selectedGameDetailsQuery = useQuery({
    ...gameHistoryGameDetailsQueryOptions(selectedCompletedGameId ?? ''),
    enabled: activeBoard === 'history' && selectedCompletedGameId !== null,
  })

  const currentGameLeaderboard = sortTeamLeaderboardEntries(
    currentGameDetailsQuery.data?.mainGame.teamStats ?? [],
  )
  const currentGameDetails = currentGameDetailsQuery.data ?? null
  const currentGameTitle =
    activeBoard === 'realtime' && currentGameQuery.data
      ? (currentGameDetails?.gameTitle ?? currentGameQuery.data.title)
      : null

  return (
    <PageShell
      sx={{
        maxWidth: 1800,
        width: '100%',
        mx: 'auto',
        p: { xs: 0, md: 0 },
        px: { xs: 0, md: 0 },
        pb: { xs: 0, md: 0 },
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {isBoardSwitcherVisible ? (
        <SectionCard sx={{ mt: 1.5 }}>
          <SectionHeader
            title={t('gameHistory.boardSwitcherTitle')}
            description={t('gameHistory.boardSwitcherDescription')}
          />

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} sx={{ mt: 1.5 }}>
            <SelectionTile
              title={t('gameHistory.realtimeTitle')}
              description={t('gameHistory.realtimeDescription')}
              selected={activeBoard === 'realtime'}
              onClick={() => setActiveBoardState('realtime')}
            />
            <SelectionTile
              title={t('gameHistory.completedGamesTitle')}
              description={t('gameHistory.completedGamesDescription')}
              selected={activeBoard === 'history'}
              onClick={() => setActiveBoardState('history')}
            />
          </Stack>
        </SectionCard>
      ) : null}

      {activeBoard === 'realtime' ? (
        <>
          {currentGameTitle !== null ? (
            <RoundBriefingPanel data-testid="current-game-summary" sx={{ flexShrink: 0, mb: 1 }}>
              <Typography
                component="h1"
                variant="h6"
                textAlign="center"
                sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}
              >
                {currentGameTitle}
              </Typography>
            </RoundBriefingPanel>
          ) : null}

          <Box
            data-testid="current-leaderboard-surface"
            sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
          >
            <AsyncSection
              isLoading={
                currentGameQuery.isLoading ||
                (currentGameId !== null && currentGameDetailsQuery.isLoading)
              }
              isError={currentGameQuery.isError || currentGameDetailsQuery.isError}
              hasData={currentGameDetailsQuery.data != null}
              retryAction={
                <AppButton
                  tone="ghost"
                  onClick={() => {
                    void currentGameQuery.refetch()
                    void currentGameDetailsQuery.refetch()
                  }}
                >
                  {t('common.actions.retry')}
                </AppButton>
              }
              isEmpty={currentGameId === null}
              loadingMessage={t('gameHistory.loadingCurrentGame')}
              errorMessage={t('gameHistory.errorCurrentGame')}
              emptyMessage={t('gameHistory.currentGameMissing')}
            >
              <CurrentGameLeaderboard
                key={currentGameId}
                tabs={urlTabSelection(searchParams, setSearchParams, 'teams')}
                selectedTeamId={searchParams.get('teamId')}
                onSelectTeam={selectTeam}
                gameDetails={currentGameDetailsQuery.data ?? null}
                boardLabels={
                  currentGameQuery.data?.gameId === currentGameDetailsQuery.data?.gameId
                    ? (currentGameQuery.data ?? undefined)
                    : undefined
                }
                leaderboard={currentGameLeaderboard}
                onPreviewCard={setPreviewRound}
              />
            </AsyncSection>
          </Box>
        </>
      ) : (
        <>
          <Box
            sx={{
              display: showHistoryBoard ? 'none' : 'flex',
              flex: 1,
              minHeight: 0,
              flexDirection: 'column',
            }}
          >
            <HistoryWorkspace
              title={t('gameHistory.completedGamesListTitle')}
              selectedLabel={selectedGame?.gameTitle}
              hasSelection={selectedCompletedGameId !== null}
              pickerOpen={pickerOpen}
              onPickerOpenChange={setPickerOpen}
              tools={
                <FormTextField
                  label={t('gameHistory.searchGames')}
                  value={search}
                  onChange={(event) => {
                    const value = event.target.value
                    setSearchParams(
                      (current) => {
                        const next = new URLSearchParams(current)
                        if (value) next.set('q', value)
                        else next.delete('q')
                        return next
                      },
                      { replace: true },
                    )
                  }}
                  fullWidth
                />
              }
              records={
                <AsyncSection
                  isLoading={gamesQuery.isLoading}
                  isError={gamesQuery.isError}
                  hasData={gamesQuery.data != null}
                  isEmpty={visibleGames.length === 0}
                  loadingMessage={t('gameHistory.loadingGames')}
                  errorMessage={t('gameHistory.errorGames')}
                  emptyMessage={t(
                    search.trim() ? 'gameHistory.searchEmpty' : 'gameHistory.completedGamesEmpty',
                  )}
                  retryAction={
                    <AppButton tone="ghost" onClick={() => void gamesQuery.refetch()}>
                      {t('common.actions.retry')}
                    </AppButton>
                  }
                >
                  <Stack gap={0.6}>
                    {visibleGames.map((game, index) => (
                      <GameSummaryButton
                        key={game.gameId}
                        game={game}
                        tone={index % 2 === 0 ? 'default' : 'alternate'}
                        isSelected={game.gameId === selectedCompletedGameId}
                        onClick={() => {
                          setSearchParams((current) => {
                            const next = new URLSearchParams(current)
                            next.set('gameId', game.gameId)
                            next.delete('teamId')
                            next.delete('view')
                            return next
                          })
                          setPickerOpen(false)
                        }}
                      />
                    ))}
                  </Stack>
                </AsyncSection>
              }
            >
              <Box
                key={selectedCompletedGameId}
                sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
              >
                <AsyncSection
                  isLoading={selectedCompletedGameId !== null && selectedGameDetailsQuery.isLoading}
                  isError={selectedGameDetailsQuery.isError}
                  hasData={selectedGameDetailsQuery.data != null}
                  isEmpty={selectedCompletedGameId === null}
                  loadingMessage={t('gameHistory.loadingGameDetails')}
                  errorMessage={t('gameHistory.errorGameDetails')}
                  emptyMessage={t('gameHistory.completedGameSelectPrompt')}
                  retryAction={
                    <AppButton tone="ghost" onClick={() => void selectedGameDetailsQuery.refetch()}>
                      {t('common.actions.retry')}
                    </AppButton>
                  }
                >
                  <GameDetailsPanel
                    tabs={urlTabSelection(searchParams, setSearchParams, 'teams')}
                    selectedTeamId={searchParams.get('teamId')}
                    onSelectTeam={selectTeam}
                    game={selectedGameDetailsQuery.data ?? null}
                    onPreviewCard={setPreviewRound}
                    onViewBoard={() => {
                      if (selectedCompletedGameId)
                        setSearchParams((current) => {
                          const next = new URLSearchParams(current)
                          next.set('gameId', selectedCompletedGameId)
                          next.set('view', 'board')
                          return next
                        })
                    }}
                  />
                </AsyncSection>
              </Box>
            </HistoryWorkspace>
          </Box>
          {showHistoryBoard ? (
            <AsyncSection
              isLoading={selectedGameDetailsQuery.isLoading || gamesQuery.isLoading}
              isError={selectedGameDetailsQuery.isError || gamesQuery.isError}
              hasData={selectedGameDetailsQuery.data != null}
              isEmpty={selectedCompletedGameId === null}
              emptyMessage={t('gameHistory.completedGamesEmpty')}
              loadingMessage={t('gameHistory.loadingGameDetails')}
              errorMessage={t('gameHistory.errorGameDetails')}
              retryAction={
                <AppButton
                  tone="secondary"
                  onClick={() => {
                    void selectedGameDetailsQuery.refetch()
                    void gamesQuery.refetch()
                  }}
                >
                  {t('common.actions.retry')}
                </AppButton>
              }
            >
              {selectedGameDetailsQuery.data ? (
                <HistoryBoardView
                  game={selectedGameDetailsQuery.data}
                  onBack={() => {
                    if (selectedCompletedGameId)
                      setSearchParams((current) => {
                        const next = new URLSearchParams(current)
                        next.delete('view')
                        return next
                      })
                  }}
                />
              ) : null}
            </AsyncSection>
          ) : null}
        </>
      )}

      <PlayedCardPreviewDialog
        card={null}
        round={previewRound}
        onClose={() => setPreviewRound(null)}
      />
    </PageShell>
  )
}
