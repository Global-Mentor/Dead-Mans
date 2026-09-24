import { Box, Collapse, Stack, Typography, useMediaQuery } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useId, useState, type ReactNode } from 'react'
import { huntPalette } from '../../../theme/hunt-palette.ts'
import { SurfaceButton } from '../../primitives/buttons/SurfaceButton.tsx'
import { StatusBadge } from '../../primitives/status/StatusBadge.tsx'

const groupHeaderSx = {
  width: '100%',
  minHeight: 52,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 1.25,
  m: 0,
  px: { xs: 1.25, sm: 1.5 },
  py: 1.1,
  border: 0,
  borderRadius: 0,
  color: 'text.primary',
  position: 'relative',
  overflow: 'hidden',
  textAlign: 'left',
  transition: 'background-color 150ms ease',
} as const

function GroupTitle({ title, accent }: { title: string; accent: string }) {
  return (
    <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
      <Box
        aria-hidden
        component="span"
        sx={{
          width: 8,
          height: 8,
          flexShrink: 0,
          transform: 'rotate(45deg)',
          bgcolor: alpha(accent, 0.58),
          boxShadow: `0 0 10px ${alpha(accent, 0.14)}`,
        }}
      />
      <Typography
        component="span"
        variant="subtitle1"
        sx={{
          minWidth: 0,
          fontSize: 20,
          fontWeight: 700,
          lineHeight: 1.2,
          letterSpacing: '0.025em',
        }}
      >
        {title}
      </Typography>
    </Box>
  )
}

interface DisclosureSectionProps {
  title: string
  'data-testid'?: string
  description?: string
  countLabel?: string
  children: ReactNode
  defaultExpanded?: boolean
  expanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
  panelId?: string
  toggleLabels?: { expand: string; collapse: string }
  toggleLabel?: string
}

export function DisclosureSection({
  title,
  description,
  countLabel,
  children,
  defaultExpanded = false,
  expanded: controlledExpanded,
  onExpandedChange,
  panelId,
  toggleLabels,
  toggleLabel,
  'data-testid': testId,
}: DisclosureSectionProps) {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const generatedId = useId()
  const id = panelId ?? generatedId
  const [localExpanded, setLocalExpanded] = useState(defaultExpanded)
  const expanded = controlledExpanded ?? localExpanded
  const accent = huntPalette.parchmentMuted
  return (
    <Stack
      data-testid={testId}
      component="section"
      aria-label={title}
      spacing={0.75}
      sx={{ '& + &': { pt: 1.25 } }}
    >
      <Box component="h3" sx={{ m: 0 }}>
        <SurfaceButton
          type="button"
          aria-label={
            toggleLabel ??
            (toggleLabels ? (expanded ? toggleLabels.collapse : toggleLabels.expand) : title)
          }
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => {
            setLocalExpanded(!expanded)
            onExpandedChange?.(!expanded)
          }}
          sx={(theme) => ({
            ...groupHeaderSx,
            backgroundColor: alpha(theme.palette.common.black, 0.16),
            backgroundImage: 'none',
            boxShadow: `inset 2px 0 0 ${alpha(accent, expanded ? 0.42 : 0.24)}`,
            '&:hover': { backgroundColor: alpha(accent, 0.035) },
            '&:focus-visible': { outline: `2px solid ${accent}`, outlineOffset: 2 },
            '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
          })}
        >
          <GroupTitle title={title} accent={accent} />
          {countLabel ? (
            <StatusBadge density="compact" variant="outlined" label={countLabel} />
          ) : null}
          <Box
            aria-hidden
            component="span"
            sx={{ width: 30, height: 30, display: 'grid', placeItems: 'center', flexShrink: 0 }}
          >
            <Box
              component="span"
              sx={{
                width: 10,
                height: 10,
                color: alpha(accent, 0.58),
                borderRight: '2px solid',
                borderBottom: '2px solid',
                transition: 'transform 150ms ease',
                transform: expanded
                  ? 'translateY(3px) rotate(225deg)'
                  : 'translateY(-3px) rotate(45deg)',
                '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
              }}
            />
          </Box>
        </SurfaceButton>
      </Box>
      <Collapse id={id} in={expanded} timeout={reducedMotion ? 0 : undefined} unmountOnExit>
        <Stack spacing={0.75}>
          {description ? (
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          ) : null}
          {children}
        </Stack>
      </Collapse>
    </Stack>
  )
}
