import { ThemeProvider } from '@mui/material'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'
import { appTheme } from '../../../app/theme/appTheme.ts'
import i18n from '../../../i18n.ts'
import { GameBoardMatrix } from './GameBoardMatrix.tsx'

vi.mock('@mui/material', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@mui/material')>()),
  useMediaQuery: () => true,
}))

afterEach(cleanup)
beforeAll(async () => {
  await i18n.changeLanguage('ru')
})

function renderWithAppProviders(ui: ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => <ThemeProvider theme={appTheme}>{children}</ThemeProvider>,
  })
}

const props = {
  colLabels: ['Hunt', 'Weapons', 'Legends'],
  rowLabels: ['100', '200'],
  renderColumnLabel: (label: string) => label,
  renderRowLabel: (label: string) => label,
  renderCell: (row: number, col: number) => <button>{`Card ${row}:${col}`}</button>,
}

it('opens the live category and lets a player switch without losing access to it', () => {
  renderWithAppProviders(<GameBoardMatrix {...props} activeColumnIndex={1} />)
  expect(screen.getByRole('tab', { name: /Weapons/ })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByRole('button', { name: 'Card 0:1' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('tab', { name: 'Legends' }))
  expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Legends')
  expect(screen.queryByRole('button', { name: 'Card 0:1' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Текущий раунд' }))
  expect(screen.getByRole('button', { name: 'Card 0:1' })).toBeInTheDocument()
})

it('does not reset a manually selected category when the live round moves', () => {
  const { rerender } = renderWithAppProviders(<GameBoardMatrix {...props} activeColumnIndex={0} />)
  fireEvent.click(screen.getByRole('tab', { name: 'Legends' }))
  rerender(<GameBoardMatrix {...props} activeColumnIndex={1} />)
  expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Legends')
})

it('falls back to the first category if the selected category is removed', () => {
  const { rerender } = renderWithAppProviders(<GameBoardMatrix {...props} />)
  fireEvent.click(screen.getByRole('tab', { name: 'Legends' }))
  rerender(<GameBoardMatrix {...props} colLabels={['Hunt']} />)
  expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Hunt')
})
