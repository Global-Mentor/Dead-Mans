import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { renderWithAppProviders } from '../../../../test/render-with-app-providers.tsx'
import { StepDisclosure } from './StepDisclosure.tsx'

afterEach(cleanup)

function steps(current: number) {
  return Array.from({ length: 7 }, (_, index) => ({
    id: `step-${index}`,
    label: `Stage ${index + 1}`,
    state:
      index === current
        ? ('current' as const)
        : index < current
          ? ('complete' as const)
          : ('upcoming' as const),
  }))
}

it('keeps neighbours visible, reveals the complete sequence and collapses back to context', async () => {
  renderWithAppProviders(
    <StepDisclosure items={steps(3)} summary="Stage 4" label="Stages" currentBadge="Current" />,
  )
  const list = screen.getByRole('list', { name: 'Stages' })
  const button = screen.getByRole('button', { name: 'Stage 4' })
  expect(
    within(list)
      .getAllByRole('listitem')
      .map((row) => row.textContent),
  ).toEqual(['✓Stage 3', '4Stage 4', '5Stage 5'])
  expect(button).toHaveAttribute('aria-expanded', 'false')
  fireEvent.click(button)
  expect(button).toHaveAttribute('aria-expanded', 'true')
  expect(within(list).getAllByRole('listitem')).toHaveLength(7)
  expect(list.querySelector('[aria-current="step"]')).toHaveTextContent('Stage 4')
  fireEvent.click(button)
  await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(3))
})

it.each([0, 6])('omits unavailable neighbours at sequence boundary %i', (current) => {
  renderWithAppProviders(
    <StepDisclosure
      items={steps(current)}
      summary={`Stage ${current + 1}`}
      label="Stages"
      currentBadge="Current"
    />,
  )
  expect(screen.getAllByRole('listitem')).toHaveLength(2)
  expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false')
})

it('keeps the full sequence expanded when its authoritative current step changes', () => {
  const view = renderWithAppProviders(
    <StepDisclosure items={steps(3)} summary="Stage 4" label="Stages" currentBadge="Current" />,
  )
  fireEvent.click(screen.getByRole('button'))
  view.rerender(
    <StepDisclosure items={steps(4)} summary="Stage 5" label="Stages" currentBadge="Current" />,
  )
  expect(screen.getByRole('button', { name: 'Stage 5' })).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getAllByRole('listitem')).toHaveLength(7)
  expect(screen.getByRole('list').querySelector('[aria-current="step"]')).toHaveTextContent(
    'Stage 5',
  )
})

it('does not invent a current step when the sequence has none', () => {
  renderWithAppProviders(
    <StepDisclosure items={steps(-1)} summary="Waiting" label="Stages" currentBadge="Current" />,
  )
  expect(screen.queryAllByRole('listitem')).toHaveLength(0)
  fireEvent.click(screen.getByRole('button', { name: 'Waiting' }))
  expect(screen.getAllByRole('listitem')).toHaveLength(7)
  expect(screen.getByRole('list').querySelector('[aria-current="step"]')).toBeNull()
})
