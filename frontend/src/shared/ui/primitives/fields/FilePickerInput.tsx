import type { ComponentProps } from 'react'

/** Hidden native file picker, opened by a labelled AppButton; accept is supplied by the domain. */
export function FilePickerInput(props: Omit<ComponentProps<'input'>, 'type' | 'hidden'>) {
  return <input {...props} type="file" hidden />
}
