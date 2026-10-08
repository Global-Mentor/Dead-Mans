import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { renderWithAppProviders } from '../../../../test/render-with-app-providers.tsx'
import { PagePagination } from './PagePagination.tsx'
afterEach(cleanup)
it('offers bounded numbered destinations including the last page of a large result set', () => {
  const onChange = vi.fn()
  renderWithAppProviders(
    <PagePagination
      page={50}
      pageSize={25}
      total={100_000_000}
      previousLabel="Previous"
      nextLabel="Next"
      summary="Users"
      pageLabel={(page) => 'Page ' + page}
      navigationLabel="User pages"
      onChange={onChange}
    />,
  )
  expect(screen.getAllByRole('button').length).toBeLessThanOrEqual(9)
  expect(screen.getByRole('button', { name: 'Page 50', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  )
  fireEvent.click(screen.getByRole('button', { name: 'Page 4000000', exact: true }))
  expect(onChange).toHaveBeenLastCalledWith(4_000_000)
  fireEvent.click(screen.getByRole('button', { name: 'Previous' }))
  expect(onChange).toHaveBeenLastCalledWith(49)
})
it('keeps the previous/next default and disables both for an empty result', () => {
  renderWithAppProviders(
    <PagePagination
      page={1}
      pageSize={25}
      total={0}
      previousLabel="Previous"
      nextLabel="Next"
      summary="No users"
      onChange={vi.fn()}
    />,
  )
  expect(screen.getAllByRole('button')).toHaveLength(2)
  expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
})
