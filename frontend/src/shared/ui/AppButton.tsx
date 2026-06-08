import { Button } from '@mui/material'
import type { ButtonProps } from '@mui/material'

export type AppButtonTone = 'primary' | 'secondary' | 'danger' | 'ghost'

interface AppButtonProps extends Omit<ButtonProps, 'variant'> {
  tone?: AppButtonTone
}

function resolveToneProps(tone: AppButtonTone): Pick<ButtonProps, 'variant' | 'color'> {
  switch (tone) {
    case 'secondary':
      return { variant: 'outlined', color: 'primary' }
    case 'danger':
      return { variant: 'contained', color: 'error' }
    case 'ghost':
      return { variant: 'text', color: 'inherit' }
    default:
      return { variant: 'contained', color: 'primary' }
  }
}

export function AppButton({ tone = 'primary', ...props }: AppButtonProps) {
  const toneProps = resolveToneProps(tone)
  return <Button {...toneProps} {...props} />
}

