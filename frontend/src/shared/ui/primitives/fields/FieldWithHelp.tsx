import { Box, Stack } from '@mui/material'
import type { ReactNode } from 'react'
import { FieldHelp } from '../../feedback/help/FieldHelp.tsx'

export function FieldWithHelp({
  children,
  help,
  label,
}: {
  children: ReactNode
  help: string
  label: string
}) {
  return (
    <Stack direction="row" spacing={0.5} alignItems="flex-start" sx={{ minWidth: 0, flex: 1 }}>
      <Box sx={{ minWidth: 0, flex: 1 }}>{children}</Box>
      <FieldHelp title={help} label={`${label}. ${help}`} />
    </Stack>
  )
}
