import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { renderWithAppProviders } from '../../../test/render-with-app-providers.tsx'
import { AdminPlayerActionsMenu } from './AdminPlayerActionsMenu.tsx'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('keeps the disabled action hint accessible without a Tooltip warning', async () => {
  const warn = vi.spyOn(console, 'warn')
  const onMove = vi.fn()
  renderWithAppProviders(
    <AdminPlayerActionsMenu name="Hunter" disabled onMove={onMove} onRemove={vi.fn()} />,
  )
  const button = screen.getByRole('button')
  expect(button).toBeDisabled()
  const focusTarget = button.parentElement!
  focusTarget.focus()
  expect(focusTarget).toHaveFocus()
  fireEvent.mouseOver(focusTarget)
  expect(await screen.findByRole('tooltip')).toBeVisible()
  fireEvent.click(button)
  expect(onMove).not.toHaveBeenCalled()
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  expect(warn).not.toHaveBeenCalled()
})
