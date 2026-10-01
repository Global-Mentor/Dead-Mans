import { Chip, type ChipProps } from '@mui/material'
import { mergeSx } from '../../../theme/merge-sx.ts'
import { huntPaperTexture, huntWornFrame } from '../../../theme/hunt-materials.ts'
import { uiTokens } from '../../../theme/tokens.ts'

interface StatusBadgeProps extends ChipProps {
  appearance?: 'standard' | 'plain'
  textFlow?: 'wrap' | 'singleLine'
  density?: 'standard' | 'compact' | 'tight'
  emphasis?: 'standard' | 'strong' | 'prominent'
}
/** A status or metadata label. Wrapping keeps translated and user-authored labels readable. */
export function StatusBadge({
  appearance = 'standard',
  textFlow = 'wrap',
  density = 'standard',
  emphasis = 'standard',
  sx,
  ...props
}: StatusBadgeProps) {
  return (
    <Chip
      {...props}
      sx={mergeSx(
        appearance === 'plain'
          ? { border: 0, bgcolor: 'transparent', color: 'text.secondary' }
          : undefined,
        textFlow === 'wrap'
          ? {
              maxWidth: '100%',
              height: 'auto',
              minHeight: 24,
              '& .MuiChip-label': { whiteSpace: 'normal', overflowWrap: 'anywhere', py: 0.5 },
            }
          : undefined,
        density === 'compact'
          ? { '& .MuiChip-label': { px: 1, fontSize: '0.73rem', fontWeight: 600 } }
          : undefined,
        density === 'tight'
          ? {
              minHeight: 18,
              height: 'auto',
              '& .MuiChip-label': {
                px: 0.5,
                py: 0,
                fontSize: '0.73rem',
                lineHeight: 1.25,
                fontWeight: 600,
              },
            }
          : undefined,
        emphasis === 'strong'
          ? {
              minHeight: 32,
              minWidth: 40,
              height: 'auto',
              bgcolor: 'background.paper',
              backgroundImage: huntPaperTexture,
              backgroundSize: uiTokens.texture.actionSize,
              borderColor: 'divider',
              ...huntWornFrame,
              borderImageOutset: 0,
              color: 'text.primary',
              '& .MuiChip-label': {
                px: 1,
                py: 0.375,
                fontSize: '1rem',
                lineHeight: 1.2,
                fontWeight: 800,
                fontVariantNumeric: 'tabular-nums',
              },
            }
          : undefined,
        emphasis === 'prominent'
          ? {
              minHeight: 44,
              height: 'auto',
              borderInlineStartWidth: 3,
              px: 1,
              color: 'text.primary',
              '&::before': {
                content: '""',
                width: 8,
                height: 8,
                flex: '0 0 8px',
                borderRadius: '50%',
                bgcolor:
                  props.color && props.color !== 'default'
                    ? `${props.color}.light`
                    : 'text.secondary',
              },
              '& .MuiChip-label': {
                px: 1,
                py: 0.75,
                fontSize: '1.125rem',
                lineHeight: 1.25,
                fontWeight: 700,
              },
            }
          : undefined,
        sx,
      )}
    />
  )
}
