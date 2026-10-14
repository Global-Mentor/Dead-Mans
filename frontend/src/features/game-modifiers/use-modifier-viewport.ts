import { useLayoutEffect, useRef } from 'react'

export function useModifierViewport() {
  const pageRef = useRef<HTMLDivElement>(null)
  const sectionsGridRef = useRef<HTMLDivElement>(null)
  const toolsRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const page = pageRef.current
    const grid = sectionsGridRef.current
    if (!page || !grid) return

    const update = () => {
      const toolsHeight = `${toolsRef.current?.getBoundingClientRect().height ?? 0}px`
      if (grid.style.getPropertyValue('--modifier-tools-height') !== toolsHeight) {
        grid.style.setProperty('--modifier-tools-height', toolsHeight)
      }
      const pageTop = page.getBoundingClientRect().top + window.scrollY
      const main = page.closest('main')
      const bottomInset = main ? Number.parseFloat(getComputedStyle(main).paddingBottom) : 0
      const pageHeight = `${Math.max(0, window.innerHeight - pageTop - bottomInset)}px`
      if (page.style.getPropertyValue('--modifier-page-height') !== pageHeight) {
        page.style.setProperty('--modifier-page-height', pageHeight)
      }
      const top = grid.getBoundingClientRect().top + window.scrollY + page.scrollTop
      const height = `${Math.max(320, window.innerHeight - top - bottomInset)}px`
      if (grid.style.getPropertyValue('--modifier-panel-height') !== height) {
        grid.style.setProperty('--modifier-panel-height', height)
      }
    }

    update()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    if (observer) {
      if (toolsRef.current) observer.observe(toolsRef.current)
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

  return { pageRef, sectionsGridRef, toolsRef }
}
