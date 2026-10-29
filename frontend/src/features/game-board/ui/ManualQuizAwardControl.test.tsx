import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'
import i18n from '../../../i18n.ts'
import { renderWithAppProviders } from '../../../test/render-with-app-providers.tsx'
import { ManualQuizAwardControl } from './ManualQuizAwardControl.tsx'

beforeAll(async () => {
  await i18n.changeLanguage('ru')
})

afterEach(cleanup)

function renderDeduction(points: string) {
  const onAward = vi.fn()
  renderWithAppProviders(
    <ManualQuizAwardControl
      isActiveGame
      players={[
        {
          userId: 'user-1',
          login: 'player_one',
          displayName: 'Player One',
          earnedQuizPoints: 20,
          spentQuizPoints: 5,
          availableQuizPoints: 15,
        },
      ]}
      isLoading={false}
      isError={false}
      isAwarding={false}
      onAward={onAward}
    />,
  )
  fireEvent.change(screen.getByRole('combobox', { name: 'Игрок' }), {
    target: { value: 'player' },
  })
  fireEvent.click(screen.getByRole('option', { name: /Player One/i }))
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Операция' }))
  fireEvent.click(screen.getByRole('option', { name: 'Вычесть' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Очки' }), {
    target: { value: points },
  })
  fireEvent.change(screen.getByRole('textbox', { name: 'Причина корректировки' }), {
    target: { value: 'Недействительный бонус' },
  })
  return onAward
}

it('rejects a deduction exceeding the available balance without submitting it', () => {
  const onAward = renderDeduction('16')

  expect(screen.getByText('Доступный баланс: 15 − 16 = -1.')).toBeInTheDocument()
  const submit = screen.getByRole('button', { name: 'Применить корректировку' })
  expect(submit).toBeDisabled()
  fireEvent.click(submit)
  expect(
    screen.queryByRole('dialog', { name: 'Подтвердить корректировку очков?' }),
  ).not.toBeInTheDocument()
  expect(onAward).not.toHaveBeenCalled()
})

it('deducts the exact available balance only after confirmation', async () => {
  const onAward = renderDeduction('15')

  expect(screen.getByText('Доступный баланс: 15 − 15 = 0.')).toBeInTheDocument()
  const submit = screen.getByRole('button', { name: 'Применить корректировку' })
  expect(submit).toBeEnabled()
  fireEvent.click(submit)
  const confirmation = screen.getByRole('dialog', {
    name: 'Подтвердить корректировку очков?',
  })
  expect(onAward).not.toHaveBeenCalled()
  await act(async () => {
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Подтвердить' }))
  })
  expect(onAward).toHaveBeenCalledExactlyOnceWith({
    awardedToUserId: 'user-1',
    operationType: 'deduct',
    points: 15,
    reason: 'Недействительный бонус',
    requestId: expect.any(String),
  })
  await waitFor(() => expect(confirmation).not.toBeInTheDocument())
  expect(screen.getByRole('textbox', { name: 'Очки' })).toHaveValue('')
  expect(screen.getByRole('textbox', { name: 'Причина корректировки' })).toHaveValue('')
  expect(submit).toBeDisabled()
})
