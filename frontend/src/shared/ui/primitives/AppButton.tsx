import { Button } from '@mui/material'
import type { ButtonProps } from '@mui/material'
import { resolveAppButtonTone } from './app-button-tone.ts'
import type { AppButtonTone } from './app-button-tone.ts'

interface AppButtonProps extends Omit<ButtonProps, 'variant' | 'color'> {
  tone?: AppButtonTone
}

export function AppButton({ tone = 'primary', loading, ...props }: AppButtonProps) {
  const toneProps = resolveAppButtonTone(tone)
  return (
    <Button
      {...toneProps}
      {...props}
      loading={loading}
      aria-busy={props['aria-busy'] ?? (loading || undefined)}
    />
  )
}
