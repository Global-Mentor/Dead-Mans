import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { renderWithAppProviders } from '../../../../test/render-with-app-providers.tsx'
import { ImageFrame } from './ImageFrame.tsx'

afterEach(cleanup)
const labels = { alt: 'Card', loadingLabel: 'Loading image', errorLabel: 'Image unavailable' }

it('reports failed media and starts loading afresh when the source changes', () => {
  const { rerender } = renderWithAppProviders(<ImageFrame {...labels} src="/first.png" />)
  expect(screen.getByRole('status')).toHaveTextContent('Loading image')
  const oldImage = screen.getByAltText('Card')
  fireEvent.error(oldImage)
  expect(screen.getByRole('alert')).toHaveTextContent('Image unavailable')
  expect(oldImage).not.toBeVisible()
  rerender(<ImageFrame {...labels} src="/second.png" />)
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(screen.getByRole('status')).toBeInTheDocument()
  fireEvent.error(oldImage)
  fireEvent.load(screen.getByAltText('Card'))
  expect(screen.getByRole('img', { name: 'Card' })).toBeVisible()
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})

it('keeps a decorative background silent and hides broken images', () => {
  const { container } = renderWithAppProviders(
    <ImageFrame {...labels} src="/background.png" decorative fit="cover" />,
  )
  const image = container.querySelector('img')!
  fireEvent.error(image)
  expect(image).not.toBeVisible()
  expect(image).toHaveAttribute('alt', '')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})
