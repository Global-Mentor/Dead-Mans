import { cleanup, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { renderWithAppProviders } from '../../test/render-with-app-providers.tsx'
import { ParticipantNamesList } from './ParticipantNamesList.tsx'

afterEach(cleanup)

describe('ParticipantNamesList', () => {
  it('renders every participant on a separate list row', () => {
    renderWithAppProviders(
      <ParticipantNamesList names={['Player One', 'Player Two']} emptyLabel="No players" />,
    )

    const list = screen.getByRole('list')
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(within(list).getByText('Player One')).toBeInTheDocument()
    expect(within(list).getByText('Player Two')).toBeInTheDocument()
    expect(screen.queryByText('Player One, Player Two')).not.toBeInTheDocument()
  })

  it('renders the empty label without an empty list', () => {
    renderWithAppProviders(<ParticipantNamesList names={[]} emptyLabel="No players" />)

    expect(screen.getByText('No players')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('frames each decorated name with two hidden diamonds and retains dense typography', () => {
    renderWithAppProviders(
      <ParticipantNamesList
        names={['Player One', 'Player Two']}
        emptyLabel="No players"
        decorated
        dense
      />,
    )

    for (const item of screen.getAllByRole('listitem')) {
      expect(item.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2)
      expect(within(item).getByText(/Player/)).toHaveStyle({
        lineHeight: '1.25',
        overflowWrap: 'anywhere',
      })
    }
  })

  it('can arrange participants horizontally', () => {
    renderWithAppProviders(
      <ParticipantNamesList
        names={['Player One', 'Player Two']}
        emptyLabel="No players"
        direction="row"
      />,
    )

    expect(screen.getByRole('list')).toHaveStyle({
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
    })
  })
})
