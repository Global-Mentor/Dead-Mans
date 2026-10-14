import { Box, Stack, Typography, type SxProps, type Theme } from '@mui/material'
import { useId, type ReactNode } from 'react'
import { mergeSx } from '../../../theme/merge-sx.ts'
import { scrollRegionSx } from '../../../theme/layout-sx.ts'
import { SectionCard } from '../../primitives/surfaces/SectionCard.tsx'

/** A bounded list with persistent tools and a keyboard-accessible scrolling region. */
export function ListPanel({
  title,
  textAlign = 'left',
  showHeader = true,
  summary,
  tools,
  headerMinHeight,
  children,
  sx,
  'data-testid': testId,
}: {
  title: string
  textAlign?: 'left' | 'center'
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
      sx={mergeSx({ display: 'flex', flexDirection: 'column', minWidth: 0, p: 1 }, sx)}
    >
      <Stack
        spacing={1}
        sx={{
          ...scrollRegionSx,
          flexShrink: 0,
          pt: 1,
          pb: 1,
          minHeight: headerMinHeight,
          justifyContent: 'center',
        }}
      >
        {showHeader ? (
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            gap={1}
            sx={
              textAlign === 'center'
                ? {
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: 'minmax(0, 1fr)',
                      sm: 'minmax(0, 1fr) minmax(0, 3fr) minmax(0, 1fr)',
                    },
                  }
                : undefined
            }
          >
            <Typography
              id={titleId}
              component="h2"
              variant="h6"
              sx={{
                overflowWrap: 'anywhere',
                textAlign,
                ...(textAlign === 'center' ? { gridColumn: { xs: 1, sm: 2 } } : {}),
              }}
            >
              {title}
            </Typography>
            {summary ? (
              <Box
                sx={
                  textAlign === 'center'
                    ? { gridColumn: { xs: 1, sm: 3 }, justifySelf: { xs: 'center', sm: 'end' } }
                    : undefined
                }
              >
                {summary}
              </Box>
            ) : null}
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
          ...scrollRegionSx,
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
