import { Button } from '@mui/material'
import type { ButtonProps } from '@mui/material'
import { resolveAppButtonTone } from './app-button-tone.ts'
import type { AppButtonTone } from './app-button-tone.ts'

export interface AppButtonProps extends Omit<ButtonProps, 'variant' | 'color'> {
  tone?: AppButtonTone
}

export function AppButton({ tone = 'primary', ...props }: AppButtonProps) {
  const toneProps = resolveAppButtonTone(tone)
  return <Button {...toneProps} {...props} />
}
