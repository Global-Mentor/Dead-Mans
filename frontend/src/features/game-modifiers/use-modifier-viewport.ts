import { useLayoutEffect, useRef } from 'react'

export function useModifierViewport() {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const grid = ref.current
    if (!grid) return

    const update = () => {
      const top = grid.getBoundingClientRect().top + window.scrollY
      const height = `${Math.max(320, window.innerHeight - top - 24)}px`
      if (grid.style.getPropertyValue('--modifier-panel-height') !== height) {
        grid.style.setProperty('--modifier-panel-height', height)
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
