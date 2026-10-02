import { Box, Stack, Typography, type SxProps, type Theme } from '@mui/material'
import { useId, type ReactNode } from 'react'
import { mergeSx } from '../../../theme/merge-sx.ts'
import { SectionCard } from '../../primitives/surfaces/SectionCard.tsx'

/** A bounded list with persistent tools and a keyboard-accessible scrolling region. */
export function ListPanel({
  title,
  showHeader = true,
  summary,
  tools,
  headerMinHeight,
  children,
  sx,
  'data-testid': testId,
}: {
  title: string
  showHeader?: boolean
  summary?: ReactNode
  tools?: ReactNode
  headerMinHeight?: string
  children: ReactNode
  sx?: SxProps<Theme>
  'data-testid'?: string
}) {
  const titleId = useId()
  return (
    <SectionCard
      data-testid={testId}
      sx={mergeSx({ display: 'flex', flexDirection: 'column', minWidth: 0, p: 1.5 }, sx)}
    >
      <Stack
        spacing={1.5}
        sx={{ flexShrink: 0, pb: 1.5, minHeight: headerMinHeight, justifyContent: 'center' }}
      >
        {showHeader ? (
          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
            <Typography id={titleId} component="h2" variant="h6" sx={{ overflowWrap: 'anywhere' }}>
              {title}
            </Typography>
            {summary}
          </Stack>
        ) : null}
        {tools}
      </Stack>
      <Box
        role="region"
        aria-labelledby={showHeader ? titleId : undefined}
        aria-label={showHeader ? undefined : title}
        tabIndex={0}
        sx={{
          minHeight: 0,
          overflowY: 'auto',
          overscrollBehaviorY: 'contain',
          scrollbarGutter: 'stable',
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: 2,
          },
        }}
      >
        {children}
      </Box>
    </SectionCard>
  )
}
