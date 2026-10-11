import { Suspense } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { lazyPanelPage } from './lazy-panel-page.ts'

afterEach(cleanup)

it('shares a speculative load with navigation and waits for the page before rendering', async () => {
  const loader = vi.fn(async () => ({ Page: () => <div>Loaded page</div> }))
  const Page = lazyPanelPage(loader, 'Page')
  await Promise.all([Page.preload(), Page.preload()])
  render(
    <Suspense fallback="Loading">
      <Page />
    </Suspense>,
  )
  expect(await screen.findByText('Loaded page')).toBeVisible()
  expect(loader).toHaveBeenCalledOnce()
})

it('retries a failed speculative load when the user navigates', async () => {
  const loader = vi
    .fn()
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue({ Page: () => <div>Recovered page</div> })
  const Page = lazyPanelPage(loader, 'Page')
  await expect(Page.preload()).rejects.toThrow('offline')
  render(
    <Suspense fallback="Loading">
      <Page />
    </Suspense>,
  )
  expect(await screen.findByText('Recovered page')).toBeVisible()
  expect(loader).toHaveBeenCalledTimes(2)
})
