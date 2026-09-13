import { cleanup, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { renderWithAppProviders } from '../../../test/render-with-app-providers.tsx'
import { AppDialog } from '../feedback/AppDialog.tsx'
import { AppButton } from './AppButton.tsx'
import { AppLinkButton } from './AppLinkButton.tsx'

afterEach(cleanup)

it('keeps a secondary action visually independent from its parent container', () => {
  renderWithAppProviders(
    <>
      <AppButton tone="secondary">Outside</AppButton>
      <AppDialog open title="Dialog" actions={<AppButton tone="secondary">Inside</AppButton>} />
    </>,
  )

  const outside = screen.getByText('Outside').closest('button')
  const inside = screen.getByRole('button', { name: 'Inside' })
  expect(outside).not.toBeNull()
  expect(readVisualStyle(inside)).toEqual(readVisualStyle(outside!))
})

it('renders navigation as a link instead of a button', () => {
  renderWithAppProviders(
    <MemoryRouter>
      <AppLinkButton to="/next">Continue</AppLinkButton>
    </MemoryRouter>,
  )

  expect(screen.getByRole('link', { name: 'Continue' })).toHaveAttribute('href', '/next')
  expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument()
})

function readVisualStyle(element: Element) {
  const style = getComputedStyle(element)

  return {
    backgroundColor: style.backgroundColor,
    backgroundImage: style.backgroundImage,
    borderColor: style.borderColor,
    borderImageSource: style.borderImageSource,
    boxShadow: style.boxShadow,
    color: style.color,
    minHeight: style.minHeight,
  }
}
