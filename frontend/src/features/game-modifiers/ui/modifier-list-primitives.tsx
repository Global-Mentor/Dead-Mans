import { Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameModifierAvailability } from '../../../shared/api/contracts/index.ts'
import { SectionCard, StatusBadge } from '../../../shared/ui/index.ts'

export function ModifierCountBadge({ count }: { count: number }) {
  const { t } = useTranslation()
  return <StatusBadge density="compact" label={t('gameModifiers.categoryCountLabel', { count })} />
}

export function ModifierIcon({ emoji }: { emoji: string | null | undefined }) {
  return emoji ? (
    <Typography aria-hidden="true" component="span" variant="body1" sx={{ flexShrink: 0 }}>
      {emoji}
    </Typography>
  ) : null
}

export function ModifierCategorySection({
  category,
  children,
}: {
  category: GameModifierAvailability['modifier']['category']
  children: ReactNode
}) {
  return (
    <SectionCard component="section" surface="inset" aria-label={category}>
      {children}
    </SectionCard>
  )
}
