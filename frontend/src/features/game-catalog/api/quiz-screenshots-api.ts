import { createApiClient, unwrapOpenApiData } from '../../../shared/api/client/openApiClient.ts'
import type { paths } from '../../../shared/api/contracts/generated'

const client =
  createApiClient<Pick<paths, '/game/questions/hunt-maps' | '/game/questions/screenshots'>>()
export const huntMapsQueryOptions = {
  queryKey: ['hunt-maps'],
  queryFn: () => unwrapOpenApiData(client.GET('/game/questions/hunt-maps')),
  staleTime: 5 * 60 * 1000,
}

export interface ScreenshotUploadSettings {
  text: string
  locationId: string
  categoryId: string
  reward: number
  priority: number
  isEnabled: boolean
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
          body.append(key, String(value)),
        )
        body.append('file', file)
        return body
      },
    }),
  )
}
