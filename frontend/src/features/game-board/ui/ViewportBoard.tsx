import { Box } from '@mui/material'
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

interface ViewportBoardProps {
  columns: number
  rows: number
  gap: number
  leadWidth?: number
  mobile?: boolean
  children: ReactNode
}

// Fit the card widths to both axes, keeping the cards themselves at 2:3.
export function ViewportBoard({
  columns,
  rows,
  gap,
  leadWidth = 0,
  mobile = false,
  children,
}: ViewportBoardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)

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
      const cardWidth = Math.max(44, (((availableHeight - overhead) / Math.max(1, rows)) * 2) / 3)
      const width = Math.floor(
        Math.min(
          rect.width,
          columns * cardWidth + leadWidth + gap * (columns - (leadWidth ? 0 : 1)),
        ),
      )
      setSize((previous) =>
        previous?.width === width && previous.height === availableHeight
          ? previous
          : { width, height: availableHeight },
      )
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
  }, [columns, rows, gap, leadWidth, mobile])

  return (
    <Box
      ref={ref}
      data-testid="viewport-board"
      sx={{ width: '100%', minWidth: 0, maxHeight: size?.height, overflow: 'auto' }}
    >
      <Box sx={{ width: size?.width ?? '100%', maxWidth: '100%', mx: 'auto' }}>{children}</Box>
    </Box>
  )
}
