import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/errors/ApiError.ts'
import { uploadQuizScreenshot, validateQuizScreenshot } from './api/quiz-screenshots-api.ts'
import { useScreenshotUpload } from './use-screenshot-upload.ts'

vi.mock(import('./api/quiz-screenshots-api.ts'), async (original) => ({
  ...(await original()),
  uploadQuizScreenshot: vi.fn(),
  validateQuizScreenshot: vi.fn().mockResolvedValue(undefined),
}))
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})
const settings = {
  text: 'Question',
  categoryId: 'category',
  reward: 1,
  priority: 0,
  isEnabled: true,
}
const rejection = new ApiError('Rejected', {
  status: 400,
  details: { code: 'twitch_quiz.question_message_too_long' },
})
async function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  const hook = renderHook(useScreenshotUpload, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  })
  act(() => hook.result.current.add([new File(['image'], 'image.png', { type: 'image/png' })]))
  return hook
}
it('permits correcting a definitively rejected batch with a new identity', async () => {
  vi.mocked(uploadQuizScreenshot)
    .mockRejectedValueOnce(rejection)
    .mockResolvedValueOnce({ questionId: 'created' })
  const { result } = await setup()
  const first = result.current.rows[0]?.id
  await act(() => result.current.upload(settings))
  expect(result.current.locked).toBe(false)
  expect(result.current.rows[0]?.id).not.toBe(first)
  await act(() => result.current.upload({ ...settings, text: 'Corrected' }))
  expect(vi.mocked(uploadQuizScreenshot).mock.calls[1]?.[2].text).toBe('Corrected')
  expect(result.current.rows[0]?.status).toBe('done')
})
it('preserves identity and settings after an ambiguous response, even if a later attempt is rejected', async () => {
  vi.mocked(uploadQuizScreenshot)
    .mockRejectedValueOnce(new Error('Connection lost'))
    .mockRejectedValueOnce(rejection)
  const { result } = await setup()
  const first = result.current.rows[0]?.id
  await act(() => result.current.upload(settings))
  await act(() => result.current.upload({ ...settings, text: 'Changed' }))
  expect(result.current.locked).toBe(true)
  expect(result.current.rows[0]?.id).toBe(first)
  expect(vi.mocked(uploadQuizScreenshot).mock.calls[1]?.[2]).toEqual(settings)
  expect(validateQuizScreenshot).toHaveBeenCalledTimes(1)
})

it('rejects metadata before sending any binary data and lets the user correct it', async () => {
  vi.mocked(validateQuizScreenshot).mockRejectedValueOnce(rejection)
  const { result } = await setup()
  const first = result.current.rows[0]?.id
  await act(() => result.current.upload(settings))
  expect(uploadQuizScreenshot).not.toHaveBeenCalled()
  expect(result.current.locked).toBe(false)
  expect(result.current.rows[0]?.id).toBe(first)
  expect(result.current.rows[0]?.error).toBe(rejection)
  vi.mocked(uploadQuizScreenshot).mockResolvedValueOnce({ questionId: 'created' })
  await act(() => result.current.upload({ ...settings, text: 'Corrected' }))
  expect(validateQuizScreenshot).toHaveBeenLastCalledWith({ ...settings, text: 'Corrected' })
  expect(result.current.rows[0]?.status).toBe('done')
})
