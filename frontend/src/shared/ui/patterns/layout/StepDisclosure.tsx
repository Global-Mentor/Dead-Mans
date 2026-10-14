import { Box, Collapse, Typography, useMediaQuery } from '@mui/material'
import { useId, useState } from 'react'
import { SurfaceButton } from '../../primitives/buttons/SurfaceButton.tsx'
import { ItemCard } from '../../primitives/surfaces/ItemCard.tsx'
import { StatusBadge } from '../../primitives/status/StatusBadge.tsx'

interface StepDisclosureItem {
  id: string
  label: string
  state: 'complete' | 'current' | 'ready' | 'upcoming' | 'blocked'
}

interface StepDisclosureProps {
  items: readonly StepDisclosureItem[]
  summary: string
  label: string
  currentBadge: string
  'data-testid'?: string
}

/** Keeps adjacent steps visible and reveals the rest above and below the current step. */
export function StepDisclosure({
  items,
  summary,
  label,
  currentBadge,
  'data-testid': testId,
}: StepDisclosureProps) {
  const [expanded, setExpanded] = useState(false)
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const id = useId()
  const currentIndex = items.findIndex((item) => item.state === 'current')
  const previous = currentIndex > 0 ? items[currentIndex - 1] : undefined
  const next = currentIndex >= 0 ? items[currentIndex + 1] : undefined
  const before = currentIndex > 1 ? items.slice(0, currentIndex - 1) : []
  const after = currentIndex >= 0 ? items.slice(currentIndex + 2) : items

  const row = (item: StepDisclosureItem, index: number) => (
    <Box
      key={item.id}
      role="listitem"
      aria-posinset={index + 1}
      aria-setsize={items.length}
      data-state={item.state}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.25,
        py: 0.5,
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: item.state === 'complete' ? 'action.disabledBackground' : 'transparent',
        color:
          item.state === 'complete' || item.state === 'blocked' ? 'text.disabled' : 'text.primary',
      }}
    >
      <Typography component="span" variant="caption" sx={{ minWidth: 20, textAlign: 'center' }}>
        {item.state === 'complete' ? '✓' : index + 1}
      </Typography>
      <Typography component="span" variant="body2" sx={{ minWidth: 0, flex: 1 }}>
        {item.label}
      </Typography>
    </Box>
  )

  const reveal = (direction: 'before' | 'after', steps: readonly StepDisclosureItem[]) => (
    <Collapse
      id={`${id}-${direction}`}
      in={expanded}
      timeout={reducedMotion ? 0 : 200}
      unmountOnExit
    >
      <Box
        sx={{
          transform: expanded
            ? 'translateY(0)'
            : `translateY(${direction === 'before' ? 8 : -8}px)`,
          transition: reducedMotion ? 'none' : 'transform 200ms ease',
        }}
      >
        {steps.map((item) => row(item, items.indexOf(item)))}
      </Box>
    </Collapse>
  )

  return (
    <ItemCard data-testid={testId} density="flush" role="list" aria-label={label}>
      {reveal('before', before)}
      {previous ? row(previous, currentIndex - 1) : null}
      <ItemCard
        density="flush"
        emphasis="selected"
        role={currentIndex >= 0 ? 'listitem' : undefined}
        aria-current={currentIndex >= 0 ? 'step' : undefined}
        aria-posinset={currentIndex >= 0 ? currentIndex + 1 : undefined}
        aria-setsize={currentIndex >= 0 ? items.length : undefined}
        data-state={currentIndex >= 0 ? 'current' : undefined}
      >
        <SurfaceButton
          aria-label={summary}
          aria-expanded={expanded}
          aria-controls={`${id}-before ${id}-after`}
          onClick={() => setExpanded((value) => !value)}
          sx={{
            width: '100%',
            minHeight: 44,
            px: 1.25,
            py: 0.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          {currentIndex >= 0 ? (
            <Typography
              component="span"
              variant="caption"
              sx={{ minWidth: 20, textAlign: 'center' }}
            >
              {currentIndex + 1}
            </Typography>
          ) : null}
          <Typography
            component="span"
            variant="body1"
            color="text.primary"
            fontWeight={700}
            sx={{ minWidth: 0, flex: 1 }}
          >
            {summary}
          </Typography>
          {expanded && currentIndex >= 0 ? (
            <StatusBadge density="tight" variant="outlined" label={currentBadge} />
          ) : null}
          <Box
            component="svg"
            aria-hidden
            viewBox="0 0 24 24"
            sx={{
              width: 20,
              height: 20,
              flexShrink: 0,
              fill: 'none',
              stroke: 'currentColor',
              strokeWidth: 1.5,
              transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
              transition: reducedMotion ? 'none' : 'transform 200ms ease',
            }}
          >
            <path d="m6 9 6 6 6-6" />
          </Box>
        </SurfaceButton>
      </ItemCard>
      {next ? row(next, currentIndex + 1) : null}
      {reveal('after', after)}
    </ItemCard>
  )
}
