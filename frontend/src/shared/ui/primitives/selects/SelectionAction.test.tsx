import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithAppProviders } from '../../../../test/render-with-app-providers.tsx'
import { SelectionAction } from './SelectionAction.tsx'

afterEach(cleanup)

describe('SelectionAction', () => {
  it('preserves standard density and pressed-button semantics', () => {
    const onClick = vi.fn()
    renderWithAppProviders(
      <SelectionAction selected onClick={onClick}>
        Answer
      </SelectionAction>,
    )
    const button = screen.getByRole('button', { name: 'Answer' })
    expect(button).toHaveStyle({ minHeight: '52px' })
    expect(button).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('provides compact text and a 44px target without dropping disabled outcomes', () => {
    const onClick = vi.fn()
    renderWithAppProviders(
      <SelectionAction density="compact" selected disabled outcome="success" onClick={onClick}>
        Answer
      </SelectionAction>,
    )
    const button = screen.getByRole('button', { name: 'Answer' })
    expect(button).toHaveStyle({
      minHeight: '44px',
      fontSize: '1rem',
      lineHeight: '1.3',
      opacity: '1',
    })
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('renders an inset choice with an aria-hidden marker and wrapping answer text', () => {
    renderWithAppProviders(
      <SelectionAction
        selected={false}
        appearance="inset"
        density="compact"
        marker="A"
        tone="secondary"
      >
        <span>A longer answer that wraps onto multiple lines</span>
      </SelectionAction>,
    )
    const button = screen.getByRole('button', {
      name: 'A longer answer that wraps onto multiple lines',
    })
    expect(button).toHaveStyle({ backgroundImage: 'none', borderImageSource: 'none' })
    expect(screen.getByText('A')).toHaveAttribute('aria-hidden', 'true')
    expect(button.querySelector('.selection-action-content')).toHaveStyle({
      whiteSpace: 'normal',
      minWidth: '0',
    })
    expect(button).toHaveAttribute('aria-pressed', 'false')
  })

  it('retains inset selection emphasis after submission disables the choice', () => {
    renderWithAppProviders(
      <SelectionAction selected disabled appearance="inset" marker="B">
        Answer
      </SelectionAction>,
    )
    const button = screen.getByRole('button', { name: 'Answer' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(getComputedStyle(button).boxShadow).toContain('inset 3px 0 0')
  })
})
