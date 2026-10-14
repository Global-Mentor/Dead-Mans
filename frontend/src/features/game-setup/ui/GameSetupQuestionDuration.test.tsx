import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import i18n from '../../../i18n.ts'
import { renderWithAppProviders } from '../../../test/render-with-app-providers.tsx'
import { GameSetupQuestionDuration } from './GameSetupQuestionDuration.tsx'

beforeAll(async () => {
  await i18n.changeLanguage('en')
})
afterEach(cleanup)

describe('GameSetupQuestionDuration', () => {
  it.each(['', '4', '3601', '5.5', '1e2', '-10'])(
    'keeps invalid duration %s out of the draft',
    (value) => {
      const onChange = vi.fn(),
        onCommit = vi.fn()
      renderWithAppProviders(
        <GameSetupQuestionDuration
          value={60}
          disabled={false}
          onChange={onChange}
          onCommit={onCommit}
        />,
      )
      const field = screen.getByRole('textbox', { name: 'Answer time (seconds)' })
      fireEvent.change(field, { target: { value } })
      fireEvent.blur(field)
      expect(field).toHaveValue(value)
      expect(field).toHaveAttribute('aria-invalid', 'true')
      expect(onChange).not.toHaveBeenCalled()
      expect(onCommit).not.toHaveBeenCalled()
      fireEvent.keyDown(field, { key: 'Escape' })
      expect(field).toHaveValue('60')
    },
  )
  it.each(['5', '3600'])('commits valid boundary %s only on blur', (value) => {
    const onChange = vi.fn(),
      onCommit = vi.fn()
    renderWithAppProviders(
      <GameSetupQuestionDuration
        value={60}
        disabled={false}
        onChange={onChange}
        onCommit={onCommit}
      />,
    )
    const field = screen.getByRole('textbox', { name: 'Answer time (seconds)' })
    fireEvent.change(field, { target: { value } })
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.blur(field)
    expect(onChange).toHaveBeenCalledWith(Number(value))
    expect(onCommit).toHaveBeenCalledOnce()
  })
})
