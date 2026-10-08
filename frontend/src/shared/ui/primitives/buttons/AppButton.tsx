import type { ButtonProps } from '@mui/material'
import { Box, Button } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { mergeSx } from '../../../theme/merge-sx.ts'
import { uiTokens } from '../../../theme/tokens.ts'
import type { AppButtonTone } from './app-button-tone.ts'
import { resolveAppButtonTone } from './app-button-tone.ts'

interface AppButtonProps extends Omit<ButtonProps, 'variant' | 'color'> {
  tone?: AppButtonTone
  brand?: 'twitch'
  labelAlignment?: 'lineBox' | 'capHeight'
  framePlacement?: 'outset' | 'inset'
}

export function AppButton({
  tone = 'primary',
  brand,
  loading,
  sx,
  children,
  labelAlignment = 'lineBox',
  framePlacement = 'outset',
  ...props
}: AppButtonProps) {
  const toneProps = resolveAppButtonTone(tone)
  return (
    <Button
      {...toneProps}
      {...props}
      sx={mergeSx(
        tone === 'subtle'
          ? (theme) => ({
              backgroundColor: theme.palette.action.hover,
              '&:hover': {
                backgroundColor: alpha(
                  theme.palette.text.primary,
                  theme.palette.action.hoverOpacity * 2,
                ),
              },
            })
          : undefined,
        brand === 'twitch'
          ? {
              px: 4,
              py: 1.2,
              backgroundColor: uiTokens.brand.twitch,
              border: 'none',
              backgroundImage: 'none',
              color: 'common.white',
              '&:hover': { backgroundColor: uiTokens.brand.twitchHover, backgroundImage: 'none' },
            }
          : undefined,
        framePlacement === 'inset' ? { borderImageOutset: 0 } : undefined,
        sx,
      )}
      loading={loading}
      aria-busy={props['aria-busy'] ?? (loading || undefined)}
    >
      {labelAlignment === 'capHeight' ? (
        <Box component="span" sx={{ textBoxTrim: 'trim-both', textBoxEdge: 'cap alphabetic' }}>
          {children}
        </Box>
      ) : (
        children
      )}
    </Button>
  )
}
