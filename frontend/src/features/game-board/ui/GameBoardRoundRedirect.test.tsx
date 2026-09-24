import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GameBoardRoundRedirect } from './GameBoardRoundRedirect.tsx'

const auth = vi.hoisted(() => ({ roles: ['viewer'] as string[] }))

vi.mock('../../../shared/auth/use-auth.ts', () => ({
  useAuth: () => ({ user: { roles: auth.roles } }),
}))

function Pathname() {
  const location = useLocation()
  return <output data-testid="path">{location.pathname}</output>
}

function renderAtBoard(roundId: string | null) {
  return render(
    <MemoryRouter initialEntries={['/panel/game-board']}>
      <GameBoardRoundRedirect gameId="game-one" roundId={roundId} />
      <Routes>
        <Route path="*" element={<Pathname />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('GameBoardRoundRedirect', () => {
  afterEach(cleanup)
  beforeEach(() => {
    auth.roles = ['viewer']
  })

  it('moves a player to the round when a new card opens while the board is mounted', () => {
    const page = renderAtBoard(null)
    expect(screen.getByTestId('path')).toHaveTextContent('/panel/game-board')
    page.rerender(
      <MemoryRouter initialEntries={['/panel/game-board']}>
        <GameBoardRoundRedirect gameId="game-one" roundId="round-one" />
        <Routes>
          <Route path="*" element={<Pathname />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByTestId('path')).toHaveTextContent('/panel/game-round')
  })

  it('keeps an intentional board visit during an active round', () => {
    renderAtBoard('round-one')
    expect(screen.getByTestId('path')).toHaveTextContent('/panel/game-board')
  })

  it('leaves staff on the board when a new round starts', () => {
    auth.roles = ['viewer', 'moderator']
    const page = renderAtBoard(null)
    page.rerender(
      <MemoryRouter initialEntries={['/panel/game-board']}>
        <GameBoardRoundRedirect gameId="game-one" roundId="round-one" />
        <Routes>
          <Route path="*" element={<Pathname />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByTestId('path')).toHaveTextContent('/panel/game-board')
  })
})
