import { cleanup, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { renderWithAppProviders } from '../../../../test/render-with-app-providers.tsx'
import { SectionCard } from './SectionCard.tsx'

afterEach(cleanup)

it('exposes explicit panel and nested surface roles', () => {
  renderWithAppProviders(
    <>
      <SectionCard data-testid="panel">Panel</SectionCard>
      <SectionCard data-testid="inset" surface="inset" borderStyle="dashed">
        Inset
      </SectionCard>
    </>,
  )

  expect(getComputedStyle(screen.getByTestId('panel')).backgroundImage).not.toBe('none')
  expect(getComputedStyle(screen.getByTestId('inset')).backgroundImage).toBe('none')
  expect(getComputedStyle(screen.getByTestId('inset')).borderStyle).toBe('dashed')
})
