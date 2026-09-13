import { Link as RouterLink } from 'react-router-dom'
import { Button } from '@mui/material'
import type { ButtonProps } from '@mui/material'
import { resolveAppButtonTone } from './app-button-tone.ts'
import type { AppButtonTone } from './app-button-tone.ts'

type AppLinkButtonProps = Omit<
  ButtonProps<typeof RouterLink>,
  'color' | 'component' | 'href' | 'variant'
> & { tone?: AppButtonTone }

export function AppLinkButton({ tone = 'primary', ...props }: AppLinkButtonProps) {
  return <Button component={RouterLink} {...resolveAppButtonTone(tone)} {...props} />
}
