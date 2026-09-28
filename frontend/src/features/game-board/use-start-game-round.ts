import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { activeGameRoundQueryOptions } from '../game-rounds/api/game-rounds-queries.ts'
import {
  beginGameRoundGameplay,
  finalizeGameRound,
  prepareGameRound,
  rebuildGameRound,
  reviewGameRound,
  startGameRoundModifierOrdering,
  technicalCancelGameRound,
} from '../game-rounds/api/game-rounds-api.ts'
import { gameHistoryQueryKeys } from '../game-history/api/game-history-queries.ts'
import { currentGameBoardQueryOptions } from './api/game-board-queries.ts'
import type { CompleteRoundInput } from './model/game-round-summary-form.ts'

async function invalidateRoundState(queryClient: ReturnType<typeof useQueryClient>) {
  await queryClient.invalidateQueries({ queryKey: activeGameRoundQueryOptions.queryKey })
  await queryClient.invalidateQueries({ queryKey: currentGameBoardQueryOptions.queryKey })
  await queryClient.invalidateQueries({ queryKey: gameHistoryQueryKeys.all })
}

export interface TechnicalCancelRoundInput {
  roundId: string
  expectedRoundVersion: number
  reasonCode:
    | 'external_game_failure'
    | 'stream_or_infrastructure_failure'
    | 'application_error'
    | 'operator_error'
    | 'other'
  publicSummary: string | null
  internalDetail: string
}

export function useStartGameRound() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const startModifierOrderingMutation = useMutation({
    onMutate: () => setErrorMessage(null),
    mutationFn: (input: { roundId: string; expectedRoundVersion: number }) =>
      startGameRoundModifierOrdering(input.roundId, {
        expectedRoundVersion: input.expectedRoundVersion,
      }),
    onSuccess: async () => {
      await invalidateRoundState(queryClient)
    },
    onError: () => {
      setErrorMessage(t('gameBoard.roundPanelStartModifierOrderingFailed'))
    },
  })

  const startMutation = useMutation({
    onMutate: () => setErrorMessage(null),
    mutationFn: (input: { roundId: string; expectedRoundVersion: number }) =>
      prepareGameRound(input.roundId, { expectedRoundVersion: input.expectedRoundVersion }),
    onSuccess: async () => {
      await invalidateRoundState(queryClient)
    },
    onError: () => {
      setErrorMessage(t('gameBoard.roundPanelStartFailed'))
    },
  })

  const beginGameplayMutation = useMutation({
    onMutate: () => setErrorMessage(null),
    mutationFn: (input: { roundId: string; expectedRoundVersion: number }) =>
      beginGameRoundGameplay(input.roundId, {
        expectedRoundVersion: input.expectedRoundVersion,
      }),
    onSuccess: async () => {
      await invalidateRoundState(queryClient)
    },
    onError: () => {
      setErrorMessage(t('gameBoard.roundPanelBeginGameplayFailed'))
    },
  })

  const reviewMutation = useMutation({
    onMutate: () => setErrorMessage(null),
    mutationFn: (input: { roundId: string; expectedRoundVersion: number }) =>
      reviewGameRound(input.roundId, { expectedRoundVersion: input.expectedRoundVersion }),
    onSuccess: async () => {
      await invalidateRoundState(queryClient)
    },
    onError: () => {
      setErrorMessage(t('gameBoard.roundPanelReviewFailed'))
    },
  })

  const rebuildMutation = useMutation({
    onMutate: () => setErrorMessage(null),
    mutationFn: (input: { roundId: string; expectedRoundVersion: number }) =>
      rebuildGameRound(input.roundId, { expectedRoundVersion: input.expectedRoundVersion }),
    onSuccess: async () => {
      await invalidateRoundState(queryClient)
    },
    onError: () => {
      setErrorMessage(t('gameBoard.roundPanelRebuildFailed'))
    },
  })

  const technicalCancelMutation = useMutation({
    onMutate: () => setErrorMessage(null),
    mutationFn: (input: TechnicalCancelRoundInput) =>
      technicalCancelGameRound(input.roundId, {
        expectedRoundVersion: input.expectedRoundVersion,
        reasonCode: input.reasonCode,
        publicSummary: input.publicSummary,
        internalDetail: input.internalDetail,
      }),
    onSuccess: async () => {
      await invalidateRoundState(queryClient)
    },
    onError: () => {
      setErrorMessage(t('gameBoard.roundPanelTechnicalCancelFailed'))
    },
  })

  const completeMutation = useMutation({
    onMutate: () => setErrorMessage(null),
    mutationFn: (input: CompleteRoundInput) =>
      finalizeGameRound(input.roundId, {
        status: 'completed',
        killsCount: input.killsCount,
        bountyCount: input.bountyCount,
        notes: input.notes,
        modifierResults: input.modifierResults,
        ruleGroups: input.ruleGroups,
        expectedRoundVersion: input.expectedRoundVersion,
      }),
    onSuccess: async () => {
      await invalidateRoundState(queryClient)
    },
    onError: () => {
      setErrorMessage(t('gameBoard.roundPanelCompleteFailed'))
    },
  })

  const isMutating =
    startModifierOrderingMutation.isPending ||
    startMutation.isPending ||
    beginGameplayMutation.isPending ||
    reviewMutation.isPending ||
    rebuildMutation.isPending ||
    technicalCancelMutation.isPending ||
    completeMutation.isPending

  return {
    isChangingRoundStage: isMutating,
    startModifierOrdering: startModifierOrderingMutation.mutate,
    startRound: startMutation.mutate,
    beginGameplay: beginGameplayMutation.mutate,
    reviewRound: reviewMutation.mutate,
    rebuildRound: rebuildMutation.mutate,
    technicalCancelRound: technicalCancelMutation.mutate,
    completeRound: completeMutation.mutateAsync,
    errorMessage,
  }
}
