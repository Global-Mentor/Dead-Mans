import { useLayoutEffect, useRef } from 'react'

// Measure the actual header/status height, including wrapped connection messages.
export function useQuizViewport() {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const grid = ref.current
    if (!grid) return
    const update = () => {
      const top = grid.getBoundingClientRect().top + window.scrollY
      const height = `${Math.max(320, window.innerHeight - top - 24)}px`
      if (grid.style.getPropertyValue('--quiz-panel-height') !== height) {
        grid.style.setProperty('--quiz-panel-height', height)
      }
    }
    update()
    const observer = new ResizeObserver(update)
    // Ancestor sizes change when the bot panel or navigation wraps.
    for (let parent = grid.parentElement; parent; parent = parent.parentElement) {
      observer.observe(parent)
    }
    window.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
  })

  return ref
}
