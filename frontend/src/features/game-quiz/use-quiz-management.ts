import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { hasPanelCapability } from '../../shared/auth/panel-capabilities.ts'
import { useAuth } from '../../shared/auth/use-auth.ts'
import { currentGameBoardQueryOptions } from '../game-board/index.ts'
import { activeGameRoundQueryOptions } from '../game-rounds/index.ts'
import { gameHistoryQueryKeys, gameHistoryGameDetailsQueryOptions } from '../game-history/index.ts'
import {
  askNextGameQuizQuestion,
  askSpecificGameQuizQuestion,
  hideGameQuizScreenshot,
} from './api/game-quiz-api.ts'
import {
  availableGameQuizQuestionsQueryOptions,
  currentGameQuizQueryOptions,
  gameQuizQueryKeys,
  twitchBotStatusQueryOptions,
} from './api/game-quiz-queries.ts'

export function useQuizManagement() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const canManage = hasPanelCapability('manageGame', user?.roles)
  const snapshot = useQuery(currentGameBoardQueryOptions)
  const gameId = snapshot.data?.gameId ?? ''
  const round = useQuery(activeGameRoundQueryOptions)
  const history = useQuery({
    ...gameHistoryGameDetailsQueryOptions(gameId),
    enabled: canManage && gameId !== '',
  })
  const current = useQuery({
    ...currentGameQuizQueryOptions(gameId),
    enabled: canManage && gameId !== '',
  })
  const questions = useQuery({
    ...availableGameQuizQuestionsQueryOptions(gameId),
    enabled: canManage && gameId !== '',
  })
  const twitch = useQuery({ ...twitchBotStatusQueryOptions, enabled: canManage })
  const [actionError, setActionError] = useState<{ gameId: string; error: Error } | null>(null)
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: gameQuizQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: gameHistoryQueryKeys.all }),
    ])
  }
  const mutationOptions = {
    onMutate: () => setActionError(null),
    onError: (error: Error) => setActionError({ gameId, error }),
    onSuccess: refresh,
  }
  const askNext = useMutation({
    ...mutationOptions,
    mutationFn: (format: 'text' | 'screenshot') => askNextGameQuizQuestion(format),
  })
  const askSpecific = useMutation({
    ...mutationOptions,
    mutationFn: (questionId: string) => askSpecificGameQuizQuestion(questionId),
  })
  const hide = useMutation({ ...mutationOptions, mutationFn: hideGameQuizScreenshot })
  const modifierOrderingActive =
    round.data?.gameId === gameId && round.data.status === 'awaiting_modifiers'
  const hasLoadError =
    snapshot.isError || current.isError || history.isError || round.isError || twitch.isError
  const retry = () =>
    void Promise.all([
      snapshot.refetch(),
      current.refetch(),
      history.refetch(),
      round.refetch(),
      twitch.refetch(),
    ])
  const unavailable =
    !canManage ||
    snapshot.data?.status !== 'active' ||
    snapshot.isError ||
    current.isPending ||
    current.isError ||
    history.isPending ||
    history.isError ||
    round.isPending ||
    round.isFetching ||
    round.isError ||
    (round.data != null && round.data.gameId !== gameId) ||
    twitch.isPending ||
    twitch.isError ||
    ['publishing', 'failed', 'uncertain', 'cancel_pending'].includes(
      twitch.data?.publication?.status ?? '',
    ) ||
    hide.isPending ||
    askNext.isPending ||
    askSpecific.isPending
  return {
    gameId,
    state: current.data ?? null,
    canManage,
    hasLoadError,
    retry,
    noGame: snapshot.data?.status !== 'active',
    questions: questions.data ?? [],
    questionsLoading: questions.isPending,
    questionsError: questions.isError,
    retryQuestions: () => void questions.refetch(),
    isStarting: unavailable,
    isLaunching: askNext.isPending,
    modifierOrderingActive,
    error: actionError?.gameId === gameId ? actionError.error : null,
    onAskNext: (format: 'text' | 'screenshot') => askNext.mutate(format),
    onHide: () => {
      if (current.data) hide.mutate(current.data.questionSessionId)
    },
    hiding: hide.isPending,
    hideDisabled:
      !canManage ||
      snapshot.data?.status !== 'active' ||
      current.isError ||
      current.data?.status === 'open' ||
      hide.isPending ||
      askNext.isPending ||
      askSpecific.isPending,
    onAskSpecific: (questionId: string) => askSpecific.mutateAsync(questionId),
  }
}
