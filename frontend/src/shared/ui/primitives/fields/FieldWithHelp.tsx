import { Box, Stack } from '@mui/material'
import type { ReactNode } from 'react'
import { FieldHelp } from '../../feedback/help/FieldHelp.tsx'

export function FieldWithHelp({
  children,
  help,
  label,
  helpAlign = 'start',
}: {
  children: ReactNode
  help: string
  label: string
  helpAlign?: 'start' | 'center'
}) {
  return (
    <Stack
      direction="row"
      spacing={0.5}
      alignItems={helpAlign === 'center' ? 'center' : 'flex-start'}
      sx={{ minWidth: 0, flex: 1 }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>{children}</Box>
      <FieldHelp title={help} label={`${label}. ${help}`} />
    </Stack>
  )
}
