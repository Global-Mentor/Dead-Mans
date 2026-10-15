import { Box } from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppButton, ItemCard } from '../../shared/ui/index.ts'

const sections = ['start', 'round', 'quiz', 'modifiers', 'score', 'faq'] as const

export function GuideNavigation() {
  const { t } = useTranslation()
  const [active, setActive] = useState<string>('start')
  const linksRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      let current: string = sections[0]
      for (const id of sections) {
        const element = document.getElementById(id)
        if (element && element.getBoundingClientRect().top <= 170) current = id
      }
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2)
        current = 'faq'
      setActive(current)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    const hash = window.location.hash.slice(1)
    if (sections.some((section) => section === hash))
      document.getElementById(hash)?.scrollIntoView()
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    const observer = new ResizeObserver(onScroll)
    observer.observe(document.body)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    const links = linksRef.current
    const current = links?.querySelector('[aria-current="location"]')
    if (!links || !current) return
    const viewport = links.getBoundingClientRect()
    const target = current.getBoundingClientRect()
    if (target.left < viewport.left) links.scrollLeft += target.left - viewport.left
    else if (target.right > viewport.right) links.scrollLeft += target.right - viewport.right
  }, [active])

  return (
    <ItemCard
      component="nav"
      density="compact"
      frame="corner"
      id="guide-navigation"
      aria-label={t('gameGuide.contents')}
      sx={(theme) => ({
        position: 'sticky',
        top: { xs: 58, lg: 66 },
        zIndex: theme.zIndex.appBar - 1,
        scrollMarginTop: 80,
        minWidth: 0,
      })}
    >
      <Box
        ref={linksRef}
        sx={{
          display: 'grid',
          gridAutoFlow: 'column',
          gridAutoColumns: 'minmax(max-content, 1fr)',
          overflowX: 'auto',
          gap: 1,
        }}
      >
        {sections.map((section) => (
          <AppButton
            key={section}
            tone={active === section ? 'primary' : 'secondary'}
            fullWidth
            framePlacement="inset"
            href={`#${section}`}
            aria-current={active === section ? 'location' : undefined}
          >
            {t(`gameGuide.sections.${section}`)}
          </AppButton>
        ))}
      </Box>
    </ItemCard>
  )
}
