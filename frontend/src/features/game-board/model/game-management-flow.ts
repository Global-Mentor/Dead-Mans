import type { GameBoardSnapshot } from '../../../shared/api/contracts/index.ts'
import type { components } from '../../../shared/api/contracts/generated'

type GameRoundDetails = components['schemas']['GameRoundDetailsDto']

type GameManagementPhase = 'ready' | 'active_idle' | 'round_running' | 'reviewing' | 'finished'

type GameManagementFlowStepId =
  | 'select_team'
  | 'select_card'
  | 'start_modifiers'
  | 'activate_modifiers'
  | 'start_round'
  | 'complete_preparation'
  | 'play_round'
  | 'review_round'
  | 'show_results'

type GameManagementFlowStepState = 'complete' | 'current' | 'ready' | 'upcoming' | 'blocked'
type GameManagementFlowSummaryKey =
  | 'gameBoard.flowSummary.waitingForLaunch'
  | 'gameBoard.flowSummary.finished'
  | 'gameBoard.flowSummary.selectActiveTeam'
  | 'gameBoard.flowSummary.selectCard'
  | 'gameBoard.flowSummary.cardOpened'
  | 'gameBoard.flowSummary.awaitingModifiers'
  | 'gameBoard.flowSummary.roundPreparing'
  | 'gameBoard.flowSummary.preparationCompleted'
  | 'gameBoard.flowSummary.roundInProgress'
  | 'gameBoard.flowSummary.reviewingResults'
  | 'gameBoard.flowSummary.showingResults'
  | 'gameBoard.flowSummary.noCardsLeft'
type GameManagementFlowStepTitleKey =
  | 'gameBoard.flowSteps.select_team.title'
  | 'gameBoard.flowSteps.select_card.title'
  | 'gameBoard.flowSteps.start_modifiers.title'
  | 'gameBoard.flowSteps.activate_modifiers.title'
  | 'gameBoard.flowSteps.start_round.title'
  | 'gameBoard.flowSteps.complete_preparation.title'
  | 'gameBoard.flowSteps.play_round.title'
  | 'gameBoard.flowSteps.review_round.title'
  | 'gameBoard.flowSteps.show_results.title'
type GameManagementFlowStepDescriptionKey =
  | 'gameBoard.flowSteps.select_team.description'
  | 'gameBoard.flowSteps.select_card.description'
  | 'gameBoard.flowSteps.start_modifiers.description'
  | 'gameBoard.flowSteps.activate_modifiers.description'
  | 'gameBoard.flowSteps.start_round.description'
  | 'gameBoard.flowSteps.complete_preparation.description'
  | 'gameBoard.flowSteps.play_round.description'
  | 'gameBoard.flowSteps.review_round.description'
  | 'gameBoard.flowSteps.show_results.description'

interface GameManagementFlowStep {
  id: GameManagementFlowStepId
  state: GameManagementFlowStepState
  titleKey: GameManagementFlowStepTitleKey
  descriptionKey: GameManagementFlowStepDescriptionKey
}

interface GameManagementFlowModel {
  phase: GameManagementPhase
  summaryKey: GameManagementFlowSummaryKey
  currentStepId: GameManagementFlowStepId | null
  nextStepId: GameManagementFlowStepId | null
  steps: GameManagementFlowStep[]
}

const flowStepOrder: readonly GameManagementFlowStepId[] = [
  'select_team',
  'select_card',
  'start_modifiers',
  'activate_modifiers',
  'start_round',
  'complete_preparation',
  'play_round',
  'review_round',
  'show_results',
]

export function buildGameManagementFlow(
  snapshot: GameBoardSnapshot,
  activeRound: GameRoundDetails | null,
): GameManagementFlowModel {
  const currentActiveTeamId = activeRound?.teamId ?? snapshot.activeTeamId ?? null
  const hasActiveTeam = currentActiveTeamId != null
  const hasAvailableCells = snapshot.cells.some((cell) => cell.state === 'closed')
  const isGameActive = snapshot.status === 'active'
  const isGameReady = snapshot.status === 'ready'

  if (!isGameActive) {
    return createFlowModel(
      isGameReady ? 'ready' : 'finished',
      isGameReady ? 'gameBoard.flowSummary.waitingForLaunch' : 'gameBoard.flowSummary.finished',
      isGameReady ? null : null,
      isGameReady ? 'select_team' : null,
      {
        select_team: 'blocked',
        select_card: 'blocked',
        start_modifiers: 'blocked',
        activate_modifiers: 'blocked',
        start_round: 'blocked',
        complete_preparation: 'blocked',
        play_round: 'blocked',
        review_round: 'blocked',
        show_results: 'blocked',
      },
    )
  }

  if (activeRound?.status === 'card_opened') {
    return createFlowModel(
      'round_running',
      'gameBoard.flowSummary.cardOpened',
      'start_modifiers',
      'activate_modifiers',
      {
        select_team: 'complete',
        select_card: 'complete',
        start_modifiers: 'current',
        activate_modifiers: 'upcoming',
        start_round: 'upcoming',
        complete_preparation: 'upcoming',
        play_round: 'upcoming',
        review_round: 'upcoming',
        show_results: 'upcoming',
      },
    )
  }

  if (activeRound?.status === 'awaiting_modifiers') {
    return createFlowModel(
      'round_running',
      'gameBoard.flowSummary.awaitingModifiers',
      'activate_modifiers',
      'start_round',
      {
        select_team: 'complete',
        select_card: 'complete',
        start_modifiers: 'complete',
        activate_modifiers: 'current',
        start_round: 'ready',
        complete_preparation: 'upcoming',
        play_round: 'upcoming',
        review_round: 'upcoming',
        show_results: 'upcoming',
      },
    )
  }

  if (activeRound?.status === 'in_progress') {
    return createFlowModel(
      'round_running',
      'gameBoard.flowSummary.roundInProgress',
      'play_round',
      'review_round',
      {
        select_team: 'complete',
        select_card: 'complete',
        start_modifiers: 'complete',
        activate_modifiers: 'complete',
        start_round: 'complete',
        complete_preparation: 'complete',
        play_round: 'current',
        review_round: 'ready',
        show_results: 'upcoming',
      },
    )
  }

  if (activeRound?.status === 'preparing') {
    return createFlowModel(
      'round_running',
      'gameBoard.flowSummary.roundPreparing',
      'start_round',
      'complete_preparation',
      {
        select_team: 'complete',
        select_card: 'complete',
        start_modifiers: 'complete',
        activate_modifiers: 'complete',
        start_round: 'current',
        complete_preparation: 'ready',
        play_round: 'upcoming',
        review_round: 'upcoming',
        show_results: 'upcoming',
      },
    )
  }

  if (activeRound?.status === 'preparation_completed') {
    return createFlowModel(
      'round_running',
      'gameBoard.flowSummary.preparationCompleted',
      'complete_preparation',
      'play_round',
      {
        select_team: 'complete',
        select_card: 'complete',
        start_modifiers: 'complete',
        activate_modifiers: 'complete',
        start_round: 'complete',
        complete_preparation: 'current',
        play_round: 'ready',
        review_round: 'upcoming',
        show_results: 'upcoming',
      },
    )
  }

  if (activeRound?.status === 'reviewing_results') {
    return createFlowModel(
      'reviewing',
      'gameBoard.flowSummary.reviewingResults',
      'review_round',
      'show_results',
      {
        select_team: 'complete',
        select_card: 'complete',
        start_modifiers: 'complete',
        activate_modifiers: 'complete',
        start_round: 'complete',
        complete_preparation: 'complete',
        play_round: 'complete',
        review_round: 'current',
        show_results: 'upcoming',
      },
    )
  }

  if (activeRound?.status === 'showing_results') {
    return createFlowModel(
      'reviewing',
      'gameBoard.flowSummary.showingResults',
      'show_results',
      null,
      {
        select_team: 'complete',
        select_card: 'complete',
        start_modifiers: 'complete',
        activate_modifiers: 'complete',
        start_round: 'complete',
        complete_preparation: 'complete',
        play_round: 'complete',
        review_round: 'complete',
        show_results: 'current',
      },
    )
  }

  if (!hasActiveTeam) {
    return createFlowModel(
      'active_idle',
      'gameBoard.flowSummary.selectActiveTeam',
      'select_team',
      null,
      {
        select_team: 'current',
        select_card: 'blocked',
        start_modifiers: 'blocked',
        activate_modifiers: 'blocked',
        start_round: 'blocked',
        complete_preparation: 'blocked',
        play_round: 'blocked',
        review_round: 'blocked',
        show_results: 'blocked',
      },
    )
  }

  if (!hasAvailableCells) {
    return createFlowModel(
      'active_idle',
      'gameBoard.flowSummary.noCardsLeft',
      'select_card',
      null,
      {
        select_team: 'complete',
        select_card: 'blocked',
        start_modifiers: 'blocked',
        activate_modifiers: 'blocked',
        start_round: 'blocked',
        complete_preparation: 'blocked',
        play_round: 'blocked',
        review_round: 'blocked',
        show_results: 'blocked',
      },
    )
  }

  return createFlowModel(
    'active_idle',
    'gameBoard.flowSummary.selectCard',
    'select_card',
    'start_modifiers',
    {
      select_team: 'complete',
      select_card: 'current',
      start_modifiers: 'upcoming',
      activate_modifiers: 'upcoming',
      start_round: 'upcoming',
      complete_preparation: 'upcoming',
      play_round: 'upcoming',
      review_round: 'upcoming',
      show_results: 'upcoming',
    },
  )
}

function createFlowModel(
  phase: GameManagementPhase,
  summaryKey: GameManagementFlowSummaryKey,
  currentStepId: GameManagementFlowStepId | null,
  nextStepId: GameManagementFlowStepId | null,
  states: Record<GameManagementFlowStepId, GameManagementFlowStepState>,
): GameManagementFlowModel {
  return {
    phase,
    summaryKey,
    currentStepId,
    nextStepId,
    steps: flowStepOrder.map((id) => createStep(id, states[id])),
  }
}

function createStep(
  id: GameManagementFlowStepId,
  state: GameManagementFlowStepState,
): GameManagementFlowStep {
  const stepKeys = {
    select_team: {
      titleKey: 'gameBoard.flowSteps.select_team.title',
      descriptionKey: 'gameBoard.flowSteps.select_team.description',
    },
    select_card: {
      titleKey: 'gameBoard.flowSteps.select_card.title',
      descriptionKey: 'gameBoard.flowSteps.select_card.description',
    },
    start_modifiers: {
      titleKey: 'gameBoard.flowSteps.start_modifiers.title',
      descriptionKey: 'gameBoard.flowSteps.start_modifiers.description',
    },
    activate_modifiers: {
      titleKey: 'gameBoard.flowSteps.activate_modifiers.title',
      descriptionKey: 'gameBoard.flowSteps.activate_modifiers.description',
    },
    start_round: {
      titleKey: 'gameBoard.flowSteps.start_round.title',
      descriptionKey: 'gameBoard.flowSteps.start_round.description',
    },
    complete_preparation: {
      titleKey: 'gameBoard.flowSteps.complete_preparation.title',
      descriptionKey: 'gameBoard.flowSteps.complete_preparation.description',
    },
    play_round: {
      titleKey: 'gameBoard.flowSteps.play_round.title',
      descriptionKey: 'gameBoard.flowSteps.play_round.description',
    },
    show_results: {
      titleKey: 'gameBoard.flowSteps.show_results.title',
      descriptionKey: 'gameBoard.flowSteps.show_results.description',
    },
    review_round: {
      titleKey: 'gameBoard.flowSteps.review_round.title',
      descriptionKey: 'gameBoard.flowSteps.review_round.description',
    },
  } as const

  return {
    id,
    state,
    ...stepKeys[id],
  }
}
