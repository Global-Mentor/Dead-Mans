import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, expect, it } from 'vitest'
import { renderWithAppProviders } from '../../../../test/render-with-app-providers.tsx'
import { AppButton } from '../../primitives/buttons/AppButton.tsx'
import { SidePanel } from './SidePanel.tsx'

afterEach(cleanup)

it('announces a modal dialog and returns focus to its opener after Escape', async () => {
  function Example() {
    const [open, setOpen] = useState(false)
    return (
      <>
        <AppButton onClick={() => setOpen(true)}>Open tools</AppButton>
        <SidePanel
          open={open}
          onClose={() => setOpen(false)}
          title="Tools"
          description="Change settings."
          closeLabel="Close tools"
        >
          <AppButton>Save</AppButton>
        </SidePanel>
      </>
    )
  }
  renderWithAppProviders(<Example />)
  const opener = screen.getByRole('button', { name: 'Open tools' })
  opener.focus()
  fireEvent.click(opener)
  const dialog = screen.getByRole('dialog', { name: 'Tools' })
  expect(dialog).toHaveAttribute('aria-modal', 'true')
  expect(dialog).toHaveAccessibleDescription('Change settings.')
  const close = within(dialog).getByRole('button', { name: 'Close tools' })
  close.focus()
  fireEvent.keyDown(close, { key: 'Escape', code: 'Escape' })
  await waitFor(() =>
    expect(screen.queryByRole('dialog', { name: 'Tools' })).not.toBeInTheDocument(),
  )
  expect(opener).toHaveFocus()
})
