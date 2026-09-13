import { cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { renderWithAppProviders } from '../../../test/render-with-app-providers.tsx'
import { AppDialog } from './AppDialog.tsx'

afterEach(cleanup)

describe('AppDialog', () => {
  it.each(['standard', 'accented', 'preview'] as const)(
    'preserves caller styles with appearance=%s',
    (appearance) => {
      renderWithAppProviders(
        <AppDialog
          open
          appearance={appearance}
          title="Confirmation"
          description="Review the change."
          sx={[
            { '& .MuiDialog-paper': { maxWidth: 610 } },
            (theme) => ({ '& .MuiDialog-paper': { padding: theme.spacing(1) } }),
          ]}
        />,
      )
      expect(screen.getByRole('dialog', { name: 'Confirmation' })).toHaveStyle({
        maxWidth: '610px',
        padding: '8px',
      })
      expect(screen.getByRole('dialog')).toHaveAccessibleDescription('Review the change.')
    },
  )
})
