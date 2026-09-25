import { cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { renderWithAppProviders } from '../../../../test/render-with-app-providers.tsx'
import { AppDialog } from './AppDialog.tsx'

afterEach(cleanup)

describe('AppDialog', () => {
  it('preserves layout styles and the accessible description', () => {
    renderWithAppProviders(
      <AppDialog
        open
        title="Confirmation"
        description="Review the change."
        sx={[{ top: 12 }, (theme) => ({ marginTop: theme.spacing(1) })]}
      />,
    )

    expect(
      screen.getByRole('dialog', { name: 'Confirmation' }).closest('.MuiDialog-root'),
    ).toHaveStyle({
      top: '12px',
      marginTop: '8px',
    })
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription('Review the change.')
  })

  it('honors wide and full-screen layouts within the same appearance', () => {
    const { rerender } = renderWithAppProviders(<AppDialog open maxWidth="md" title="Editor" />)
    expect(screen.getByRole('dialog', { name: 'Editor' })).toHaveStyle({ maxWidth: '900px' })

    rerender(<AppDialog open maxWidth="lg" fullScreen title="Card preview" />)
    expect(screen.getByRole('dialog', { name: 'Card preview' })).toHaveStyle({
      maxWidth: 'none',
      margin: '0px',
    })
  })
})
