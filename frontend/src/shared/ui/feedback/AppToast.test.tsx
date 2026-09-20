import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppToast } from './AppToast.tsx'

afterEach(cleanup)

describe('AppToast', () => {
  it.each([null, '', '   '])('does not render an alert for %j', (message) => {
    render(<AppToast message={message} onClose={vi.fn()} />)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders a non-empty message', async () => {
    render(<AppToast message="Saved" severity="success" onClose={vi.fn()} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Saved')
  })
})
