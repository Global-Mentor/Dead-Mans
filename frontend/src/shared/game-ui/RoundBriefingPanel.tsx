import { Box } from '@mui/material'
import { alpha } from '@mui/material/styles'
import type { ComponentProps, ReactNode } from 'react'
import { OrnamentDivider as RoundBriefingDivider, SectionCard } from '../ui/index.ts'
import { cornerFrameSx } from '../theme/corner-frame-sx.ts'
import { mergeSx } from '../theme/merge-sx.ts'

export { RoundBriefingDivider }

export function RoundBriefingPanel({
  sx,
  header,
  children,
  contentEmphasis = 'none',
  ...props
}: Omit<ComponentProps<typeof SectionCard>, 'surface' | 'borderStyle'> & {
  header?: ReactNode
  contentEmphasis?: 'none' | 'strong'
}) {
  return (
    <SectionCard
      {...props}
      surface="panel"
      sx={mergeSx(
        (theme) => ({
          minWidth: 0,
          p: header ? 0 : 2,
          ...(header ? { display: 'flex', flexDirection: 'column' } : {}),
          ...cornerFrameSx(theme),
          boxShadow: `inset 0 1px 0 ${alpha(theme.palette.primary.light, 0.12)}, inset 0 -1px 0 ${alpha(theme.palette.common.black, 0.32)}`,
        }),
        sx,
      )}
    >
      {header ? (
        <>
          <Box sx={{ px: 2, py: 1.5, flexShrink: 0 }}>{header}</Box>
          <RoundBriefingDivider sx={{ width: 'calc(100% - 32px)', mx: 2 }} />
          <Box
            sx={(theme) => ({
              px: 2,
              py: 1,
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              ...(contentEmphasis === 'strong'
                ? {
                    backgroundColor: alpha(theme.palette.common.black, 0.3),
                  }
                : {}),
            })}
          >
            {children}
          </Box>
        </>
      ) : (
        children
      )}
    </SectionCard>
  )
}
