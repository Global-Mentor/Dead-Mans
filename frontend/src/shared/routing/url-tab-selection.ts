import type { SetURLSearchParams } from 'react-router-dom'
import type { ContentTabsSelection } from '../ui/index.ts'

export function urlTabSelection(
  params: URLSearchParams,
  update: SetURLSearchParams,
  defaultValue: string,
): ContentTabsSelection {
  return {
    value: params.get('tab') ?? defaultValue,
    onValueChange: (value) =>
      update((current) => {
        const next = new URLSearchParams(current)
        next.set('tab', value)
        return next
      }),
  }
}
