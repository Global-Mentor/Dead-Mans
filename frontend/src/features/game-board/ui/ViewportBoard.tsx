import { Box } from '@mui/material'
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { boardGridMetrics } from '../theme/board-grid-metrics.ts'

interface ViewportBoardProps {
  columns: number
  rows: number
  gap: number
  cardAspectRatio: number
  leadWidth?: number
  mobile?: boolean
  children: ReactNode
}

// Fit both axes where possible; short screens scroll the page instead of shrinking card content.
export function ViewportBoard({
  columns,
  rows,
  gap,
  cardAspectRatio,
  leadWidth = 0,
  mobile = false,
  children,
}: ViewportBoardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState<number | null>(null)

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => {
      const rect = element.getBoundingClientRect()
      if (!rect.width) return
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight
      const bottomPadding =
        Number.parseFloat(getComputedStyle(element.closest('main') ?? element).paddingBottom) || 24
      const availableHeight = Math.max(
        96,
        Math.floor(viewportHeight - rect.top - window.scrollY - bottomPadding - 4),
      )
      const labels = Array.from(
        element.querySelectorAll(mobile ? '[data-board-row-label]' : '[role="columnheader"]'),
      )
      const labelHeight = Math.max(
        0,
        ...labels.map((label) => label.getBoundingClientRect().height),
      )
      const overhead = mobile
        ? rows * (labelHeight + 4) + Math.max(0, rows - 1) * gap
        : labelHeight + rows * gap
      const cardWidth = Math.max(
        mobile
          ? boardGridMetrics.minimumCardWidth.mobile
          : boardGridMetrics.minimumCardWidth.desktop,
        ((availableHeight - overhead) / Math.max(1, rows)) * cardAspectRatio,
      )
      const width = Math.floor(
        Math.min(
          rect.width,
          columns * cardWidth + leadWidth + gap * (columns - (leadWidth ? 0 : 1)),
        ),
      )
      setWidth(width)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    if (element.parentElement) observer.observe(element.parentElement)
    const section = element.closest('section')
    if (section) observer.observe(section)
    window.addEventListener('resize', measure)
    window.visualViewport?.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
      window.visualViewport?.removeEventListener('resize', measure)
    }
  }, [columns, rows, gap, cardAspectRatio, leadWidth, mobile])

  return (
    <Box ref={ref} data-testid="viewport-board" sx={{ width: '100%', minWidth: 0 }}>
      <Box data-board-field sx={{ width: width ?? '100%', maxWidth: '100%', mx: 'auto' }}>
        {children}
      </Box>
    </Box>
  )
}
