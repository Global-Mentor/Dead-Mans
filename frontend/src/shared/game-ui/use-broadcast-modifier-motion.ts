import { useLayoutEffect, useRef, type RefObject } from 'react'

/** Move identified rows between grids without keeping duplicate cards or extra animation timers. */
export function useBroadcastModifierMotion(
  content: RefObject<HTMLDivElement | null>,
  layoutKey: string,
  scale: number | null,
) {
  const previous = useRef<{ scale: number | null; rows: Map<string, DOMRect> } | null>(null)
  const animations = useRef<Animation[]>([])
  useLayoutEffect(() => {
    const reset = () => {
      animations.current.forEach((animation) => animation.cancel())
      animations.current = []
      previous.current = null
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    window.addEventListener('resize', reset)
    reduced.addEventListener('change', reset)
    return () => {
      reset()
      window.removeEventListener('resize', reset)
      reduced.removeEventListener('change', reset)
    }
  }, [])
  useLayoutEffect(() => {
    const elements = Array.from(
      content.current?.querySelectorAll<HTMLElement>('[data-modifier-id]') ?? [],
    )
    animations.current.forEach((animation) => animation.cancel())
    animations.current = []
    const rows = new Map<string, DOMRect>()
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const origin = content.current?.getBoundingClientRect()
    for (const element of elements) {
      const id = element.dataset.modifierId
      if (!id) continue
      const bounds = element.getBoundingClientRect()
      // Local coordinates exclude the scene's own entry translation and fitted scale.
      const rect = new DOMRect(
        (bounds.x - (origin?.x ?? 0)) / (scale || 1),
        (bounds.y - (origin?.y ?? 0)) / (scale || 1),
        bounds.width / (scale || 1),
        bounds.height / (scale || 1),
      )
      rows.set(id, rect)
      const old = previous.current?.rows.get(id)
      if (!old || !scale || previous.current?.scale !== scale || reduced || !element.animate)
        continue
      const x = old.x - rect.x
      const y = old.y - rect.y
      if (
        Math.abs(x) +
          Math.abs(y) +
          Math.abs(old.width - rect.width) +
          Math.abs(old.height - rect.height) <
        1
      )
        continue
      animations.current.push(
        element.animate(
          [
            {
              transform: `translate(${x}px, ${y}px) scale(${old.width / Math.max(1, rect.width)}, ${old.height / Math.max(1, rect.height)})`,
              transformOrigin: 'top left',
              zIndex: 1,
            },
            { transform: 'none', transformOrigin: 'top left', zIndex: 1 },
          ],
          { duration: 480, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
        ),
      )
    }
    previous.current = { scale, rows }
  }, [content, layoutKey, scale])
}
