import { useLayoutEffect, useRef } from 'react'

/** The server page contains only rows that fit between the toolbar and pagination. */
export function useUserPageSize(
  onChange: (size: number) => void,
  contentVersion: number,
  language: string,
  isError: boolean,
) {
  const regionRef = useRef<HTMLDivElement>(null)
  const geometry = useRef({ width: 0, language: '', tallestRow: 0 })
  useLayoutEffect(() => {
    const region = regionRef.current
    if (!region) return
    let active = true
    const measure = () => {
      if (!active) return
      const rows = Array.from(region.querySelectorAll<HTMLTableRowElement>('tbody tr[aria-label]'))
      const first = rows[0]
      const last = rows.at(-1)
      const frame = region.querySelector<HTMLElement>('[data-user-list]')
      if (!first || !last || !frame || !first.getBoundingClientRect().height) return
      const width = region.getBoundingClientRect().width
      const measured = geometry.current
      if (width !== measured.width || language !== measured.language) measured.tallestRow = 0
      measured.width = width
      measured.language = language
      measured.tallestRow = Math.max(
        measured.tallestRow,
        ...rows.map((row) => row.getBoundingClientRect().height),
      )
      const bodyStyle = getComputedStyle(first.parentElement!)
      const frameStyle = getComputedStyle(frame)
      const pixels = (value: string) => Number.parseFloat(value) || 0
      const gap = pixels(bodyStyle.rowGap)
      const tail =
        pixels(bodyStyle.paddingBottom) +
        pixels(frameStyle.paddingBottom) +
        pixels(frameStyle.borderBottomWidth)
      const available =
        region.getBoundingClientRect().bottom - first.getBoundingClientRect().top - tail
      onChange(
        Math.max(1, Math.min(100, Math.floor((available + gap) / (measured.tallestRow + gap)))),
      )
    }
    let animationFrame = 0
    const scheduleMeasure = () => {
      if (!active) return
      cancelAnimationFrame(animationFrame)
      animationFrame = requestAnimationFrame(measure)
    }
    scheduleMeasure()
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleMeasure)
    observer?.observe(region)
    region
      .querySelectorAll('table, tbody tr[aria-label]')
      .forEach((element) => observer?.observe(element))
    window.addEventListener('resize', scheduleMeasure)
    void document.fonts?.ready.then(scheduleMeasure)
    return () => {
      active = false
      cancelAnimationFrame(animationFrame)
      observer?.disconnect()
      window.removeEventListener('resize', scheduleMeasure)
    }
  }, [onChange, contentVersion, language, isError])
  return regionRef
}
