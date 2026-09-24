import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { renderWithAppProviders } from '../../../../test/render-with-app-providers.tsx'
import { ContentTabs } from './ContentTabs.tsx'
afterEach(cleanup)
it('provides stable tab-panel relationships and preserves edited inputs across selection', () => {
  renderWithAppProviders(
    <ContentTabs
      label="Results"
      items={[
        { id: 'teams', label: 'Teams', content: <input aria-label="Search" defaultValue="" /> },
        { id: 'quiz', label: 'Quiz', content: <p>Earned points</p> },
      ]}
    />,
  )
  const input = screen.getByRole('textbox')
  fireEvent.change(input, { target: { value: 'Ravens' } })
  const quiz = screen.getByRole('tab', { name: 'Quiz' })
  fireEvent.click(quiz)
  expect(document.getElementById(quiz.getAttribute('aria-controls')!)).toHaveAttribute(
    'role',
    'tabpanel',
  )
  expect(input).not.toBeVisible()
  fireEvent.click(screen.getByRole('tab', { name: 'Teams' }))
  expect(screen.getByRole('textbox')).toBe(input)
  expect(input).toHaveValue('Ravens')
})
