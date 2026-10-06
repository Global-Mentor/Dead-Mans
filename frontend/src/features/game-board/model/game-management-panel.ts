import type { TFunction } from 'i18next'
import type { components } from '../../../shared/api/contracts/generated'
import type { GameBoardSnapshot, GameTeamQueueItem } from '../../../shared/api/contracts/index.ts'
import type { AppButtonTone } from '../../../shared/ui/primitives/buttons/app-button-tone.ts'
import { formatTeamNameWithFallback } from '../../game-registration/model/team-name.ts'

export type GameRoundDetails = components['schemas']['GameRoundDetailsDto']

export interface RoundActionModel {
  statusTone: 'info' | 'warning' | 'success'
  statusLabel: string
  title: string
  actionLabel: string | null
  actionTone: AppButtonTone
  onAction: (() => void) | null
}

export function formatManagementTeamName(
  t: TFunction,
  teamName: string | null | undefined,
  teamSlotIndex: number,
) {
  return formatTeamNameWithFallback(teamName, t('common.teamWithSlot', { slot: teamSlotIndex }))
}

export function buildRoundActionModel({
  t,
  snapshot,
  activeRound,
  hasCurrentActiveTeam,
  resumableTeam,
  onStartRound,
  onStartModifierOrdering,
  onBeginGameplay,
  onReviewRound,
  onOpenSummary,
  onResumeTeam,
}: {
  t: TFunction
  snapshot: GameBoardSnapshot
  activeRound: GameRoundDetails | null
  hasCurrentActiveTeam: boolean
  resumableTeam: GameTeamQueueItem | null
  onStartRound: (input: { roundId: string; expectedRoundVersion: number }) => void
  onStartModifierOrdering: (input: { roundId: string; expectedRoundVersion: number }) => void
  onBeginGameplay: (input: { roundId: string; expectedRoundVersion: number }) => void
  onReviewRound: (input: { roundId: string; expectedRoundVersion: number }) => void
  onOpenSummary: () => void
  onResumeTeam: (teamId: string) => void
}): RoundActionModel {
  if (snapshot.status !== 'active') {
    return {
      statusTone: 'info',
      statusLabel: t('gameBoard.managementLaunchTitle'),
      title: t('gameBoard.managementRoundIdleDescription'),
      actionLabel: null,
      actionTone: 'primary',
      onAction: null,
    }
  }

  if (activeRound?.status === 'card_opened') {
    return {
      statusTone: 'warning',
      statusLabel: t('gameBoard.flowSteps.start_modifiers.title'),
      title: t('gameBoard.flowSteps.start_modifiers.title'),
      actionLabel: t('gameBoard.roundPanelStartModifierOrdering'),
      actionTone: 'primary',
      onAction: () =>
        onStartModifierOrdering({
          roundId: activeRound.roundId,
          expectedRoundVersion: activeRound.roundVersion,
        }),
    }
  }

  if (activeRound?.status === 'awaiting_modifiers') {
    return {
      statusTone: 'warning',
      statusLabel: t('gameBoard.flowSteps.activate_modifiers.title'),
      title: t('gameBoard.flowSteps.activate_modifiers.title'),
      actionLabel: t('gameBoard.roundPanelStart'),
      actionTone: 'primary',
      onAction: () =>
        onStartRound({
          roundId: activeRound.roundId,
          expectedRoundVersion: activeRound.roundVersion,
        }),
    }
  }

  if (activeRound?.status === 'preparing') {
    return {
      statusTone: 'warning',
      statusLabel: t('gameBoard.flowSteps.start_round.title'),
      title: t('gameBoard.flowSteps.start_round.title'),
      actionLabel: t('gameBoard.roundPanelBeginGameplay'),
      actionTone: 'primary',
      onAction: () =>
        onBeginGameplay({
          roundId: activeRound.roundId,
          expectedRoundVersion: activeRound.roundVersion,
        }),
    }
  }

  if (activeRound?.status === 'in_progress') {
    return {
      statusTone: 'success',
      statusLabel: t('gameBoard.flowSteps.play_round.title'),
      title: t('gameBoard.flowSteps.play_round.title'),
      actionLabel: t('gameBoard.roundPanelReview'),
      actionTone: 'primary',
      onAction: () =>
        onReviewRound({
          roundId: activeRound.roundId,
          expectedRoundVersion: activeRound.roundVersion,
        }),
    }
  }

  if (activeRound?.status === 'reviewing_results') {
    return {
      statusTone: 'success',
      statusLabel: t('gameBoard.flowSteps.review_round.title'),
      title: t('gameBoard.flowSteps.review_round.title'),
      actionLabel: t('gameBoard.roundPanelOpenSummary'),
      actionTone: 'success',
      onAction: onOpenSummary,
    }
  }

  if (hasCurrentActiveTeam) {
    return {
      statusTone: 'info',
      statusLabel: t('gameBoard.flowSteps.select_card.title'),
      title: t('gameBoard.flowSteps.select_card.title'),
      actionLabel: null,
      actionTone: 'primary',
      onAction: null,
    }
  }

  if (resumableTeam) {
    return {
      statusTone: 'warning',
      statusLabel: t('gameBoard.flowSteps.select_team.title'),
      title: t('gameBoard.managementActiveTeamResumeAction'),
      actionLabel: t('gameBoard.managementActiveTeamResumeAction'),
      actionTone: 'primary',
      onAction: () => onResumeTeam(resumableTeam.teamId),
    }
  }

  return {
    statusTone: 'warning',
    statusLabel: t('gameBoard.flowSteps.select_team.title'),
    title: t('gameBoard.flowSteps.select_team.title'),
    actionLabel: null,
    actionTone: 'primary',
    onAction: null,
  }
}
