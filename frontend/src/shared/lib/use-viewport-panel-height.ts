import { useLayoutEffect, useRef } from 'react'

export function useViewportPanelHeight(property: `--${string}`, minimumHeight: number) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const grid = ref.current
    if (!grid) return

    const update = () => {
      const top = grid.getBoundingClientRect().top + window.scrollY
      const height = `${Math.max(minimumHeight, window.innerHeight - top - 24)}px`
      if (grid.style.getPropertyValue(property) !== height) {
        grid.style.setProperty(property, height)
      }
    }

    update()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    if (observer) {
      for (let parent = grid.parentElement; parent; parent = parent.parentElement) {
        observer.observe(parent)
      }
    }
    window.addEventListener('resize', update)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', update)
    }
  })

  return ref
}
