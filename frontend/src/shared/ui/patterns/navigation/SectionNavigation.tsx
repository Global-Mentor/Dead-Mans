import { Stack } from '@mui/material'
import type { ReactNode } from 'react'

/** Mobile section shortcuts aligned with the existing site header. */
export function SectionNavigation({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack
      component="nav"
      aria-label={label}
      direction="row"
      spacing={1}
      sx={(theme) => ({
        display: { xs: 'flex', md: 'none' },
        position: 'sticky',
        top: { xs: 148, sm: 76 },
        zIndex: theme.zIndex.appBar - 1,
        mx: { xs: -1, sm: 0 },
        p: 1,
        borderBlock: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.default',
        backgroundImage: theme.custom.gradients.panelAccentSoft,
        boxShadow: `0 8px 18px ${theme.palette.background.default}`,
      })}
    >
      {children}
    </Stack>
  )
}
