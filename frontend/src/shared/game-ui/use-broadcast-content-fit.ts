import { useLayoutEffect, useRef, useState } from 'react'

/** Fit an entire read-only composition when even its normal reflow exceeds the OBS frame. */
export function useBroadcastContentFit(
  anchor: 'center' | 'top' | 'top-right' = 'center',
  onWidthChange?: (width: number) => void,
) {
  const container = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState<number | null>(null)
  useLayoutEffect(() => {
    const region = container.current
    const element = content.current
    if (!region || !element) return
    let previous: {
      width: number
      height: number
      regionWidth: number
      regionHeight: number
      scale: number
    } | null = null
    let movement: Animation | undefined
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const stopMovement = () => movement?.cancel()
    reducedMotion.addEventListener('change', stopMovement)
    let contentSize: { width: number; height: number } | undefined
    const measure = (entries: ResizeObserverEntry[] = []) => {
      const box = entries.find((entry) => entry.target === element)?.borderBoxSize[0]
      if (box) contentSize = { width: box.inlineSize, height: box.blockSize }
      // offsetHeight rounds fractional pixels and can make a fitted panel exceed its frame.
      const width = Math.ceil(contentSize?.width ?? element.offsetWidth)
      const height = Math.ceil(contentSize?.height ?? element.offsetHeight)
      const nextScale = Math.min(
        1,
        region.clientWidth / Math.max(1, width),
        region.clientHeight / Math.max(1, height),
      )
      if (
        previous &&
        (previous.regionWidth !== region.clientWidth ||
          previous.regionHeight !== region.clientHeight ||
          previous.scale !== nextScale)
      ) {
        movement?.cancel()
      }
      // Animate only content reflow, never viewport resizing or fitting itself.
      if (
        previous &&
        anchor === 'center' &&
        !reducedMotion.matches &&
        element.animate &&
        previous.regionWidth === region.clientWidth &&
        previous.regionHeight === region.clientHeight &&
        previous.scale === nextScale &&
        (previous.width !== width || previous.height !== height)
      ) {
        const x = ((width - previous.width) * nextScale) / 2
        const y = ((height - previous.height) * nextScale) / 2
        movement?.cancel()
        movement = element.animate([{ translate: `${x}px ${y}px` }, { translate: '0px 0px' }], {
          duration: 280,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        })
      }
      previous = {
        width,
        height,
        scale: nextScale,
        regionWidth: region.clientWidth,
        regionHeight: region.clientHeight,
      }
      setScale(nextScale)
      onWidthChange?.(width * nextScale)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(region)
    observer.observe(element)
    measure()
    return () => {
      observer.disconnect()
      movement?.cancel()
      reducedMotion.removeEventListener('change', stopMovement)
    }
  }, [anchor, onWidthChange])
  return { container, content, scale }
}
