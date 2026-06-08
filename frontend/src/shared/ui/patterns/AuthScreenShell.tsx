import { Box } from '@mui/material'
import type { ReactNode } from 'react'
import { huntAuthScreenSx } from '../../theme/surface-sx.ts'

interface AuthScreenShellProps {
  children: ReactNode
}

export function AuthScreenShell({ children }: AuthScreenShellProps) {
  return <Box sx={huntAuthScreenSx}>{children}</Box>
}
