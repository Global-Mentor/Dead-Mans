import { Box, Stack, Typography } from '@mui/material'
import { useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react'
import { ItemCard, NativeDisclosure, SectionDivider } from '../ui/index.ts'
import { ModifierIconTile } from './ModifierIconTile.tsx'
import { ModifierCatalogHeading } from './ModifierCatalogGroup.tsx'

export function ModifierDetailsList({
  count,
  layout = 'viewport',
  scrollContainerRef,
  children,
}: {
  count: number
  layout?: 'viewport' | 'fit'
  scrollContainerRef?: RefObject<HTMLElement | null>
  children: ReactNode
}) {
  const listRef = useRef<HTMLUListElement>(null)
  useLayoutEffect(() => {
    const list = listRef.current
    const viewport = scrollContainerRef?.current
    if (layout !== 'fit' || !list || !viewport) return
    let disposed = false
    const measure = () => {
      if (disposed) return
      // Measure compact rows at full width, never the expanded descriptions.
      list.style.setProperty('--modifier-columns', 'minmax(0, 1fr)')
      const listBounds = list.getBoundingClientRect()
      const viewportBounds = viewport.getBoundingClientRect()
      const compactHeight = measureCompactList(list)
      let bottomInset = 0
      for (
        let parent = list.parentElement;
        parent && parent !== viewport;
        parent = parent.parentElement
      ) {
        const style = getComputedStyle(parent)
        bottomInset += parseFloat(style.paddingBottom) + parseFloat(style.borderBottomWidth)
      }
      const topInset = listBounds.top - viewportBounds.top + viewport.scrollTop - viewport.clientTop
      const availableHeight = viewport.clientHeight - topInset - bottomInset
      const twoColumns = count > 1 && listBounds.width >= 480 && compactHeight > availableHeight + 1
      list.style.setProperty(
        '--modifier-columns',
        twoColumns ? 'repeat(2, minmax(0, 1fr))' : 'minmax(0, 1fr)',
      )
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    const contentObserver = new MutationObserver(measure)
    contentObserver.observe(list, { childList: true, subtree: true, characterData: true })
    document.fonts?.addEventListener('loadingdone', measure)
    void document.fonts?.ready.then(measure)
    return () => {
      disposed = true
      observer.disconnect()
      contentObserver.disconnect()
      document.fonts?.removeEventListener('loadingdone', measure)
      list.style.removeProperty('--modifier-columns')
    }
  }, [children, count, layout, scrollContainerRef])
  return (
    <Box sx={{ minWidth: 0 }}>
      <Box
        ref={listRef}
        component="ul"
        sx={{
          m: 0,
          p: 0,
          display: 'grid',
          gap: 0.75,
          alignItems: 'start',
          gridTemplateColumns: 'var(--modifier-columns, minmax(0, 1fr))',
          ...(count > 1 && layout === 'viewport'
            ? { '@media (min-width:900px)': { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' } }
            : {}),
        }}
      >
        {children}
      </Box>
    </Box>
  )
}

function measureCompactList(list: Element): number {
  const gap = parseFloat(getComputedStyle(list).rowGap) || 0
  const rows = Array.from(list.children)
  return rows.reduce(
    (height, row) => {
      const style = getComputedStyle(row)
      const nestedList = row.querySelector(':scope > ul')
      const heading = row.querySelector(':scope > [data-modifier-group-heading]')
      const content = row.querySelector('summary') ?? row.firstElementChild
      const contentHeight = nestedList
        ? measureCompactList(nestedList) +
          (heading ? heading.getBoundingClientRect().height + (parseFloat(style.rowGap) || 0) : 0)
        : (content?.getBoundingClientRect().height ?? 0)
      return (
        height +
        contentHeight +
        parseFloat(style.paddingTop) +
        parseFloat(style.paddingBottom) +
        parseFloat(style.borderTopWidth) +
        parseFloat(style.borderBottomWidth)
      )
    },
    gap * Math.max(0, rows.length - 1),
  )
}

export function ModifierDetailsGroup({
  title,
  count,
  children,
}: {
  title?: string
  count?: number
  children: ReactNode
}) {
  return (
    <Box
      component="li"
      sx={{
        gridColumn: '1 / -1',
        minWidth: 0,
        listStyle: 'none',
        display: 'grid',
        gap: 0.75,
        ...(count != null ? { border: '1px solid', borderColor: 'divider' } : {}),
      }}
    >
      {title && count != null ? (
        <ModifierCatalogHeading title={title} count={count} />
      ) : title ? (
        <Stack
          data-modifier-group-heading
          direction="row"
          alignItems="center"
          gap={1}
          sx={{ px: 0.75, py: 0.5 }}
        >
          <Typography component="h3" variant="body2" color="primary.light" fontWeight={700}>
            {title}
          </Typography>
          <SectionDivider sx={{ flex: 1 }} />
        </Stack>
      ) : null}
      <Box
        component="ul"
        aria-label={title}
        sx={{
          m: 0,
          p: 0,
          display: 'grid',
          gap: 0.75,
          alignItems: 'start',
          gridTemplateColumns: 'var(--modifier-columns, minmax(0, 1fr))',
        }}
      >
        {children}
      </Box>
    </Box>
  )
}

export function ModifierDetailsItem({
  title,
  emoji,
  reserveIcon = false,
  catalog = false,
  metadata,
  effect,
  actions,
  children,
  open,
  onExpandedChange,
}: {
  title: string
  emoji?: string | null | undefined
  reserveIcon?: boolean
  catalog?: boolean
  metadata?: ReactNode
  effect?: ReactNode
  actions?: ReactNode
  children?: ReactNode
  open?: boolean
  onExpandedChange?: (open: boolean) => void
}) {
  const summary = (
    <Box
      component="span"
      sx={{ display: 'flex', width: '100%', minWidth: 0, alignItems: 'center', columnGap: 1 }}
    >
      {emoji || reserveIcon ? (
        <ModifierIconTile emoji={emoji} size={catalog ? 'large' : 'standard'} />
      ) : null}
      <Box component="span" sx={{ flex: 1, minWidth: 0, display: 'grid', gap: 0.25 }}>
        <Typography
          component="span"
          role="heading"
          aria-level={4}
          variant="body1"
          fontWeight={700}
          color="text.primary"
          sx={{ lineHeight: catalog ? 1.25 : 1.2 }}
        >
          {title}
        </Typography>
        {metadata}
      </Box>
      {effect}
    </Box>
  )
  return (
    <ItemCard
      component="li"
      sx={{
        py: catalog ? 0.5 : 0.25,
        px: catalog ? 1 : 0.75,
        minWidth: 0,
        listStyle: 'none',
        overflowWrap: 'anywhere',
        containerType: 'inline-size',
      }}
    >
      <Box
        sx={
          actions
            ? {
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr)',
                gap: 0.75,
                '@container (min-width: 480px)': { gridTemplateColumns: 'minmax(0, 1fr) auto' },
              }
            : { minWidth: 0 }
        }
      >
        {children ? (
          <NativeDisclosure
            summary={summary}
            density="compact"
            indicator="chevron"
            {...(open !== undefined ? { open } : {})}
            {...(onExpandedChange ? { onExpandedChange } : {})}
          >
            <Stack spacing={1} sx={{ pt: 0.5, pb: 0.75 }}>
              {children}
            </Stack>
          </NativeDisclosure>
        ) : (
          <Box sx={{ minHeight: 44, display: 'flex', alignItems: 'center' }}>{summary}</Box>
        )}
        {actions ? (
          <Stack
            direction="row"
            useFlexGap
            flexWrap="wrap"
            gap={0.75}
            sx={{ alignSelf: 'start', pb: 0.75 }}
          >
            {actions}
          </Stack>
        ) : null}
      </Box>
    </ItemCard>
  )
}
