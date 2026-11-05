import {
  createApiClient,
  ensureOpenApiSuccess,
  unwrapOpenApiData,
} from '../../../shared/api/client/openApiClient.ts'
import type { paths } from '../../../shared/api/contracts/generated'

const client =
  createApiClient<
    Pick<
      paths,
      | '/game/questions/hunt-maps'
      | '/game/questions/screenshots'
      | '/game/questions/screenshots/validate'
    >
  >()
export const huntMapsQueryOptions = {
  queryKey: ['hunt-maps'],
  queryFn: () => unwrapOpenApiData(client.GET('/game/questions/hunt-maps')),
  staleTime: 5 * 60 * 1000,
}

type ScreenshotUploadBody =
  paths['/game/questions/screenshots']['post']['requestBody']['content']['multipart/form-data']
export type ScreenshotUploadSettings = Omit<ScreenshotUploadBody, 'requestId' | 'file'>

export function validateQuizScreenshot(settings: ScreenshotUploadSettings) {
  return ensureOpenApiSuccess(
    client.POST('/game/questions/screenshots/validate', { body: settings }),
  )
}

export function uploadQuizScreenshot(
  requestId: string,
  file: File,
  settings: ScreenshotUploadSettings,
) {
  return unwrapOpenApiData(
    client.POST('/game/questions/screenshots', {
      body: { requestId, file: file.name, ...settings },
      bodySerializer: () => {
        const body = new FormData()
        Object.entries({ requestId, ...settings }).forEach(([key, value]) =>
          body.append(key, key === 'options' ? JSON.stringify(value) : String(value)),
        )
        body.append('file', file)
        return body
      },
    }),
  )
}
