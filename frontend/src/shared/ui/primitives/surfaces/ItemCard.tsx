import type { ComponentProps } from 'react'
import { mergeSx } from '../../../theme/merge-sx.ts'
import { itemCardSx } from './item-card-sx.ts'
import { SectionCard } from './SectionCard.tsx'

export function ItemCard({
  emphasis = 'none',
  sx,
  ...props
}: Omit<ComponentProps<typeof SectionCard>, 'surface'> & {
  emphasis?: 'none' | 'available' | 'selected'
}) {
  return <SectionCard {...props} sx={mergeSx((theme) => itemCardSx(theme, emphasis), sx)} />
}
