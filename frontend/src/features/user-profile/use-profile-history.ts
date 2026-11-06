import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  profileAnswersQueryOptions,
  profileGamesQueryOptions,
  type ProfileAnswersPage,
  type ProfileGamesPage,
  type ProfileParticipation,
  type ProfileGame,
} from './api/user-profile-queries.ts'

function useGameList(userId: string, participation: ProfileParticipation, enabled: boolean) {
  const [page, setPage] = useState(1)
  const query = useQuery({ ...profileGamesQueryOptions(userId, participation, page), enabled })
  const [lastData, setLastData] = useState<ProfileGamesPage | null>(null)
  if (query.isSuccess && !query.isPlaceholderData && query.data !== lastData)
    setLastData(query.data)
  return {
    query,
    data: query.data ?? lastData,
    changePage: (next: number) => {
      if (next === page && query.isError) void query.refetch()
      else setPage(next)
    },
  }
}

export function useProfileHistory(userId: string) {
  const [tab, setTab] = useState('statistics')
  const [selectedGame, setSelectedGame] = useState<ProfileGame | null>(null)
  const [answerViewKey, setAnswerViewKey] = useState(0)
  const [returnFocusGameId, setReturnFocusGameId] = useState<string | null>(null)
  const gameId = selectedGame?.gameId ?? null
  const player = useGameList(userId, 'player', tab === 'player')
  const quiz = useGameList(userId, 'quiz', tab === 'quiz' && !selectedGame)
  const [answersPage, setAnswersPage] = useState(1)
  const answers = useQuery({
    ...profileAnswersQueryOptions(userId, gameId, answersPage),
    enabled: tab === 'quiz' && gameId !== null,
  })
  const [lastAnswers, setLastAnswers] = useState<{
    gameId: string | null
    data: ProfileAnswersPage
  } | null>(null)
  if (
    answers.isSuccess &&
    !answers.isPlaceholderData &&
    (answers.data !== lastAnswers?.data || lastAnswers?.gameId !== gameId)
  )
    setLastAnswers({ gameId, data: answers.data })
  return {
    tab,
    setTab,
    player,
    quiz: {
      ...quiz,
      changePage: (page: number) => {
        setSelectedGame(null)
        setAnswersPage(1)
        quiz.changePage(page)
      },
    },
    gameId,
    selectedGame,
    answerViewKey,
    returnFocusGameId,
    answers,
    answersData: answers.data ?? (lastAnswers?.gameId === gameId ? lastAnswers.data : null),
    changeAnswersPage: (page: number) => {
      if (page === answersPage && answers.isError) void answers.refetch()
      else setAnswersPage(page)
    },
    openAnswers: (game: ProfileGame) => {
      setAnswerViewKey((key) => key + 1)
      setTab('quiz')
      setReturnFocusGameId(null)
      setSelectedGame(game)
      setAnswersPage(1)
    },
    closeAnswers: () => {
      setReturnFocusGameId(gameId)
      setSelectedGame(null)
    },
  }
}
