import type { ButtonProps } from '@mui/material'
import { Button } from '@mui/material'
import { mergeSx } from '../../../theme/merge-sx.ts'
import { uiTokens } from '../../../theme/tokens.ts'
import type { AppButtonTone } from './app-button-tone.ts'
import { resolveAppButtonTone } from './app-button-tone.ts'

interface AppButtonProps extends Omit<ButtonProps, 'variant' | 'color'> {
  tone?: AppButtonTone
  brand?: 'twitch'
}

export function AppButton({ tone = 'primary', brand, loading, sx, ...props }: AppButtonProps) {
  const toneProps = resolveAppButtonTone(tone)
  return (
    <Button
      {...toneProps}
      {...props}
      sx={mergeSx(
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
        sx,
      )}
      loading={loading}
      aria-busy={props['aria-busy'] ?? (loading || undefined)}
    />
  )
}
