import { huntPalette } from '../../../theme/hunt-palette.ts'
import { cornerFrameSx } from '../../../theme/corner-frame-sx.ts'
import type { ComponentProps } from 'react'
import { mergeSx } from '../../../theme/merge-sx.ts'
import { itemCardSx } from './item-card-sx.ts'
import { SectionCard } from './SectionCard.tsx'

export function ItemCard({
  emphasis = 'none',
  outcome,
  density = 'standard',
  tone = 'default',
  leadingAccent = false,
  frame = 'standard',
  transparent = false,
  sx,
  ...props
}: Omit<ComponentProps<typeof SectionCard>, 'surface'> & {
  emphasis?: 'none' | 'available' | 'selected'
  outcome?: 'success' | 'error'
  density?: 'standard' | 'compact' | 'flush'
  tone?: 'default' | 'alternate'
  leadingAccent?: boolean | 'success' | 'error'
  frame?: 'standard' | 'corner'
  transparent?: boolean
}) {
  return (
    <SectionCard
      {...props}
      sx={mergeSx(
        (theme) => itemCardSx(theme, emphasis, tone),
        transparent ? { backgroundColor: 'transparent', backgroundImage: 'none' } : null,
        density === 'flush' ? { p: 0 } : density === 'compact' ? { px: 1.25, py: 0.75 } : null,
        frame === 'corner'
          ? (theme) => ({ ...cornerFrameSx(theme, 'strong'), borderImage: 'none' })
          : null,
        outcome
          ? (theme) => {
              const color =
                outcome === 'success' ? huntPalette.fernBright : theme.palette.error.light
              return {
                borderColor: color,
                borderImage: 'none',
                boxShadow: `inset 0 0 0 2px ${color}`,
              }
            }
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
