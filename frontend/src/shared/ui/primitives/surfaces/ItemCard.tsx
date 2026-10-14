import { cornerFrameSx } from '../../../theme/corner-frame-sx.ts'
import type { ComponentProps } from 'react'
import { mergeSx } from '../../../theme/merge-sx.ts'
import { itemCardSx } from './item-card-sx.ts'
import { SectionCard } from './SectionCard.tsx'

export function ItemCard({
  emphasis = 'none',
  density = 'standard',
  tone = 'default',
  leadingAccent = false,
  frame = 'standard',
  sx,
  ...props
}: Omit<ComponentProps<typeof SectionCard>, 'surface'> & {
  emphasis?: 'none' | 'available' | 'selected'
  density?: 'standard' | 'compact' | 'flush'
  tone?: 'default' | 'alternate'
  leadingAccent?: boolean | 'success' | 'error'
  frame?: 'standard' | 'corner'
}) {
  return (
    <SectionCard
      {...props}
      sx={mergeSx(
        (theme) => itemCardSx(theme, emphasis, tone),
        density === 'flush' ? { p: 0 } : density === 'compact' ? { px: 1.25, py: 0.75 } : null,
        frame === 'corner'
          ? (theme) => ({ ...cornerFrameSx(theme, 'strong'), borderImage: 'none' })
          : null,
        leadingAccent
          ? {
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: '0 auto 0 0',
                width: 3,
                bgcolor: `${typeof leadingAccent === 'string' ? leadingAccent : 'primary'}.main`,
                pointerEvents: 'none',
              },
            }
          : null,
        sx,
      )}
    />
  )
}
