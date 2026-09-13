import type { SxProps, Theme } from '@mui/material/styles'
import type { SystemStyleObject } from '@mui/system'

type SxEntry = SystemStyleObject<Theme> | ((theme: Theme) => SystemStyleObject<Theme>)
type SxList = readonly (SxEntry | boolean)[]
type OptionalSx = SxProps<Theme> | null | undefined | false

function isSxList(value: SxProps<Theme>): value is SxList {
  return Array.isArray(value)
}

/**
 * Compose MUI sx values in source order without leaving nested arrays behind.
 * MUI accepts objects, theme callbacks and arrays; shared components use this
 * helper so callers get the same precedence rules everywhere.
 */
export function mergeSx(...values: readonly OptionalSx[]): SxProps<Theme> {
  const result: (SxEntry | boolean)[] = []

  for (const value of values) {
    if (!value) continue

    if (isSxList(value)) {
      for (const entry of value) {
        if (entry) result.push(entry)
      }
    } else {
      result.push(value)
    }
  }

  return result
}
