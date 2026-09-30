import { Box } from '@mui/material'
import { alpha } from '@mui/material/styles'
import type { ComponentProps, ReactNode } from 'react'
import { SectionCard, SectionDivider } from '../ui/index.ts'
import { mergeSx } from '../theme/merge-sx.ts'

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
          position: 'relative',
          minWidth: 0,
          p: header ? 0 : 2,
          ...(header ? { display: 'flex', flexDirection: 'column' } : {}),
          borderColor: alpha(theme.palette.primary.light, 0.36),
          boxShadow: `inset 0 1px 0 ${alpha(theme.palette.primary.light, 0.12)}, inset 0 -1px 0 ${alpha(theme.palette.common.black, 0.32)}`,
          '&::before, &::after': {
            content: '""',
            position: 'absolute',
            width: 12,
            height: 12,
            borderColor: alpha(theme.palette.primary.light, 0.65),
            pointerEvents: 'none',
          },
          '&::before': {
            top: 5,
            left: 5,
            borderTopWidth: '1px',
            borderTopStyle: 'solid',
            borderLeftWidth: '1px',
            borderLeftStyle: 'solid',
          },
          '&::after': {
            bottom: 5,
            right: 5,
            borderBottomWidth: '1px',
            borderBottomStyle: 'solid',
            borderRightWidth: '1px',
            borderRightStyle: 'solid',
          },
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

export function RoundBriefingDivider(props: ComponentProps<typeof SectionDivider>) {
  return (
    <SectionDivider
      {...props}
      aria-hidden
      sx={mergeSx(
        (theme) => ({
          position: 'relative',
          width: '100%',
          height: '1px',
          minHeight: '1px',
          overflow: 'visible',
          border: 0,
          m: 0,
          background: `linear-gradient(90deg, ${alpha(theme.palette.primary.light, 0.5)}, ${alpha(theme.palette.primary.light, 0.18)} 35%, ${alpha(theme.palette.primary.light, 0.18)} 65%, ${alpha(theme.palette.primary.light, 0.5)})`,
          '&::after': {
            content: '""',
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 5,
            height: 5,
            transform: 'translate(-50%, -50%) rotate(45deg)',
            backgroundColor: theme.palette.primary.light,
            boxShadow: `0 0 0 3px ${theme.palette.background.paper}`,
            pointerEvents: 'none',
          },
        }),
        props.sx,
      )}
    />
  )
}
