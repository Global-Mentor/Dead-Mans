import { useLayoutEffect, useRef } from 'react'

export function useLeaderboardViewport() {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const grid = ref.current
    if (!grid) return

    const update = () => {
      const top = grid.getBoundingClientRect().top + window.scrollY
      const height = `${Math.max(340, window.innerHeight - top - 24)}px`
      if (grid.style.getPropertyValue('--leaderboard-panel-height') !== height) {
        grid.style.setProperty('--leaderboard-panel-height', height)
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
