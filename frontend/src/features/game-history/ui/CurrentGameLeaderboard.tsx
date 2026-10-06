import { useMediaQuery } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { currentGameQuizQueryOptions } from '../../game-quiz/index.ts'
import { useTranslation } from 'react-i18next'
import type { ContentTabsSelection } from '../../../shared/ui/index.ts'
import type { components } from '../../../shared/api/contracts/generated'
import { ContentTabs } from '../../../shared/ui/index.ts'
import type { GameHistoryBoardLabels } from '../model/game-history-formatters.ts'
import { type GameHistoryTeamLeaderboardEntry } from '../model/game-history-team-leaderboard.ts'
import { CurrentGameStatistics } from './CurrentGameStatistics.tsx'
import { CancelledRoundsSection } from './CancelledRoundsSection.tsx'
import { GameTeamResults } from './GameTeamResults.tsx'
import { buildLeaderboardResults } from '../model/leaderboard-results.ts'
import { CurrentGameModifierResults } from './CurrentGameModifierResults.tsx'
import { QuizLeaderboard } from './QuizLeaderboard.tsx'

type GameHistoryGameDetails = components['schemas']['GameHistoryGameDetailsDto']
type GameHistoryRound = components['schemas']['GameHistoryRoundItemDto']

export function CurrentGameLeaderboard({
  tabs,
  selectedTeamId,
  onSelectTeam,
  gameDetails,
  boardLabels,
  leaderboard,
  onPreviewCard,
}: {
  tabs: ContentTabsSelection
  selectedTeamId: string | null
  onSelectTeam: (teamId: string) => void
  boardLabels?: GameHistoryBoardLabels | undefined
  gameDetails: GameHistoryGameDetails | null
  leaderboard: GameHistoryTeamLeaderboardEntry[]
  onPreviewCard: (round: GameHistoryRound) => void
}) {
  const { t } = useTranslation()
  const currentQuiz = useQuery({
    ...currentGameQuizQueryOptions(gameDetails?.gameId ?? ''),
    enabled: gameDetails?.gameStatus === 'active',
  })
  const isPhone = useMediaQuery('(max-width: 599px)')

  if (!gameDetails) {
    return null
  }

  const cancelledRounds = gameDetails.mainGame.rounds.filter(
    (round) => round.status === 'cancelled',
  )

  return (
    <ContentTabs
      {...tabs}
      variant={isPhone ? 'scrollable' : 'fullWidth'}
      layout="fill"
      appearance="framed"
      label={t('gameHistory.title')}
      items={[
        {
          id: 'teams',
          label: t('common.entities.teams'),
          content: (
            <GameTeamResults
              selectedTeamId={selectedTeamId}
              onSelectTeam={onSelectTeam}
              results={buildLeaderboardResults(leaderboard)}
              boardLabels={boardLabels}
              onPreviewCard={onPreviewCard}
            />
          ),
        },
        {
          id: 'quiz',
          label: t('gameHistory.quizTab'),
          content: <QuizLeaderboard entries={gameDetails.quiz.playerStats} presentation="panel" />,
        },
        {
          id: 'modifiers',
          label: t('common.entities.modifiers'),
          content: <CurrentGameModifierResults game={gameDetails} />,
        },
        {
          id: 'statistics',
          label: t('gameHistory.statisticsTab'),
          content: (
            <CurrentGameStatistics
              game={gameDetails}
              boardLabels={boardLabels}
              activeQuestionId={currentQuiz.data?.questionSessionId ?? null}
            >
              <CancelledRoundsSection rounds={cancelledRounds} onPreviewCard={onPreviewCard} />
            </CurrentGameStatistics>
          ),
        },
      ]}
    />
  )
}
