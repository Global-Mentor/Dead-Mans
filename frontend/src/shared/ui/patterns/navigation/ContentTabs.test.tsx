import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { renderWithAppProviders } from '../../../../test/render-with-app-providers.tsx'
import { ContentTabs } from './ContentTabs.tsx'
afterEach(cleanup)
it.each(['flow', 'fill'] as const)(
  'preserves edited inputs and accessible tab panels with %s layout',
  (layout) => {
    renderWithAppProviders(
      <ContentTabs
        label="Results"
        layout={layout}
        appearance={layout === 'fill' ? 'framed' : 'underline'}
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
  },
)

it('supports external selection and keeps invalid selections on the first available tab', () => {
  const changes: string[] = []
  const items = [
    { id: 'teams', label: 'Teams', content: <p>Team results</p> },
    { id: 'quiz', label: 'Quiz', content: <p>Quiz results</p> },
  ]
  const view = renderWithAppProviders(
    <ContentTabs
      label="Results"
      items={items}
      value="quiz"
      onValueChange={(value) => changes.push(value)}
    />,
  )
  expect(screen.getByRole('tabpanel', { name: 'Quiz' })).toBeVisible()
  fireEvent.click(screen.getByRole('tab', { name: 'Teams' }))
  expect(changes).toEqual(['teams'])
  expect(screen.getByRole('tabpanel', { name: 'Quiz' })).toBeVisible()
  view.rerender(<ContentTabs label="Results" items={items} value="teams" />)
  expect(screen.getByRole('tabpanel', { name: 'Teams' })).toBeVisible()
  view.rerender(<ContentTabs label="Results" items={items} value="missing" />)
  expect(screen.getByRole('tabpanel', { name: 'Teams' })).toBeVisible()
})
