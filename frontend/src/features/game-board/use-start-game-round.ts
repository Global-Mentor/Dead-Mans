import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { components } from '../../shared/api/contracts/generated'
import {
  activeGameRoundQueryOptions,
  beginGameRoundGameplay,
  completeGameRoundPreparation,
  finalizeGameRound,
  finishGameRoundPresentation,
  prepareGameRound,
  rebuildGameRound,
  reviewGameRound,
  startGameRoundModifierOrdering,
  technicalCancelGameRound,
} from '../game-rounds/index.ts'
import { gameHistoryQueryKeys } from '../game-history/index.ts'
import { gameRegistrationQueryKeys } from '../game-registration/index.ts'
import {
  currentGameBoardQueryOptions,
  currentGameTeamQueueQueryOptions,
} from './api/game-board-queries.ts'
import type { CompleteRoundInput } from './model/game-round-summary-form.ts'

async function applyRoundState(
  queryClient: ReturnType<typeof useQueryClient>,
  round: components['schemas']['GameRoundDetailsDto'],
) {
  await queryClient.cancelQueries({ queryKey: activeGameRoundQueryOptions.queryKey })
  queryClient.setQueryData(activeGameRoundQueryOptions.queryKey, (current) => {
    if (current && (current.roundId !== round.roundId || current.roundVersion > round.roundVersion))
      return current
    return round.status === 'completed' || round.status === 'cancelled' ? null : round
  })
  await Promise.all(
    [
      activeGameRoundQueryOptions.queryKey,
      currentGameBoardQueryOptions.queryKey,
      currentGameTeamQueueQueryOptions.queryKey,
      gameRegistrationQueryKeys.all,
      gameHistoryQueryKeys.all,
    ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  )
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
    onSuccess: async (round) => {
      await applyRoundState(queryClient, round)
    },
    onError: () => {
      setErrorMessage(t('gameBoard.roundPanelStartModifierOrderingFailed'))
    },
  })

  const startMutation = useMutation({
    onMutate: () => setErrorMessage(null),
    mutationFn: (input: { roundId: string; expectedRoundVersion: number }) =>
      prepareGameRound(input.roundId, { expectedRoundVersion: input.expectedRoundVersion }),
    onSuccess: async (round) => {
      await applyRoundState(queryClient, round)
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
    onSuccess: async (round) => {
      await applyRoundState(queryClient, round)
    },
    onError: () => {
      setErrorMessage(t('gameBoard.roundPanelBeginGameplayFailed'))
    },
  })

  const completePreparationMutation = useMutation({
    onMutate: () => setErrorMessage(null),
    mutationFn: (input: { roundId: string; expectedRoundVersion: number }) =>
      completeGameRoundPreparation(input.roundId, {
        expectedRoundVersion: input.expectedRoundVersion,
      }),
    onSuccess: async (round) => {
      await applyRoundState(queryClient, round)
    },
    onError: () => {
      setErrorMessage(t('gameBoard.roundPanelCompletePreparationFailed'))
    },
  })

  const finishPresentationMutation = useMutation({
    onMutate: () => setErrorMessage(null),
    mutationFn: (input: { roundId: string; expectedRoundVersion: number }) =>
      finishGameRoundPresentation(input.roundId, {
        expectedRoundVersion: input.expectedRoundVersion,
      }),
    onSuccess: async (round) => {
      await applyRoundState(queryClient, round)
    },
    onError: () => {
      setErrorMessage(t('gameBoard.roundPanelFinishPresentationFailed'))
    },
  })

  const reviewMutation = useMutation({
    onMutate: () => setErrorMessage(null),
    mutationFn: (input: { roundId: string; expectedRoundVersion: number }) =>
      reviewGameRound(input.roundId, { expectedRoundVersion: input.expectedRoundVersion }),
    onSuccess: async (round) => {
      await applyRoundState(queryClient, round)
    },
    onError: () => {
      setErrorMessage(t('gameBoard.roundPanelReviewFailed'))
    },
  })

  const rebuildMutation = useMutation({
    onMutate: () => setErrorMessage(null),
    mutationFn: (input: { roundId: string; expectedRoundVersion: number }) =>
      rebuildGameRound(input.roundId, { expectedRoundVersion: input.expectedRoundVersion }),
    onSuccess: async (round) => {
      await applyRoundState(queryClient, round)
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
    onSuccess: async (round) => {
      await applyRoundState(queryClient, round)
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
        markTeamPlayedAfterPresentation: input.markTeamPlayedAfterPresentation ?? false,
        killsCount: input.killsCount,
        bountyCount: input.bountyCount,
        notes: input.notes,
        modifierResults: input.modifierResults,
        ruleGroups: input.ruleGroups,
        expectedRoundVersion: input.expectedRoundVersion,
      }),
    onSuccess: async (round) => {
      await applyRoundState(queryClient, round)
    },
    onError: () => {
      setErrorMessage(t('gameBoard.roundPanelCompleteFailed'))
    },
  })

  const isMutating =
    startModifierOrderingMutation.isPending ||
    startMutation.isPending ||
    beginGameplayMutation.isPending ||
    completePreparationMutation.isPending ||
    reviewMutation.isPending ||
    finishPresentationMutation.isPending ||
    rebuildMutation.isPending ||
    technicalCancelMutation.isPending ||
    completeMutation.isPending

  return {
    isChangingRoundStage: isMutating,
    startModifierOrdering: startModifierOrderingMutation.mutate,
    startRound: startMutation.mutate,
    beginGameplay: beginGameplayMutation.mutate,
    completePreparation: completePreparationMutation.mutate,
    reviewRound: reviewMutation.mutate,
    finishPresentation: finishPresentationMutation.mutate,
    rebuildRound: rebuildMutation.mutate,
    technicalCancelRound: technicalCancelMutation.mutate,
    completeRound: completeMutation.mutateAsync,
    errorMessage,
  }
}
