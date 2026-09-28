import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import i18n from '../../i18n.ts'
import type { components } from '../api/contracts/generated'
import { renderWithAppProviders } from '../../test/render-with-app-providers.tsx'
import { PlayedCardPreviewDialog } from './PlayedCardPreviewDialog.tsx'

type GameHistoryRound = components['schemas']['GameHistoryRoundItemDto']

beforeAll(async () => {
  await i18n.changeLanguage('ru')
})

afterEach(cleanup)

describe('PlayedCardPreviewDialog', () => {
  it('provides an explicit close action when the card has no media', () => {
    const onClose = vi.fn()
    renderWithAppProviders(
      <PlayedCardPreviewDialog card={null} round={createRound()} onClose={onClose} />,
    )
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText(i18n.t('gameHistory.cardMediaEmpty'))).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.actions.close') }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows stacked modifier impact as one truthful total in the played-card summary', () => {
    renderWithAppProviders(
      <PlayedCardPreviewDialog card={null} round={createRound()} onClose={vi.fn()} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Модификаторы' }))
    expect(screen.getByText('Универсальный бонус ×2')).toBeInTheDocument()
    expect(screen.getByText('+30 очк.')).toBeInTheDocument()
    expect(screen.getByText('Убийства +1')).toBeInTheDocument()
    expect(screen.getByText('Рассчитан ×2')).toBeInTheDocument()
    expect(screen.queryByText('+10 очк.')).not.toBeInTheDocument()
    expect(screen.queryByText('+20 очк.')).not.toBeInTheDocument()
  })

  it('shows positive and negative modifier effects separately without counting the empty-card penalty', () => {
    const round = createRound()
    round.modifiers.push({
      ...createModifier('result-3', 'activation-3', -40, 0),
      modifierId: 'modifier-2',
      modifierName: 'Вычет',
    })
    round.scoreDetails = { ...round.scoreDetails, modifierScoreDelta: -10, finalScore: 290 }
    round.finalScore = 290

    const { rerender } = renderWithAppProviders(
      <PlayedCardPreviewDialog card={null} round={round} onClose={vi.fn()} />,
    )
    const result = within(screen.getByTestId('played-card-result-panel'))
    expect(result.getByText('Бонус').closest('dl')).toHaveTextContent('+130 очк.')
    expect(result.getByText('Списания').closest('dl')).toHaveTextContent('-40 очк.')

    const emptyRound = createRound()
    emptyRound.modifiers = []
    emptyRound.killsCount = 0
    emptyRound.scoreDetails = {
      ...emptyRound.scoreDetails,
      killsScore: 0,
      modifierKillDelta: 0,
      modifierKillScore: 0,
      modifierScoreDelta: 0,
      emptyCardPenaltyApplied: true,
      emptyCardPenaltyScore: -100,
      penaltyTotal: 100,
      bonusDelta: -100,
      totalKillCount: 0,
      finalScore: -100,
    }
    emptyRound.finalScore = -100
    rerender(<PlayedCardPreviewDialog card={null} round={emptyRound} onClose={vi.fn()} />)
    expect(result.getByText('Списания').closest('dl')).toHaveTextContent('0 очк.')
    expect(result.getByText('Итог').closest('dl')).toHaveTextContent('-100 очк.')
  })
})

function createRound(): GameHistoryRound {
  return {
    roundId: 'round-1',
    teamId: 'team-1',
    teamSlotIndex: 1,
    status: 'completed',
    roundVersion: 1,
    startedAtUtc: '2026-08-27T12:00:00Z',
    baseScore: 100,
    finalScore: 330,
    emptyCardPenaltyApplied: false,
    scoreDetails: {
      scoreUnit: 100,
      killsScore: 200,
      bountyScore: 0,
      modifierKillDelta: 1,
      modifierKillScore: 100,
      modifierScoreDelta: 30,
      emptyCardPenaltyApplied: false,
      emptyCardPenaltyScore: 0,
      penaltyTotal: 0,
      bonusDelta: 330,
      totalKillCount: 3,
      finalScore: 330,
      calculationLines: [],
    },
    killsCount: 2,
    bountyCount: 0,
    cellId: 'cell-1',
    cellRowIndex: 0,
    cellColIndex: 0,
    cellType: 'question',
    cellTitle: 'Card',
    cellCost: 100,
    purchasesRefunded: false,
    cellMedia: [],
    participants: [],
    modifiers: [
      createModifier('result-1', 'activation-1', 10, 1),
      createModifier('result-2', 'activation-2', 20, 0),
    ],
  }
}

function createModifier(
  modifierResultId: string,
  activationId: string,
  scoreDelta: number,
  killDelta: number,
): GameHistoryRound['modifiers'][number] {
  return {
    modifierResultId,
    modifierId: 'modifier-1',
    modifierName: 'Универсальный бонус',
    modifierDescription: 'Начисляет очки за выполненные действия.',
    modifierCategory: 'result',
    outcomeStatus: 'calculated',
    scoreDelta,
    killDelta,
    activationId,
    definitionRevision: 2,
  }
}
