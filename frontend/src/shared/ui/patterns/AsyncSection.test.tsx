import { cleanup, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { renderWithAppProviders } from '../../../test/render-with-app-providers.tsx'
import { AsyncSection } from './AsyncSection.tsx'
afterEach(cleanup)
it('retains existing content through a background error but hides it on an initial failure', () => {
  const props = {
    isLoading: false,
    isError: false,
    isEmpty: false,
    loadingMessage: 'Loading',
    errorMessage: 'Refresh failed',
    emptyMessage: 'Empty',
  }
  const view = renderWithAppProviders(
    <AsyncSection {...props} hasData>
      <input aria-label="Draft" defaultValue="My edit" />
    </AsyncSection>,
  )
  const input = screen.getByRole('textbox')
  view.rerender(
    <AsyncSection {...props} isError hasData>
      <input aria-label="Draft" defaultValue="My edit" />
    </AsyncSection>,
  )
  expect(screen.getByRole('status')).toHaveTextContent('Refresh failed')
  expect(screen.getByRole('textbox')).toBe(input)
  expect(input).toHaveValue('My edit')
  view.rerender(
    <AsyncSection {...props} isError>
      <input aria-label="Draft" />
    </AsyncSection>,
  )
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
})
