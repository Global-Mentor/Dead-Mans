import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { renderWithAppProviders } from '../../../../test/render-with-app-providers.tsx'
import { ConfirmDialog } from './ConfirmDialog.tsx'

afterEach(cleanup)

it('guards an asynchronous confirmation from duplicate activation', () => {
  const onConfirm = vi.fn(() => new Promise<void>(() => undefined))

  renderWithAppProviders(
    <ConfirmDialog
      open
      title="Confirm"
      description="Review this action."
      confirmLabel="Save"
      cancelLabel="Cancel"
      onClose={() => undefined}
      onConfirm={onConfirm}
    />,
  )

  const confirm = screen.getByRole('button', { name: 'Save' })
  fireEvent.click(confirm)
  fireEvent.click(confirm)

  expect(onConfirm).toHaveBeenCalledTimes(1)
  expect(confirm).toBeDisabled()
  expect(confirm).toHaveAttribute('aria-busy', 'true')
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
})

it('keeps the dialog mounted and restores its actions after a rejected confirmation', async () => {
  const onConfirm = vi.fn().mockRejectedValue(new Error('save failed'))

  renderWithAppProviders(
    <ConfirmDialog
      open
      title="Confirm"
      description="Review this action."
      confirmLabel="Save"
      cancelLabel="Cancel"
      onClose={() => undefined}
      onConfirm={onConfirm}
    />,
  )

  fireEvent.click(screen.getByRole('button', { name: 'Save' }))

  await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled())
  expect(screen.getByRole('dialog', { name: 'Confirm' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Cancel' })).not.toBeDisabled()
})

it('shows a loading indicator while the caller is busy', () => {
  renderWithAppProviders(
    <ConfirmDialog
      open
      isBusy
      title="Open card"
      description="Card value: 250 points"
      confirmLabel="Opening card..."
      cancelLabel="Cancel"
      onClose={() => undefined}
      onConfirm={() => undefined}
    />,
  )

  expect(screen.getByRole('button', { name: 'Opening card...' })).toHaveAttribute(
    'aria-busy',
    'true',
  )
  expect(screen.getByRole('progressbar')).toBeVisible()
  expect(screen.getByText('Card value: 250 points')).toBeVisible()
})
