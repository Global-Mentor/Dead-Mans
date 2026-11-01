import { ThemeProvider } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { appTheme } from '../../../app/theme/appTheme.ts'
import i18n from '../../../i18n.ts'
import { ApiError } from '../../../shared/api/errors/ApiError.ts'
import { GameFinishDialog } from './GameFinishDialog.tsx'

const mocks = vi.hoisted(() => ({
  fetchPreview: vi.fn(),
}))

vi.mock('../api/game-finish-api.ts', () => ({
  fetchGameFinishPreview: mocks.fetchPreview,
}))

const preview = {
  summary: {
    gameId: '00000000-0000-0000-0000-000000000001',
    gameTitle: 'Final game',
    gameStatus: 'active' as const,
    boardVersion: 7,
    finishedAtUtc: null,
    finishedByUserId: null,
    finishedByDisplayName: null,
    publicNote: null,
    calculationVersion: 1,
    completedRoundCount: 1,
    cancelledRoundCount: 0,
    totalKills: 2,
    totalBounties: 0,
    quizTotalPoints: 10,
    pendingQuizQuestionCount: 1,
    skippedQuizQuestionCount: 0,
    teams: [
      {
        teamId: '00000000-0000-0000-0000-000000000002',
        teamName: 'Alpha',
        teamSlotIndex: 1,
        participantNames: ['Player'],
        roundsPlayed: 1,
        bestScore: 100,
        penaltyTotal: 5,
        finalScore: 95,
        totalScore: 95,
        totalBonusDelta: 0,
        totalKills: 2,
        totalBounties: 0,
        placement: 1,
        lastFinishedAtUtc: '2026-09-06T00:00:00Z',
      },
      {
        teamId: '00000000-0000-0000-0000-000000000003',
        teamName: 'Bravo',
        teamSlotIndex: 2,
        participantNames: [],
        roundsPlayed: 0,
        bestScore: null,
        penaltyTotal: 0,
        finalScore: null,
        totalScore: 0,
        totalBonusDelta: 0,
        totalKills: 0,
        totalBounties: 0,
        placement: null,
        lastFinishedAtUtc: null,
      },
    ],
  },
  canFinish: true,
  blockers: [],
  warnings: [{ code: 'game_finish.unplayed_teams', count: 1 }],
}

beforeAll(async () => {
  await i18n.changeLanguage('ru')
})

beforeEach(() => {
  mocks.fetchPreview.mockResolvedValue(preview)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('GameFinishDialog', () => {
  it('requires warning and irreversible confirmations and submits the server version', async () => {
    const onFinish = vi.fn().mockResolvedValue({})
    renderDialog(onFinish)

    expect(await screen.findByText('Bravo')).toBeVisible()
    expect(screen.getByText('Нет завершённых раундов')).toBeVisible()
    const submit = screen.getByRole('button', { name: 'Завершить игру навсегда' })
    expect(submit).toBeDisabled()

    fireEvent.click(screen.getByLabelText(/Не отмечены отыгравшими команд/))
    fireEvent.click(screen.getByLabelText(/Я понимаю, что в этой версии/))
    fireEvent.change(screen.getByLabelText(/Общий публичный комментарий/), {
      target: { value: 'Итоговый комментарий' },
    })
    expect(submit).toBeEnabled()
    fireEvent.click(submit)

    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1))
    expect(onFinish).toHaveBeenCalledWith(
      expect.objectContaining({
        gameId: preview.summary.gameId,
        expectedBoardVersion: 7,
        acknowledgedWarningCodes: ['game_finish.unplayed_teams'],
        note: 'Итоговый комментарий',
      }),
    )
  })

  it('shows blockers and never enables completion', async () => {
    mocks.fetchPreview.mockResolvedValue({
      ...preview,
      canFinish: false,
      blockers: [{ code: 'game_finish.round_in_progress', count: 1 }],
      warnings: [],
    })
    renderDialog(vi.fn())

    expect(await screen.findByText(/Незавершённых раундов: 1/)).toBeVisible()
    fireEvent.click(screen.getByLabelText(/Я понимаю, что в этой версии/))
    expect(screen.getByRole('button', { name: 'Завершить игру навсегда' })).toBeDisabled()
  })

  it('lists every roster blocker and keeps completion disabled', async () => {
    mocks.fetchPreview.mockResolvedValue({
      ...preview,
      canFinish: false,
      warnings: [],
      blockers: [
        { code: 'game_finish.unconfirmed_teams', count: 2 },
        { code: 'game_finish.pending_invitations', count: 3 },
        { code: 'game_finish.pending_disband_requests', count: 1 },
        { code: 'game_finish.invalid_confirmed_team_roster', count: 4 },
      ],
    })
    renderDialog(vi.fn())
    expect(await screen.findByText(/Неподтверждённых команд: 2/)).toBeVisible()
    expect(screen.getByText(/Приглашений без ответа: 3/)).toBeVisible()
    expect(screen.getByText(/Запросов на расформирование: 1/)).toBeVisible()
    expect(screen.getByText(/недопустимым числом игроков: 4/)).toBeVisible()
    fireEvent.click(screen.getByLabelText(/Я понимаю, что в этой версии/))
    expect(screen.getByRole('button', { name: 'Завершить игру навсегда' })).toBeDisabled()
  })

  it.each([
    ['game_finish.round_in_progress', /Завершите текущий раунд/],
    ['game_finish.modifier_state_invalid', /Не закрыты покупки модификаторов/],
    ['game_finish.unconfirmed_teams', /Есть неподтверждённые команды/],
    ['game_finish.pending_invitations', /Есть приглашения в команды без ответа/],
    ['game_finish.pending_disband_requests', /Есть необработанные запросы на расформирование/],
    ['game_finish.invalid_confirmed_team_roster', /Состав подтверждённой команды/],
    ['game_finish.stale_version', /Игра изменилась/],
    ['game_finish.warnings_not_acknowledged', /Предупреждения изменились/],
    ['game_finish.invalid_request', /Некорректный запрос завершения/],
    ['game_lifecycle.game_not_active', /Игра уже не активна/],
    ['game_lifecycle.game_not_found', /Игра удалена/],
  ])('explains %s without exposing backend diagnostics', async (code, message) => {
    renderDialog(
      vi.fn(),
      new ApiError('private SQL diagnostic', {
        status: 409,
        details: { code, error: 'private SQL diagnostic', requestId: 'finish-request-123' },
      }),
    )
    expect(await screen.findByText(message)).toBeVisible()
    expect(screen.getByText('Код обращения: finish-request-123')).toBeVisible()
    expect(screen.queryByText(/private SQL diagnostic/)).not.toBeInTheDocument()
    if (code !== 'game_finish.stale_version')
      expect(screen.queryByText(/Игра изменилась/)).not.toBeInTheDocument()
  })

  it.each([
    [401, /Сеанс входа истёк/],
    [403, /Нет доступа/],
    [404, /Игра удалена/],
    [400, /Некорректный запрос завершения/],
    [429, /Слишком много запросов/],
    [500, /Внутренняя ошибка сервера/],
    [409, /неизвестной причине/],
    [undefined, /Нет ответа от сервера/],
  ])('explains preview failure %s and allows refreshing', async (status, message) => {
    mocks.fetchPreview.mockRejectedValueOnce(new ApiError('internal', { status }))
    renderDialog(vi.fn())
    expect(await screen.findByText(message)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Завершить игру навсегда' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Обновить итог' }))
    expect(await screen.findByText('Bravo')).toBeVisible()
  })
})

function renderDialog(onFinish: ReturnType<typeof vi.fn>, finishError: unknown = null) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={appTheme}>
        <QueryClientProvider client={queryClient}>
          <GameFinishDialog
            open
            gameId={preview.summary.gameId}
            isFinishing={false}
            finishError={finishError}
            onClose={vi.fn()}
            onFinish={onFinish}
          />
        </QueryClientProvider>
      </ThemeProvider>
    </I18nextProvider>,
  )
}
