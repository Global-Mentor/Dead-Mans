import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import i18n from '../../i18n.ts'
import type { TwitchQuizIntegrationStatus } from '../../shared/api/contracts/index.ts'
import { renderWithAppProviders } from '../../test/render-with-app-providers.tsx'
import { TwitchQuizIntegrationPanel } from './TwitchQuizIntegrationPanel.tsx'

beforeAll(async () => i18n.changeLanguage('en'))
afterEach(cleanup)

const status: TwitchQuizIntegrationStatus = {
  enabled: true,
  botConnected: true,
  broadcasterConnected: true,
  eventSubConnected: false,
  accessRevoked: false,
  botUserId: '100001',
  broadcasterUserId: '200001',
  publication: {
    publicationId: '11111111-1111-1111-1111-111111111111',
    gameId: '22222222-2222-2222-2222-222222222222',
    questionId: '33333333-3333-3333-3333-333333333333',
    askOrder: 1,
    status: 'uncertain',
    questionDeliveryStatus: 'sent',
    optionsDeliveryStatus: 'uncertain',
    outcomeDeliveryStatus: 'pending',
    questionMessage: 'Question',
    optionsMessage: 'Options',
    lastError: 'Delivery is unknown.',
    createdAtUtc: '2026-09-20T18:00:00Z',
    updatedAtUtc: '2026-09-20T18:00:01Z',
  },
}

describe('TwitchQuizIntegrationPanel', () => {
  it('shows independent connection health and explicit recovery controls', () => {
    const onRetry = vi.fn()
    const onCancel = vi.fn()
    renderWithAppProviders(
      <TwitchQuizIntegrationPanel
        status={status}
        canAdmin
        busy={false}
        onRetry={onRetry}
        onCancel={onCancel}
        onSkipOutcome={vi.fn()}
      />,
    )

    expect(screen.getByText(i18n.t('gameQuiz.twitch.botConnected'))).toBeInTheDocument()
    expect(screen.getByText(i18n.t('gameQuiz.twitch.channelConnected'))).toBeInTheDocument()
    expect(screen.getByText(i18n.t('gameQuiz.twitch.eventSubDisconnected'))).toBeInTheDocument()
    expect(screen.getByText(i18n.t('gameQuiz.twitch.uncertainWarning'))).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: i18n.t('gameQuiz.twitch.skipOutcome') }),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: i18n.t('gameQuiz.twitch.retry') }))
    fireEvent.click(screen.getByRole('button', { name: i18n.t('gameQuiz.twitch.cancel') }))
    expect(onRetry).toHaveBeenCalledOnce()
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('offers retry or skip for a failed result, not cancellation of settled answers', () => {
    const onSkip = vi.fn()
    renderWithAppProviders(
      <TwitchQuizIntegrationPanel
        status={{
          ...status,
          publication: {
            ...status.publication!,
            status: 'failed',
            optionsDeliveryStatus: 'sent',
            outcomeDeliveryStatus: 'failed',
          },
        }}
        canAdmin
        busy={false}
        onRetry={vi.fn()}
        onCancel={vi.fn()}
        onSkipOutcome={onSkip}
      />,
    )
    expect(
      screen.queryByRole('button', { name: i18n.t('gameQuiz.twitch.cancel') }),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: i18n.t('gameQuiz.twitch.skipOutcome') }))
    expect(onSkip).toHaveBeenCalledOnce()
  })
})
